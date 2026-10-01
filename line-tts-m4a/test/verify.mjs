// 用法：node test/verify.mjs <輸入.pcm (16-bit LE mono)> [取樣率=24000] [位元率=48000]
// 會輸出 test-output.m4a，並用 ffprobe / ffmpeg 驗證格式、時長，計算解碼後的 SNR。
import fs from 'fs';
import { execFileSync } from 'child_process';

const src = fs.readFileSync(new URL('../pcm-to-m4a.js', import.meta.url), 'utf8');
const { encodePcmToM4a } = new Function(`${src}\nreturn { encodePcmToM4a };`)();

const [input, sr = '24000', br = '48000'] = process.argv.slice(2);
if (!input) { console.error('用法：node test/verify.mjs input.pcm [sampleRate] [bitrate]'); process.exit(1); }
const pcm = new Uint8Array(fs.readFileSync(input));
const t0 = performance.now();
const { bytes, durationMs, frames } = encodePcmToM4a(pcm, Number(sr), { bitrate: Number(br) });
const encodeMs = performance.now() - t0;
fs.writeFileSync('test-output.m4a', bytes);

const probe = JSON.parse(execFileSync('ffprobe', ['-v', 'error', '-print_format', 'json', '-show_format', '-show_streams', 'test-output.m4a']).toString());
const st = probe.streams[0];
const decoded = execFileSync('ffmpeg', ['-v', 'error', '-xerror', '-i', 'test-output.m4a', '-f', 's16le', '-ac', '1', '-ar', sr, '-'], { maxBuffer: 1 << 30 });
const a = new Int16Array(pcm.buffer, pcm.byteOffset, pcm.byteLength >> 1);
const d = new Int16Array(decoded.buffer, decoded.byteOffset, decoded.byteLength >> 1);
let sig = 0, err = 0;
for (let i = 0; i < a.length; i++) { sig += a[i] * a[i]; err += (a[i] - (d[i] || 0)) ** 2; }

const expectMs = Math.round((a.length / Number(sr)) * 1000);
const checks = {
  'codec = aac (LC)': st.codec_name === 'aac' && st.profile === 'LC',
  'container = mp4/m4a': probe.format.format_name.includes('m4a'),
  [`sample_rate = ${sr}`]: st.sample_rate === sr,
  'channels = 1': st.channels === 1,
  'durationMs 與 PCM 長度一致': durationMs === expectMs && Math.abs(Number(probe.format.duration) * 1000 - expectMs) <= 1,
  '小於 LINE 上限 10MB': bytes.length < 10 * 1024 * 1024,
};
console.log({ encodeMs: Math.round(encodeMs), size: bytes.length, durationMs, frames, kbps: +((bytes.length * 8) / durationMs).toFixed(1), snrDb: +(10 * Math.log10(sig / err)).toFixed(1) });
for (const [k, ok] of Object.entries(checks)) console.log(ok ? '✔' : '✘', k);
process.exit(Object.values(checks).every(Boolean) ? 0 : 1);
