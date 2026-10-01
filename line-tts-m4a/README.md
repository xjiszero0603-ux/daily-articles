# PCM → M4A（AAC-LC）轉檔：給 Cloudflare Workers 上的 LINE 語音訊息用

`pcm-to-m4a.js` 是一段**純 JavaScript、零相依**的 AAC-LC 編碼器 + M4A 容器封裝，
整段直接貼進 `worker.js` 即可使用，不需要 wrangler、不需要 WASM、不需要任何建置工具。

## 怎麼接進 worker.js

1. 把 `pcm-to-m4a.js` 的全部內容貼到 `worker.js` 裡（建議放在檔案最上方或最下方，`export default` 之外）。
2. 刪掉舊的 `wrapPcmAsWav()`。
3. 修改 `saveGeneratedAudioToR2()`，只有三個地方要動：

```js
// 之前
const audioBytes = wrapPcmAsWav(pcmBytes, sampleRate);
const key = `tts/${id}.wav`;
await env.XXX_BUCKET.put(key, audioBytes, { httpMetadata: { contentType: 'audio/wav' } });

// 之後
const { bytes: audioBytes, durationMs } = encodePcmToM4a(pcmBytes, sampleRate);
const key = `tts/${id}.m4a`;
await env.XXX_BUCKET.put(key, audioBytes, { httpMetadata: { contentType: 'audio/x-m4a' } });
```

如果只想改一行，也可以用相同參數的 `wrapPcmAsM4a(pcmBytes, sampleRate)`，它會直接回傳 `Uint8Array`。

`buildLineAudioMessage()` 不用改。LINE 的 `duration`（毫秒）可以沿用原本用 PCM 長度算的值，
或改用 `encodePcmToM4a()` 回傳的 `durationMs`，兩者完全相同（`round(樣本數 / 取樣率 × 1000)`）。
M4A 裡寫了 edit list，會把 AAC 固有的 1024 個樣本延遲剪掉，所以播放器顯示的長度也剛好等於原始 PCM。

可調參數：`encodePcmToM4a(pcm, sampleRate, { bitrate: 48000 })`，預設 48 kbps。
支援的取樣率：8000、11025、12000、16000、22050、24000、32000、44100、48000、64000、88200、96000（單聲道 16-bit）。

## 為什麼不用 ffmpeg.wasm 或其他 WASM 套件

| 方案 | 問題 |
| --- | --- |
| ffmpeg.wasm (`@ffmpeg/ffmpeg`) | 核心 WASM 約 30 MB；而且它一定要開 Web Worker（`new Worker`），Cloudflare Workers 沒有這個 API。 |
| `@mediabunny/aac-encoder`（libavcodec 的 AAC 編碼器編成 WASM，約 1 MB） | 同樣依賴 `new Worker`；WASM 是內嵌在 JS 裡、執行時才用 `WebAssembly.instantiate(bytes)` 編譯。Cloudflare Workers **禁止在執行時從位元組編譯 WASM**，WASM 只能用 wrangler 以模組方式上傳，不能用「直接貼上」的方式部署。 |
| 自己寫的純 JS 編碼器（本方案） | 約 26 KB 原始碼，可以直接貼；沒有額外執行環境需求，只用到 `Math`、`TypedArray`、`DataView`、`TextEncoder`。 |

部署大小：Cloudflare 目前的限制是未壓縮 64 MiB（Free / Paid 相同），以前是 Free 3 MB、Paid 10 MB。
不論以哪個標準，26 KB 都完全不是問題。真正的瓶頸是 **CPU 時間**（見下面「已知限制」）。

## 編碼器的設計（簡化版 AAC-LC）

- 固定長窗（ONLY_LONG_SEQUENCE、sine window），MDCT 用 512 點 FFT 實作。
- Huffman codebook 1–11 全部支援，每個頻帶自動選最省位元的 codebook，相鄰相同的 codebook 會合併成 section。
- 碼率控制：每個 frame 用二分搜尋找出符合位元預算的最小 global gain；有 bit reservoir，靜音段省下的位元會留給後面說話的段落。
- 沒有實作的部分：短窗（transient 切換）、TNS、心理聲學模型、M/S（單聲道用不到）。
  對 TTS 人聲影響不大，不過在敲擊聲這類強烈瞬態的地方，會比專業編碼器多一點 pre-echo。
