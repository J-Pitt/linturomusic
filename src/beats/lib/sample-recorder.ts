import { getAudioContext, unlockAudio } from "@/lib/audio-cache";

const MAX_SECONDS = 15;

type ActiveTake = {
  stop: () => AudioBuffer;
};

/** Capture the microphone as a one-shot buffer. Call stop to finish early. */
export async function startSampleRecording(): Promise<ActiveTake> {
  await unlockAudio();
  const stream = await navigator.mediaDevices.getUserMedia({
    audio: { echoCancellation: true, noiseSuppression: true },
  });
  const ctx = getAudioContext();
  const source = ctx.createMediaStreamSource(stream);
  const processor = ctx.createScriptProcessor(4096, 1, 1);
  const silent = ctx.createGain();
  silent.gain.value = 0;
  const chunks: Float32Array[] = [];
  processor.onaudioprocess = (event) => {
    const live = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
    if (live >= ctx.sampleRate * MAX_SECONDS) return;
    chunks.push(new Float32Array(event.inputBuffer.getChannelData(0)));
  };
  source.connect(processor);
  processor.connect(silent);
  silent.connect(ctx.destination);

  return {
    stop() {
      processor.onaudioprocess = null;
      processor.disconnect();
      source.disconnect();
      silent.disconnect();
      for (const track of stream.getTracks()) track.stop();
      const length = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
      const buffer = ctx.createBuffer(1, Math.max(1, length), ctx.sampleRate);
      const channel = buffer.getChannelData(0);
      let offset = 0;
      for (const chunk of chunks) {
        channel.set(chunk, offset);
        offset += chunk.length;
      }
      return trimEdges(buffer);
    },
  };
}

function trimEdges(buffer: AudioBuffer) {
  const data = buffer.getChannelData(0);
  const threshold = 0.02;
  let start = 0;
  let end = data.length;
  while (start < end && Math.abs(data[start] ?? 0) < threshold) start++;
  while (end > start && Math.abs(data[end - 1] ?? 0) < threshold) end--;
  const pad = Math.floor(buffer.sampleRate * 0.02);
  start = Math.max(0, start - pad);
  end = Math.min(data.length, end + pad);
  if (end - start < 16) return buffer;
  const trimmed = getAudioContext().createBuffer(1, end - start, buffer.sampleRate);
  trimmed.getChannelData(0).set(data.subarray(start, end));
  return trimmed;
}
