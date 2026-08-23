import Phaser from 'phaser';
import { parseCsv } from './csv';
import { playTone, ToneSpec } from './tone';

const SFX_CSV_KEY = 'data_sfx';

/** Call from a scene's preload(). No audio assets to load (SFX are synthesized, not
 * sampled -- see tone.ts) -- this just fetches the CSV text, same as every other
 * preload*Data() function in content/. */
export function preloadSfxData(scene: Phaser.Scene) {
  scene.load.text(SFX_CSV_KEY, 'data/sfx.csv');
}

let cache: Map<string, ToneSpec> | null = null;

function getSpecs(scene: Phaser.Scene): Map<string, ToneSpec> {
  if (cache) return cache;
  const rows = parseCsv(scene.cache.text.get(SFX_CSV_KEY));
  cache = new Map(
    rows.map((row) => [
      row.event_id,
      {
        waveType: row.wave_type as OscillatorType,
        freqStartHz: Number(row.freq_start_hz),
        freqEndHz: Number(row.freq_end_hz),
        durationMs: Number(row.duration_ms),
        volume: Number(row.volume),
      },
    ]),
  );
  return cache;
}

/** Plays the synthesized tone for `eventId` (see public/data/sfx.csv for the full event
 * list -- brief-sound.md). Call sites never reference a frequency/waveform directly, so
 * tuning a sound is a CSV edit only. Silently does nothing for an unknown eventId, same
 * fail-soft reasoning as tone.ts's missing-AudioContext case -- a missing sound effect
 * shouldn't be able to crash gameplay. */
export function playSfx(scene: Phaser.Scene, eventId: string): void {
  const spec = getSpecs(scene).get(eventId);
  if (!spec) return;
  playTone(scene, spec);
}