- Huffman / 頻帶表格取自 ISO/IEC 14496-3 規格（對照 FFmpeg `libavcodec/aactab.c` 的轉錄）。

## 驗證結果

| 項目 | 結果 |
| --- | --- |
| ffprobe | `codec_name=aac profile=LC sample_rate=24000 channels=1 duration=58.000000` |
| MP4Box (GPAC) | `MPEG-4 Audio AAC LC … mp4a.40.2`，moov 在 mdat 前面（progressive），edit list 長度 58.000 s |
| mediainfo | `AAC LC, 48.0 kb/s, 1 channel, 24.0 kHz, Duration 58 s 0 ms` |
| ffmpeg `-xerror` 完整解碼 | 無任何錯誤（另含 16k/22.05k/48k、滿幅方波、滿幅白噪音、靜音、10 ms 極短音、奇數 byte 等邊界案例） |
| faad2（另一套獨立解碼器） | 可正常解碼 |
| 解碼後與原始 PCM 的 SNR（48 kbps） | 普通話語音 29.2 dB、英語真人錄音 28.8 dB（同條件下 FFmpeg 內建 AAC 編碼器的波形 SNR 比這個更低） |
| 在 workerd（Cloudflare Workers 實際的執行時）裡跑完整管線 | 文字 → (模擬) Gemini TTS → 轉檔 → R2 → LINE 訊息物件全部成功；從 R2 取回的檔案 `Content-Type: audio/x-m4a`，與 Node 版輸出逐 byte 相同 |

58 秒的語音檔在 48 kbps 下約 **339 KB**，遠低於 LINE 的 10 MB 上限。

自己重跑驗證：

```sh
# 1) 單純驗證編碼器（需要 node 與 ffmpeg/ffprobe）
node test/verify.mjs your-audio.pcm 24000 48000

# 2) 在本機的 Workers 執行時跑完整管線
cd test/pipeline-worker && ./build.sh
node mock-gemini.mjs /path/to/24k.pcm &     # 或刪掉 wrangler.toml 裡的 GEMINI_API_BASE 改用真的 Gemini
npx wrangler dev --port 8787
curl "http://127.0.0.1:8787/test?text=你好"
```

## 已知限制與代價

1. **CPU 時間：Free 方案不夠用，需要 Workers Paid。**
   在 Node 和 workerd 上，58 秒的語音大約需要 **330–420 ms** 的 CPU 時間（約 150 倍即時速度），也就是每 1 秒音訊大約 6–7 ms。
   Workers Free 方案每個請求只有 10 ms CPU，大概只夠編 1–2 秒的音訊。這個限制不分方案：任何真的在 Worker 裡做 AAC 壓縮的作法（包括 WASM）都會撞到。
   Paid 方案預設 30 秒、最多可以調到 5 分鐘，綽綽有餘。
2. 音質大約等同一般的 48 kbps AAC，用在 TTS 人聲上很清楚；但它不是高品質的離線編碼器。想要更好的音質，可以把 `bitrate` 調到 64000（檔案會大約 33%）。
3. 每段訊息前面那 1024 個樣本（24 kHz 下約 43 ms）的 encoder delay，是靠 edit list 剪掉的。少數不認 edit list 的播放器會在開頭多播 43 ms 的靜音，不影響內容。
4. 只支援單聲道 16-bit PCM（Gemini TTS 的輸出格式就是這樣）。
5. **LINE 實機推播尚未驗證**：這個開發環境沒有 LINE Channel Access Token、Gemini API key，也沒有公開的 HTTPS 網址可以讓 LINE 抓檔案。
   `test/pipeline-worker` 已經寫好推播邏輯：在 `.dev.vars` 設定 `LINE_CHANNEL_ACCESS_TOKEN`、`LINE_TO_USER_ID`、`GEMINI_API_KEY`，
   再把 `PUBLIC_AUDIO_BASE_URL` 指向公開的 R2 網址就能實測。
