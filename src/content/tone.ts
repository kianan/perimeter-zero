/** Procedural oscillator-based SFX synth (brief-sound.md) -- no audio files, no MIDI files,
 * just Web Audio oscillators generating short tones on the fly, the same category of
 * technique NES-era games used. Bypasses Phaser's Sound Manager entirely (it's built around
 * loading/playing pre-loaded audio assets, not synthesizing tones), reaching into the raw
 * AudioContext it exposes when running on WebAudioSoundManager (the default under
 * Phaser.AUTO/WebGL -- see main.ts). No-ops if that context isn't available (e.g. a
 * HTML5AudioSoundManager fallback) rather than throwing -- a missing sound effect is a much
 * smaller problem than a crash. */

export interface ToneSpec {
  waveType: OscillatorType;
  freqStartHz: number;
  freqEndHz: number;
  durationMs: number;
  volume: number;
}

function getAudioContext(scene: Phaser.Scene): AudioContext | null {
  const sound = scene.sound as Phaser.Sound.WebAudioSoundManager;
  return sound && sound.context ? sound.context : null;
}

/** Plays one short tone: a linear frequency slide from freqStartHz to freqEndHz over
 * durationMs (equal start/end = a flat tone), with a short envelope so it doesn't click at
 * the start or cut off audibly at the end. */
export function playTone(scene: Phaser.Scene, spec: ToneSpec): void {
  const ctx = getAudioContext(scene);
  if (!ctx) return;

  const durationSec = spec.durationMs / 1000;
  const now = ctx.currentTime;

  const osc = ctx.createOscillator();
  osc.type = spec.waveType;
  osc.frequency.setValueAtTime(spec.freqStartHz, now);
  osc.frequency.linearRampToValueAtTime(spec.freqEndHz, now + durationSec);

  const gain = ctx.createGain();
  // Fade out over the last ~20% of the tone so it never clicks at cutoff. Fades in over a
  // few ms too (not audible as a fade, just avoids a hard edge at t=0).
  const attackSec = Math.min(0.005, durationSec * 0.1);
  const releaseStart = now + durationSec * 0.8;
  gain.gain.setValueAtTime(0, now);
  gain.gain.linearRampToValueAtTime(spec.volume, now + attackSec);
  gain.gain.setValueAtTime(spec.volume, releaseStart);
  gain.gain.linearRampToValueAtTime(0, now + durationSec);

  osc.connect(gain);
  gain.connect(ctx.destination);

  osc.start(now);
  osc.stop(now + durationSec);
  osc.onended = () => {
    osc.disconnect();
    gain.disconnect();
  };
}
