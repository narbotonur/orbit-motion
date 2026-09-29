let context: AudioContext | null = null;
export async function unlockAudio() {
  try {
    context ??= new AudioContext();
    await context.resume();
  } catch {
    /* sound is optional */
  }
}
export function chime(success = true) {
  if (!context || context.state !== "running") return;
  [0, 0.12, 0.24].forEach((delay, i) => {
    const osc = context!.createOscillator(),
      gain = context!.createGain();
    osc.type = "sine";
    osc.frequency.value = success ? [523, 659, 784][i] : [330, 294, 262][i];
    const at = context!.currentTime + delay;
    gain.gain.setValueAtTime(0, at);
    gain.gain.linearRampToValueAtTime(0.07, at + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, at + 0.27);
    osc.connect(gain);
    gain.connect(context!.destination);
    osc.start(at);
    osc.stop(at + 0.3);
  });
}
