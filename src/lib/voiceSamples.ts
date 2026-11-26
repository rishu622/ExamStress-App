// Benchmark "attendance call" voices for the simulator. Each is synthesised in the browser
// (a harmonic voice source shaped into syllables), so no recordings of real students are
// shipped. The parameters reproduce the acoustic patterns the analyser looks for.
import type { RiskZone } from '../types';
import { encodeWav } from './audio';

const RATE = 16000;

export interface VoiceSample {
  id: string;
  name: string;
  expectedZone: RiskZone;
  description: string;
  transcript: string;
  f0: number; // median pitch, Hz
  variability: number; // pitch movement, semitones
  syllableRate: number; // syllables per second
  onset: number; // seconds of silence before answering
  amplitude: number;
  gap: number; // hesitation pause inside the phrase, seconds
  // Optional crying / distress qualities
  jitter?: number; // random pitch wobble, semitones
  shimmer?: number; // random loudness wobble (fraction)
  breath?: number; // 0-1 breathy noise mixed into the voice
  cracks?: number; // number of syllables where the voice breaks upward
  sob?: boolean; // short gasping bursts with gaps between them
  syllables?: number;
}

export const VOICE_SAMPLES: VoiceSample[] = [
  {
    id: 'rahul', name: 'Healthy Rahul', expectedZone: 'green',
    description: 'Prompt, bright answer with natural intonation.',
    transcript: "Present ma'am, good morning!",
    f0: 210, variability: 3.0, syllableRate: 3.7, onset: 0.18, amplitude: 0.12, gap: 0.25,
  },
  {
    id: 'priya', name: 'Tired Priya', expectedZone: 'yellow',
    description: 'Quieter, slower reply with flatter pitch after late-night revision.',
    transcript: "Present ma'am.",
    f0: 235, variability: 1.0, syllableRate: 2.6, onset: 0.55, amplitude: 0.05, gap: 0.25,
  },
  {
    id: 'meera', name: 'Anxious Meera', expectedZone: 'orange',
    description: 'Hesitates, then rushes the words at a tense, raised pitch.',
    transcript: "Present ma'am, sorry, I always forget, I never sleep.",
    f0: 390, variability: 0.6, syllableRate: 9.0, onset: 0.95, amplitude: 0.08, gap: 0.35,
  },
  {
    id: 'arjun', name: 'Depressed Arjun', expectedZone: 'red',
    description: 'Long delay, monotone, low energy and absolutist language.',
    transcript: 'Present... nothing ever changes, always tired.',
    f0: 125, variability: 0.5, syllableRate: 2.2, onset: 0.82, amplitude: 0.022, gap: 0.25,
  },
  {
    id: 'sneha', name: 'Crying Sneha', expectedZone: 'orange',
    description: 'Tearful reply: breathy, shaky, high-pitched voice that cracks between sobs.',
    transcript: "Present ma'am.",
    f0: 440, variability: 3.0, syllableRate: 4, onset: 0.4, amplitude: 0.08, gap: 0,
    jitter: 0.7, shimmer: 0.3, breath: 0.55, cracks: 3, sob: true, syllables: 8,
  },
];

const PATTERN = [0, 1, -0.5, 0.8, -1, 0.3, -0.2, 0.6, -0.8, 0.4];

/** Small seeded random generator so every sample sounds the same on every machine. */
function seeded(seed: number) {
  let state = seed;
  const uniform = () => {
    state = (state * 1103515245 + 12345) & 0x7fffffff;
    return state / 0x7fffffff;
  };
  const normal = () => Math.sqrt(-2 * Math.log(Math.max(1e-9, uniform()))) * Math.cos(2 * Math.PI * uniform());
  return { uniform, normal };
}

export function synthesizeSample(sample: VoiceSample): Blob {
  const syllables = sample.syllables ?? 7;
  const rng = seeded(7);
  const syl = 1 / sample.syllableRate;
  const gapExtra = sample.sob ? 0.18 : 0;
  const total = sample.onset + syllables * (syl + gapExtra) + sample.gap + 0.6;
  const out = new Float32Array(Math.floor(total * RATE));
  let pos = sample.onset;
  const crackEvery = sample.cracks ? Math.max(1, Math.floor(syllables / sample.cracks)) : 0;
  for (let i = 0; i < syllables; i += 1) {
    if (i === 3) pos += sample.gap;
    const dur = syl * (sample.sob ? 0.55 : 0.8);
    const a = Math.floor(pos * RATE);
    const n = Math.floor(dur * RATE);
    let phase = 0;
    let wobble = 0;
    let loud = 1;
    const breath = Math.min(0.9, sample.breath ?? 0);
    for (let j = 0; j < n; j += 1) {
      if (sample.jitter && j % 80 === 0) wobble = rng.normal() * sample.jitter;
      if (sample.shimmer && j % 160 === 0) loud = 1 + rng.normal() * sample.shimmer;
      let semis = PATTERN[i % PATTERN.length] * sample.variability - (sample.variability * 0.3 * j) / Math.max(1, n - 1) + wobble;
      if (crackEvery && i % crackEvery === 1 && j > n / 2) semis += 7; // voice cracks upward
      phase += (2 * Math.PI * sample.f0 * 2 ** (semis / 12)) / RATE;
      let src = 0;
      for (let h = 1; h < 16; h += 1) src += Math.sin(h * phase) / h;
      const env = Math.sin((Math.PI * j) / RATE / dur) ** 1.5 * loud;
      const noise = breath ? rng.normal() * breath * 0.6 : 0;
      out[a + j] += (src * (1 - breath) + noise) * env * sample.amplitude;
    }
    pos += syl + gapExtra;
  }
  // Faint deterministic room noise so the analyser can find the noise floor.
  let seed = 12345;
  for (let i = 0; i < out.length; i += 1) {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff;
    out[i] += ((seed / 0x7fffffff) * 2 - 1) * 0.0014;
  }
  return encodeWav(out, RATE);
}
