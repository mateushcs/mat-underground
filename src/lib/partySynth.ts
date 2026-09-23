/**
 * Tiny generative house loop for party mode, built on the Web Audio API
 * (no audio files). 124 BPM: kick on every beat, clap on 2 and 4, off-beat hats,
 * a filtered saw bass and a delayed arpeggio over Am - F - C - G.
 */

export const PARTY_BPM = 124;
const BEAT = 60 / PARTY_BPM;
const STEP = BEAT / 4; // 16th notes
const LOOKAHEAD = 0.12;

// Chord roots (MIDI) and chord tones per bar: Am, F, C, G.
const BARS = [
  { root: 45, tones: [57, 60, 64, 69] },
  { root: 41, tones: [57, 60, 65, 69] },
  { root: 48, tones: [55, 60, 64, 67] },
  { root: 43, tones: [55, 59, 62, 67] },
];
const ARP = [0, 1, 2, 3, 2, 1, 2, 3, 0, 2, 1, 3, 2, 1, 3, 2];
const BASS = [1, 0, 1, 1, 0, 1, 1, 0, 1, 0, 1, 1, 0, 1, 1, 1];

const midiHz = (m: number) => 440 * Math.pow(2, (m - 69) / 12);

export interface PartySynth {
  /** AudioContext time the loop started (beat 0). */
  startTime: number;
  context: AudioContext;
  stop: () => void;
}

export function startPartySynth(): PartySynth | null {
  const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctx) return null;
  const ctx = new Ctx();
  void ctx.resume();

  const master = ctx.createGain();
  master.gain.value = 0;
  master.gain.linearRampToValueAtTime(0.32, ctx.currentTime + 0.6);
  const comp = ctx.createDynamicsCompressor();
  comp.threshold.value = -14;
  comp.ratio.value = 4;
  master.connect(comp).connect(ctx.destination);

  // Shared noise buffer for hats and claps.
  const noise = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
  const data = noise.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;

  // Feedback delay for the arpeggio.
  const delay = ctx.createDelay(1);
  delay.delayTime.value = BEAT * 0.75;
  const feedback = ctx.createGain();
  feedback.gain.value = 0.32;
  delay.connect(feedback).connect(delay);
  const delayOut = ctx.createGain();
  delayOut.gain.value = 0.4;
  delay.connect(delayOut).connect(master);

  const kick = (t: number) => {
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.frequency.setValueAtTime(150, t);
    o.frequency.exponentialRampToValueAtTime(42, t + 0.14);
    g.gain.setValueAtTime(1, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.32);
    o.connect(g).connect(master);
    o.start(t);
    o.stop(t + 0.34);
  };
  const noiseHit = (t: number, type: BiquadFilterType, freq: number, len: number, level: number) => {
    const src = ctx.createBufferSource();
    src.buffer = noise;
    const f = ctx.createBiquadFilter();
    f.type = type;
    f.frequency.value = freq;
    const g = ctx.createGain();
    g.gain.setValueAtTime(level, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + len);
    src.connect(f).connect(g).connect(master);
    src.start(t, Math.random() * 0.5);
    src.stop(t + len + 0.02);
  };
  const bass = (t: number, midi: number) => {
    const o = ctx.createOscillator();
    o.type = "sawtooth";
    o.frequency.value = midiHz(midi);
    const f = ctx.createBiquadFilter();
    f.type = "lowpass";
    f.Q.value = 8;
    f.frequency.setValueAtTime(900, t);
    f.frequency.exponentialRampToValueAtTime(180, t + STEP * 1.6);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.28, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + STEP * 1.8);
    o.connect(f).connect(g).connect(master);
    o.start(t);
    o.stop(t + STEP * 2);
  };
  const arp = (t: number, midi: number) => {
    const o = ctx.createOscillator();
    o.type = "triangle";
    o.frequency.value = midiHz(midi + 12);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.09, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + STEP * 0.9);
    o.connect(g);
    g.connect(master);
    g.connect(delay);
    o.start(t);
    o.stop(t + STEP);
  };

  const startTime = ctx.currentTime + 0.1;
  let step = 0;
  const schedule = () => {
    while (startTime + step * STEP < ctx.currentTime + LOOKAHEAD) {
      const t = startTime + step * STEP;
      const s16 = step % 16;
      const bar = BARS[Math.floor(step / 16) % BARS.length];
      if (s16 % 4 === 0) kick(t);
      if (s16 === 4 || s16 === 12) noiseHit(t, "bandpass", 1600, 0.18, 0.55);
      if (s16 % 4 === 2) noiseHit(t, "highpass", 7000, 0.05, 0.22);
      if (s16 % 2 === 1) noiseHit(t, "highpass", 9000, 0.02, 0.07);
      if (BASS[s16]) bass(t, bar.root + (s16 % 8 === 6 ? 12 : 0));
      arp(t, bar.tones[ARP[s16]]);
      step++;
    }
  };
  schedule();
  const timer = window.setInterval(schedule, 25);

  return {
    startTime,
    context: ctx,
    stop: () => {
      window.clearInterval(timer);
      const now = ctx.currentTime;
      master.gain.cancelScheduledValues(now);
      master.gain.setValueAtTime(master.gain.value, now);
      master.gain.linearRampToValueAtTime(0, now + 0.5);
      window.setTimeout(() => void ctx.close(), 700);
    },
  };
}
