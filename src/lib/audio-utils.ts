// Browser-side audio helpers for the Mock Viva Simulator.

/** Max upload we allow for a recording (serverless request bodies are capped around 4.5 MB). */
const MAX_UPLOAD_BYTES = 4_000_000;

/**
 * Re-encodes a recording (webm/mp4/ogg) as 16 kHz mono 16-bit WAV. WAV is accepted by every
 * speech-to-text provider in the fallback chain, so a recording works no matter which one
 * ends up serving it. Falls back to the original blob if decoding fails or the result is too big.
 */
export async function blobToWav16k(blob: Blob): Promise<Blob> {
  try {
    const AudioCtx = window.AudioContext;
    const ctx = new AudioCtx();
    let decoded: AudioBuffer;
    try {
      decoded = await ctx.decodeAudioData(await blob.arrayBuffer());
    } finally {
      void ctx.close().catch(() => {});
    }

    const targetRate = 16000;
    const frames = Math.max(1, Math.ceil(decoded.duration * targetRate));
    const offline = new OfflineAudioContext(1, frames, targetRate);
    const src = offline.createBufferSource();
    src.buffer = decoded;
    src.connect(offline.destination); // mono destination down-mixes all channels
    src.start();
    const rendered = await offline.startRendering();
    const samples = rendered.getChannelData(0);

    const view = new DataView(new ArrayBuffer(44 + samples.length * 2));
    const writeStr = (o: number, s: string) => {
      for (let i = 0; i < s.length; i++) view.setUint8(o + i, s.charCodeAt(i));
    };
    writeStr(0, "RIFF");
    view.setUint32(4, 36 + samples.length * 2, true);
    writeStr(8, "WAVE");
    writeStr(12, "fmt ");
    view.setUint32(16, 16, true); // PCM chunk size
    view.setUint16(20, 1, true); // PCM
    view.setUint16(22, 1, true); // mono
    view.setUint32(24, targetRate, true);
    view.setUint32(28, targetRate * 2, true);
    view.setUint16(32, 2, true);
    view.setUint16(34, 16, true);
    writeStr(36, "data");
    view.setUint32(40, samples.length * 2, true);
    for (let i = 0; i < samples.length; i++) {
      const s = Math.max(-1, Math.min(1, samples[i]));
      view.setInt16(44 + i * 2, s < 0 ? s * 0x8000 : s * 0x7fff, true);
    }
    const wav = new Blob([view], { type: "audio/wav" });
    return wav.size <= MAX_UPLOAD_BYTES || wav.size < blob.size ? wav : blob;
  } catch {
    return blob;
  }
}

/** Free, key-less fallback voice for the examiner using the browser's built-in speech synthesis. */
export function browserSpeak(text: string): Promise<void> {
  return new Promise((resolve) => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return resolve();
    try {
      window.speechSynthesis.cancel();
      const utter = new SpeechSynthesisUtterance(text);
      utter.lang = "en-IN";
      utter.rate = 0.98;
      utter.onend = () => resolve();
      utter.onerror = () => resolve();
      window.speechSynthesis.speak(utter);
    } catch {
      resolve();
    }
  });
}
