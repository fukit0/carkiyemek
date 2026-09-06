type Ctx = AudioContext & { readonly state: AudioContextState };

let audioContext: Ctx | null = null;
let hasWarned = false;

function warnOnce(error: unknown): null {
  if (!hasWarned) {
    hasWarned = true;
    console.warn('Ses çalınamadı, sessiz devam ediliyor:', error);
  }
  return null;
}

/** Lazily created on the first user gesture, as browsers require. */
function getContext(): Ctx | null {
  try {
    const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return null;
    audioContext ??= new Ctor() as Ctx;
    if (audioContext.state === 'suspended') void audioContext.resume();
    return audioContext;
  } catch (error) {
    return warnOnce(error);
  }
}

function blip(frequency: number, duration: number, gain: number, type: OscillatorType): void {
  const ctx = getContext();
  if (!ctx) return;
  try {
    const oscillator = ctx.createOscillator();
    const envelope = ctx.createGain();
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, ctx.currentTime);
    envelope.gain.setValueAtTime(gain, ctx.currentTime);
    envelope.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + duration);
    oscillator.connect(envelope).connect(ctx.destination);
    oscillator.start();
    oscillator.stop(ctx.currentTime + duration);
  } catch (error) {
    warnOnce(error);
  }
}

export function playTick(): void {
  blip(880, 0.045, 0.06, 'square');
}

export function playWin(): void {
  const notes = [523.25, 659.25, 783.99, 1046.5];
  notes.forEach((frequency, index) => {
    window.setTimeout(() => blip(frequency, 0.32, 0.12, 'triangle'), index * 110);
  });
}
