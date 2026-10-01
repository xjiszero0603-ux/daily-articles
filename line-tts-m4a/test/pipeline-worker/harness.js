
// ===================== 測試用管線（模擬使用者 worker.js 中的既有函式） =====================
async function generateSpeechWithGemini(text, env) {
  const base = env.GEMINI_API_BASE || 'https://generativelanguage.googleapis.com';
  const res = await fetch(`${base}/v1beta/models/gemini-2.5-flash-preview-tts:generateContent?key=${env.GEMINI_API_KEY}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text }] }],
      generationConfig: { responseModalities: ['AUDIO'], speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } } } },
    }),
  });
  const json = await res.json();
  const part = json.candidates[0].content.parts[0].inlineData;
  const rate = Number((/rate=(\d+)/.exec(part.mimeType) || [])[1] || 24000);
  return { base64Pcm: part.data, sampleRate: rate };
}

function base64ToBytes(b64) {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

async function saveGeneratedAudioToR2(base64Pcm, sampleRate, env) {
  const pcmBytes = base64ToBytes(base64Pcm);
  const t0 = Date.now();
  const { bytes, durationMs } = encodePcmToM4a(pcmBytes, sampleRate);
  const encodeWallMs = Date.now() - t0; // 註：Workers 只在 I/O 後推進時鐘，這個值僅供參考
  const key = `tts/${crypto.randomUUID()}.m4a`;
  await env.AUDIO_BUCKET.put(key, bytes, { httpMetadata: { contentType: 'audio/x-m4a' } });
  return { url: `${env.PUBLIC_AUDIO_BASE_URL}/${key}`, key, durationMs, size: bytes.length, encodeWallMs };
}

async function buildLineAudioMessage(text, env) {
  const { base64Pcm, sampleRate } = await generateSpeechWithGemini(text, env);
  const saved = await saveGeneratedAudioToR2(base64Pcm, sampleRate, env);
  return { message: { type: 'audio', originalContentUrl: saved.url, duration: saved.durationMs }, saved };
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === '/test') {
      const { message, saved } = await buildLineAudioMessage(url.searchParams.get('text') || '測試', env);
      let push = null;
      if (env.LINE_CHANNEL_ACCESS_TOKEN && env.LINE_TO_USER_ID) {
        const r = await fetch('https://api.line.me/v2/bot/message/push', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${env.LINE_CHANNEL_ACCESS_TOKEN}` },
          body: JSON.stringify({ to: env.LINE_TO_USER_ID, messages: [message] }),
        });
        push = { status: r.status, body: await r.text() };
      }
      return Response.json({ message, saved, push });
    }
    if (url.pathname.startsWith('/tts/')) {
      const obj = await env.AUDIO_BUCKET.get(url.pathname.slice(1));
      if (!obj) return new Response('not found', { status: 404 });
      return new Response(obj.body, { headers: { 'Content-Type': obj.httpMetadata.contentType, 'Content-Length': String(obj.size) } });
    }
    return new Response('ok');
  },
};
