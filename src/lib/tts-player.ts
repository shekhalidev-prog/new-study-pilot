// Streaming PCM (24kHz, 16-bit signed LE, mono) player fed by our /api/speak SSE.
// Exposes an amplitude signal for avatar lip-sync.

export type TTSHandle = {
  stop: () => void;
  done: Promise<void>;
  amplitude: () => number; // 0..1
  isSpeaking: () => boolean;
};

export async function speak(text: string, opts: { speed?: number; voice?: string } = {}): Promise<TTSHandle> {
  const ctx = new AudioContext({ sampleRate: 24000 });
  if (ctx.state === "suspended") await ctx.resume().catch(() => {});
  const analyser = ctx.createAnalyser();
  analyser.fftSize = 512;
  const buf = new Uint8Array(analyser.frequencyBinCount);
  const gain = ctx.createGain();
  gain.gain.value = 1;
  gain.connect(analyser);
  analyser.connect(ctx.destination);

  let playhead = 0;
  let pending = new Uint8Array(0);
  let stopped = false;
  let speaking = true;
  const abort = new AbortController();
  const sources: AudioBufferSourceNode[] = [];

  const playChunk = (incoming: Uint8Array) => {
    if (stopped) return;
    const merged = new Uint8Array(pending.length + incoming.length);
    merged.set(pending);
    merged.set(incoming, pending.length);
    const usable = merged.length - (merged.length % 2);
    pending = merged.slice(usable);
    if (!usable) return;
    const samples = new Int16Array(merged.buffer, 0, usable / 2);
    const floats = Float32Array.from(samples, (s) => s / 32768);
    const buffer = ctx.createBuffer(1, floats.length, 24000);
    buffer.copyToChannel(floats, 0);
    const src = ctx.createBufferSource();
    src.buffer = buffer;
    src.connect(gain);
    if (playhead === 0) playhead = ctx.currentTime + 0.08;
    else playhead = Math.max(playhead, ctx.currentTime);
    src.start(playhead);
    playhead += buffer.duration;
    sources.push(src);
  };

  const done = (async () => {
    try {
      const res = await fetch("/api/speak", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, voice: opts.voice, speed: opts.speed }),
        signal: abort.signal,
      });
      if (!res.ok || !res.body) throw new Error(`TTS ${res.status}`);
      const reader = res.body.pipeThrough(new TextDecoderStream()).getReader();
      let sseBuf = "";
      while (!stopped) {
        const { value, done } = await reader.read();
        if (done) break;
        sseBuf += value;
        const parts = sseBuf.split("\n\n");
        sseBuf = parts.pop() ?? "";
        for (const part of parts) {
          const line = part.split("\n").find((l) => l.startsWith("data:"));
          if (!line) continue;
          const data = line.slice(5).trim();
          if (!data || data === "[DONE]") continue;
          try {
            const evt = JSON.parse(data);
            if (evt.type === "speech.audio.delta" && typeof evt.audio === "string") {
              const bin = atob(evt.audio);
              const bytes = new Uint8Array(bin.length);
              for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
              playChunk(bytes);
            }
          } catch {
            /* ignore parse errors */
          }
        }
      }
      // wait for playhead
      const wait = Math.max(0, playhead - ctx.currentTime) * 1000;
      await new Promise((r) => setTimeout(r, wait + 100));
    } catch {
      /* aborted or network */
    } finally {
      speaking = false;
      try { await ctx.close(); } catch { /* noop */ }
    }
  })();

  return {
    stop: () => {
      stopped = true;
      speaking = false;
      abort.abort();
      sources.forEach((s) => { try { s.stop(); } catch { /* noop */ } });
      try { ctx.close(); } catch { /* noop */ }
    },
    done,
    amplitude: () => {
      if (!speaking) return 0;
      analyser.getByteTimeDomainData(buf);
      let sum = 0;
      for (let i = 0; i < buf.length; i++) {
        const v = (buf[i] - 128) / 128;
        sum += v * v;
      }
      const rms = Math.sqrt(sum / buf.length);
      return Math.min(1, rms * 3);
    },
    isSpeaking: () => speaking,
  };
}
