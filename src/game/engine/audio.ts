// A tiny WebAudio chiptune engine: pulse/triangle/noise voices, procedurally
// composed looping tracks (seeded per run), and synthesized sound effects.

import { RNG } from "./rng";

export type Mood = "title" | "dungeon" | "battle" | "boss" | "safe" | "victory" | "gameover" | "ending" | "final";

interface Note {
  step: number; // 16th-note index within the loop
  len: number; // in steps
  midi: number;
  voice: "lead" | "arp" | "bass" | "kick" | "snare" | "hat";
  vol: number;
}

interface Track {
  bpm: number;
  steps: number;
  notes: Note[];
  loop: boolean;
}

const SCALES: Record<string, number[]> = {
  major: [0, 2, 4, 5, 7, 9, 11],
  minor: [0, 2, 3, 5, 7, 8, 10],
  dorian: [0, 2, 3, 5, 7, 9, 10],
  phrygian: [0, 1, 3, 5, 7, 8, 10],
  harmonic: [0, 2, 3, 5, 7, 8, 11],
  lydian: [0, 2, 4, 6, 7, 9, 11],
  mixolydian: [0, 2, 4, 5, 7, 9, 10],
};

const mtof = (m: number) => 440 * Math.pow(2, (m - 69) / 12);

function compose(mood: Mood, seed: number): Track {
  const r = new RNG(seed);
  const cfg = {
    title: { bpm: [92, 104], scale: ["lydian", "major"], prog: [[0, 5, 3, 4], [0, 3, 5, 4], [5, 3, 0, 4]], bars: 8, drums: 0.4, arp: true },
    dungeon: { bpm: [84, 100], scale: ["dorian", "minor", "phrygian"], prog: [[0, 5, 6, 4], [0, 6, 5, 6], [0, 3, 0, 4], [0, 1, 0, 6]], bars: 8, drums: 0.5, arp: true },
    battle: { bpm: [148, 166], scale: ["minor", "harmonic", "dorian"], prog: [[0, 5, 6, 4], [0, 6, 3, 4], [0, 0, 5, 6]], bars: 8, drums: 1, arp: true },
    boss: { bpm: [156, 172], scale: ["harmonic", "phrygian"], prog: [[0, 1, 0, 6], [0, 5, 1, 4], [0, 6, 5, 4]], bars: 8, drums: 1, arp: true },
    final: { bpm: [138, 150], scale: ["harmonic"], prog: [[0, 5, 1, 4], [0, 6, 5, 4]], bars: 8, drums: 1, arp: true },
    safe: { bpm: [96, 112], scale: ["major", "mixolydian"], prog: [[0, 3, 4, 0], [0, 5, 3, 4], [0, 4, 5, 3]], bars: 8, drums: 0.6, arp: false },
    victory: { bpm: [132, 132], scale: ["major"], prog: [[0, 3, 4, 0]], bars: 4, drums: 0.8, arp: true },
    gameover: { bpm: [70, 76], scale: ["minor"], prog: [[0, 5, 3, 4]], bars: 4, drums: 0, arp: false },
    ending: { bpm: [88, 96], scale: ["major", "lydian"], prog: [[0, 4, 5, 3], [3, 4, 0, 5]], bars: 8, drums: 0.4, arp: true },
  }[mood];

  const bpm = r.int(cfg.bpm[0], cfg.bpm[1]);
  const scale = SCALES[r.pick(cfg.scale)];
  const root = 45 + r.int(0, 7); // A2..E3 for the bass
  const prog = r.pick(cfg.prog);
  const bars = cfg.bars;
  const notes: Note[] = [];
  const deg = (d: number, oct = 0) => {
    const o = Math.floor(d / 7);
    const i = ((d % 7) + 7) % 7;
    return root + scale[i] + 12 * (o + oct);
  };

  // --- Victory fanfare: a hand-shaped original jingle, not looped
  if (mood === "victory") {
    const seq = [[0, 2], [2, 2], [4, 2], [7, 6], [5, 2], [6, 2], [7, 8]];
    let s = 0;
    for (const [d, l] of seq) {
      notes.push({ step: s, len: l, midi: deg(d, 2), voice: "lead", vol: 0.5 });
      notes.push({ step: s, len: l, midi: deg(d - 2, 1), voice: "arp", vol: 0.25 });
      s += l;
    }
    for (let b = 0; b < 3; b++) notes.push({ step: b * 8, len: 8, midi: deg(b === 2 ? 4 : 0), voice: "bass", vol: 0.6 });
    return { bpm, steps: s + 8, notes, loop: false };
  }
  if (mood === "gameover") {
    const seq = [[4, 4], [3, 4], [2, 4], [1, 4], [0, 16]];
    let s = 0;
    for (const [d, l] of seq) {
      notes.push({ step: s, len: l, midi: deg(d, 2), voice: "lead", vol: 0.45 });
      s += l;
    }
    notes.push({ step: 0, len: 16, midi: deg(0), voice: "bass", vol: 0.5 });
    notes.push({ step: 16, len: 16, midi: deg(-3), voice: "bass", vol: 0.5 });
    return { bpm, steps: s + 8, notes, loop: false };
  }

  // --- Melody motifs (2 bars each); strong beats land on chord tones
  const rhythms = mood === "battle" || mood === "boss" || mood === "final"
    ? [[2, 2, 2, 2, 4, 2, 2], [4, 2, 2, 4, 4], [2, 2, 4, 2, 2, 4], [3, 3, 2, 4, 4], [1, 1, 2, 4, 2, 2, 4]]
    : [[4, 4, 4, 4], [6, 2, 4, 4], [4, 2, 2, 8], [8, 4, 4], [2, 2, 4, 4, 4], [6, 2, 8]];
  const makeMotif = (chordA: number, chordB: number) => {
    const out: { off: number; len: number; d: number }[] = [];
    let cur = chordA + r.pick([0, 2, 4]);
    for (let bar = 0; bar < 2; bar++) {
      const chord = bar === 0 ? chordA : chordB;
      const rh = r.pick(rhythms);
      let s = 0;
      for (const len of rh) {
        if (s >= 16) break;
        const strong = s % 4 === 0;
        if (strong) {
          const tones = [chord, chord + 2, chord + 4, chord + 7];
          cur = tones.reduce((best, t) => (Math.abs(t - cur) < Math.abs(best - cur) ? t : best), tones[0]);
          if (r.chance(0.3)) cur = r.pick(tones);
        } else cur += r.pick([-1, 1, 1, -2, 2, 0]);
        cur = Math.max(chord - 3, Math.min(chord + 9, cur));
        if (r.chance(mood === "dungeon" ? 0.18 : 0.08)) {
          s += len;
          continue; // rest
        }
        out.push({ off: bar * 16 + s, len: Math.min(len, 16 - s), d: cur });
        s += len;
      }
    }
    return out;
  };

  const motifA = makeMotif(prog[0], prog[1]);
  const motifB = makeMotif(prog[2], prog[3]);
  const motifC = makeMotif(prog[0], prog[1]);
  const form = bars === 8 ? [motifA, motifB, motifC, motifB] : [motifA, motifB];
  const leadOct = mood === "dungeon" ? 1 : 2;
  form.forEach((m, i) => {
    for (const n of m) notes.push({ step: i * 32 + n.off, len: n.len, midi: deg(n.d, leadOct), voice: "lead", vol: mood === "dungeon" ? 0.32 : 0.4 });
  });

  // --- Bass + arpeggio + drums per bar
  const bassStyle = mood === "battle" || mood === "boss" || mood === "final" ? "drive" : mood === "safe" ? "walk" : "pulse";
  for (let bar = 0; bar < bars; bar++) {
    const chord = prog[bar % 4];
    const b0 = bar * 16;
    if (bassStyle === "drive") {
      for (let s = 0; s < 16; s += 2) notes.push({ step: b0 + s, len: 2, midi: deg(chord) + (s % 8 === 6 ? 12 : 0), voice: "bass", vol: 0.55 });
    } else if (bassStyle === "walk") {
      [0, 2, 4, 5].forEach((d, i) => notes.push({ step: b0 + i * 4, len: 3, midi: deg(chord + d), voice: "bass", vol: 0.5 }));
    } else {
      notes.push({ step: b0, len: 6, midi: deg(chord), voice: "bass", vol: 0.55 });
      notes.push({ step: b0 + 8, len: 6, midi: deg(chord + (r.chance(0.5) ? 4 : 0)), voice: "bass", vol: 0.45 });
    }
    if (cfg.arp) {
      const tones = [0, 2, 4, 7, 4, 2];
      const rate = mood === "dungeon" || mood === "title" || mood === "ending" ? 2 : 1;
      for (let s = 0, k = 0; s < 16; s += rate, k++) notes.push({ step: b0 + s, len: rate, midi: deg(chord + tones[k % tones.length], 1), voice: "arp", vol: 0.12 });
    }
    if (cfg.drums > 0) {
      for (let s = 0; s < 16; s++) {
        if (s % 8 === 0 || (cfg.drums >= 1 && s === 10)) notes.push({ step: b0 + s, len: 1, midi: 0, voice: "kick", vol: 0.7 * cfg.drums });
        if (s % 8 === 4 && cfg.drums >= 0.5) notes.push({ step: b0 + s, len: 1, midi: 0, voice: "snare", vol: 0.4 * cfg.drums });
        if (s % 2 === 0 && cfg.drums >= 0.6) notes.push({ step: b0 + s, len: 1, midi: 0, voice: "hat", vol: (s % 4 === 2 ? 0.16 : 0.09) * cfg.drums });
      }
    }
  }
  return { bpm, steps: bars * 16, notes, loop: true };
}

export class ChipAudio {
  ctx: AudioContext | null = null;
  private master!: GainNode;
  private musicBus!: GainNode;
  private sfxBus!: GainNode;
  private waves: Record<string, PeriodicWave> = {};
  private noise!: AudioBuffer;
  private track: Track | null = null;
  private trackKey = "";
  private trackStart = 0;
  private nextStep = 0;
  private timer: number | null = null;
  private musicNodes: AudioScheduledSourceNode[] = [];
  musicVol = 0.55;
  sfxVol = 0.7;

  unlock() {
    if (!this.ctx) {
      const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AC) return;
      this.ctx = new AC();
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.5;
      this.master.connect(this.ctx.destination);
      this.musicBus = this.ctx.createGain();
      this.musicBus.gain.value = this.musicVol;
      this.musicBus.connect(this.master);
      this.sfxBus = this.ctx.createGain();
      this.sfxBus.gain.value = this.sfxVol;
      this.sfxBus.connect(this.master);
      for (const duty of [0.125, 0.25, 0.5]) this.waves["p" + duty] = this.pulseWave(duty);
      const len = this.ctx.sampleRate;
      this.noise = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
      const d = this.noise.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
      if (this.pendingMusic) this.music(this.pendingMusic[0], this.pendingMusic[1]);
    }
    if (this.ctx.state === "suspended") this.ctx.resume();
  }

  setVolumes(music: number, sfx: number) {
    this.musicVol = music;
    this.sfxVol = sfx;
    if (this.ctx) {
      this.musicBus.gain.setTargetAtTime(music, this.ctx.currentTime, 0.05);
      this.sfxBus.gain.setTargetAtTime(sfx, this.ctx.currentTime, 0.05);
    }
  }

  private pulseWave(duty: number): PeriodicWave {
    const n = 32;
    const real = new Float32Array(n);
    const imag = new Float32Array(n);
    for (let k = 1; k < n; k++) real[k] = (2 / (k * Math.PI)) * Math.sin(k * Math.PI * duty);
    return this.ctx!.createPeriodicWave(real, imag);
  }

  // ------------------------------------------------------------ music
  private pendingMusic: [Mood, number] | null = null;

  music(mood: Mood, seed: number) {
    const key = mood + ":" + seed;
    if (key === this.trackKey && this.track) return;
    this.pendingMusic = [mood, seed];
    if (!this.ctx) return;
    this.stopMusic();
    this.trackKey = key;
    this.track = compose(mood, seed);
    this.trackStart = this.ctx.currentTime + 0.08;
    this.nextStep = 0;
    this.timer = window.setInterval(() => this.schedule(), 30);
    this.schedule();
  }

  currentMood(): string {
    return this.trackKey.split(":")[0];
  }

  stopMusic() {
    if (this.timer !== null) window.clearInterval(this.timer);
    this.timer = null;
    this.track = null;
    this.trackKey = "";
    const now = this.ctx?.currentTime ?? 0;
    for (const n of this.musicNodes) {
      try {
        n.stop(now + 0.02);
      } catch {
        /* already stopped */
      }
    }
    this.musicNodes = [];
  }

  private schedule() {
    const ctx = this.ctx;
    const tr = this.track;
    if (!ctx || !tr) return;
    const stepDur = 60 / tr.bpm / 4;
    const horizon = ctx.currentTime + 0.15;
    while (true) {
      const t = this.trackStart + this.nextStep * stepDur;
      if (t > horizon) break;
      const s = tr.loop ? this.nextStep % tr.steps : this.nextStep;
      if (!tr.loop && this.nextStep >= tr.steps) {
        if (this.timer !== null) window.clearInterval(this.timer);
        this.timer = null;
        return;
      }
      for (const n of tr.notes) if (n.step === s) this.playNote(n, t, n.len * stepDur);
      this.nextStep++;
    }
    this.musicNodes = this.musicNodes.filter((n) => (n as unknown as { _end: number })._end > ctx.currentTime);
  }

  private playNote(n: Note, t: number, dur: number) {
    const ctx = this.ctx!;
    const g = ctx.createGain();
    g.connect(this.musicBus);
    let src: AudioScheduledSourceNode;
    if (n.voice === "kick") {
      const o = ctx.createOscillator();
      o.type = "sine";
      o.frequency.setValueAtTime(140, t);
      o.frequency.exponentialRampToValueAtTime(40, t + 0.12);
      g.gain.setValueAtTime(n.vol, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.14);
      o.connect(g);
      src = o;
      dur = 0.15;
    } else if (n.voice === "snare" || n.voice === "hat") {
      const b = ctx.createBufferSource();
      b.buffer = this.noise;
      const f = ctx.createBiquadFilter();
      f.type = n.voice === "hat" ? "highpass" : "bandpass";
      f.frequency.value = n.voice === "hat" ? 7000 : 1800;
      b.connect(f);
      f.connect(g);
      const d = n.voice === "hat" ? 0.04 : 0.12;
      g.gain.setValueAtTime(n.vol, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + d);
      src = b;
      dur = d;
    } else {
      const o = ctx.createOscillator();
      if (n.voice === "bass") o.type = "triangle";
      else o.setPeriodicWave(this.waves[n.voice === "lead" ? "p0.25" : "p0.125"]);
      o.frequency.setValueAtTime(mtof(n.midi), t);
      if (n.voice === "lead") {
        // gentle vibrato
        const lfo = ctx.createOscillator();
        const lg = ctx.createGain();
        lfo.frequency.value = 5.5;
        lg.gain.value = mtof(n.midi) * 0.006;
        lfo.connect(lg);
        lg.connect(o.frequency);
        lfo.start(t + 0.12);
        lfo.stop(t + dur);
      }
      const v = n.vol * (n.voice === "bass" ? 1.4 : 0.55);
      g.gain.setValueAtTime(0.0001, t);
      g.gain.linearRampToValueAtTime(v, t + 0.008);
      g.gain.setTargetAtTime(v * 0.6, t + 0.03, 0.08);
      g.gain.setTargetAtTime(0.0001, t + dur * 0.92, 0.02);
      o.connect(g);
      src = o;
    }
    src.start(t);
    src.stop(t + dur + 0.05);
    (src as unknown as { _end: number })._end = t + dur + 0.05;
    this.musicNodes.push(src);
  }

  // ------------------------------------------------------------ sfx
  private tone(freq: number, dur: number, opts: { wave?: string; vol?: number; slide?: number; delay?: number; duty?: number } = {}) {
    const ctx = this.ctx;
    if (!ctx) return;
    const t = ctx.currentTime + (opts.delay ?? 0);
    const o = ctx.createOscillator();
    const wave = opts.wave ?? "square";
    if (wave === "square") o.setPeriodicWave(this.waves["p" + (opts.duty ?? 0.5)] ?? this.waves["p0.5"]);
    else o.type = wave as OscillatorType;
    o.frequency.setValueAtTime(freq, t);
    if (opts.slide) o.frequency.exponentialRampToValueAtTime(Math.max(20, opts.slide), t + dur);
    const g = ctx.createGain();
    const v = opts.vol ?? 0.3;
    g.gain.setValueAtTime(v, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    o.connect(g);
    g.connect(this.sfxBus);
    o.start(t);
    o.stop(t + dur + 0.02);
  }

  private hiss(dur: number, opts: { freq?: number; type?: BiquadFilterType; vol?: number; delay?: number; sweep?: number } = {}) {
    const ctx = this.ctx;
    if (!ctx) return;
    const t = ctx.currentTime + (opts.delay ?? 0);
    const b = ctx.createBufferSource();
    b.buffer = this.noise;
    const f = ctx.createBiquadFilter();
    f.type = opts.type ?? "bandpass";
    f.frequency.setValueAtTime(opts.freq ?? 1200, t);
    if (opts.sweep) f.frequency.exponentialRampToValueAtTime(opts.sweep, t + dur);
    const g = ctx.createGain();
    g.gain.setValueAtTime(opts.vol ?? 0.4, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    b.connect(f);
    f.connect(g);
    g.connect(this.sfxBus);
    b.start(t);
    b.stop(t + dur + 0.02);
  }

  sfx(name: string) {
    if (!this.ctx) return;
    switch (name) {
      case "cursor":
        this.tone(1320, 0.04, { vol: 0.12, duty: 0.25 });
        break;
      case "confirm":
        this.tone(880, 0.05, { vol: 0.15, duty: 0.25 });
        this.tone(1320, 0.07, { vol: 0.15, duty: 0.25, delay: 0.05 });
        break;
      case "cancel":
        this.tone(660, 0.06, { vol: 0.15, duty: 0.25 });
        this.tone(440, 0.08, { vol: 0.15, duty: 0.25, delay: 0.05 });
        break;
      case "error":
        this.tone(180, 0.15, { vol: 0.2, duty: 0.5 });
        break;
      case "text":
        this.tone(1760, 0.015, { vol: 0.04, duty: 0.125 });
        break;
      case "hit":
        this.hiss(0.12, { freq: 900, vol: 0.5, sweep: 200 });
        this.tone(220, 0.08, { vol: 0.2, slide: 80 });
        break;
      case "crit":
        this.hiss(0.2, { freq: 2400, vol: 0.6, sweep: 300 });
        this.tone(520, 0.18, { vol: 0.25, slide: 60 });
        break;
      case "miss":
        this.hiss(0.1, { freq: 3000, type: "highpass", vol: 0.2 });
        break;
      case "fire":
        this.hiss(0.5, { freq: 400, vol: 0.5, sweep: 2400, type: "lowpass" });
        break;
      case "ice":
        for (let i = 0; i < 5; i++) this.tone(2000 + i * 300, 0.08, { vol: 0.08, delay: i * 0.05, wave: "triangle" });
        this.hiss(0.3, { freq: 6000, type: "highpass", vol: 0.25 });
        break;
      case "bolt":
        this.hiss(0.35, { freq: 3000, vol: 0.6, sweep: 400 });
        this.tone(60, 0.3, { vol: 0.3, wave: "sawtooth" });
        break;
      case "holy":
        [0, 4, 7, 12].forEach((s, i) => this.tone(880 * Math.pow(2, s / 12), 0.25, { vol: 0.09, delay: i * 0.06, wave: "triangle" }));
        break;
      case "heal":
        [0, 4, 7, 11, 14].forEach((s, i) => this.tone(660 * Math.pow(2, s / 12), 0.18, { vol: 0.1, delay: i * 0.05, duty: 0.125 }));
        break;
      case "poison":
        this.tone(300, 0.25, { vol: 0.15, slide: 120, wave: "sawtooth" });
        break;
      case "magic":
        this.tone(400, 0.3, { vol: 0.15, slide: 1600, duty: 0.125 });
        break;
      case "defend":
        this.tone(330, 0.1, { vol: 0.2 });
        this.tone(440, 0.15, { vol: 0.2, delay: 0.08 });
        break;
      case "death":
        this.hiss(0.5, { freq: 1600, vol: 0.4, sweep: 100 });
        this.tone(400, 0.5, { vol: 0.2, slide: 40, duty: 0.25 });
        break;
      case "ko":
        this.tone(300, 0.6, { vol: 0.25, slide: 60, wave: "triangle" });
        break;
      case "encounter":
        this.hiss(0.6, { freq: 300, vol: 0.5, sweep: 5000 });
        for (let i = 0; i < 6; i++) this.tone(200 + i * 120, 0.06, { vol: 0.12, delay: i * 0.05 });
        break;
      case "levelup":
        [0, 4, 7, 12, 7, 12, 16].forEach((s, i) => this.tone(523 * Math.pow(2, s / 12), 0.12, { vol: 0.14, delay: i * 0.07, duty: 0.25 }));
        break;
      case "chest":
        [0, 7, 12].forEach((s, i) => this.tone(587 * Math.pow(2, s / 12), 0.1, { vol: 0.14, delay: i * 0.07, duty: 0.25 }));
        break;
      case "achievement":
        [0, 4, 7, 12, 16, 19, 24].forEach((s, i) => this.tone(392 * Math.pow(2, s / 12), 0.14, { vol: 0.12, delay: i * 0.055, duty: 0.125 }));
        this.hiss(0.6, { freq: 8000, type: "highpass", vol: 0.12, delay: 0.3 });
        break;
      case "boxshake":
        this.tone(120 + Math.random() * 40, 0.06, { vol: 0.2, wave: "triangle" });
        break;
      case "boxopen":
        this.hiss(0.8, { freq: 500, vol: 0.4, sweep: 8000 });
        [0, 4, 7, 12, 16].forEach((s, i) => this.tone(784 * Math.pow(2, s / 12), 0.3, { vol: 0.1, delay: 0.2 + i * 0.06, wave: "triangle" }));
        break;
      case "buy":
        this.tone(1568, 0.06, { vol: 0.12, duty: 0.25 });
        this.tone(2093, 0.12, { vol: 0.12, duty: 0.25, delay: 0.06 });
        break;
      case "stairs":
        for (let i = 0; i < 8; i++) this.tone(600 - i * 50, 0.07, { vol: 0.12, delay: i * 0.07, duty: 0.25 });
        break;
      case "save":
        [0, 7, 12, 19].forEach((s, i) => this.tone(440 * Math.pow(2, s / 12), 0.4, { vol: 0.08, delay: i * 0.1, wave: "triangle" }));
        break;
      case "trap":
        this.tone(900, 0.05, { vol: 0.2 });
        this.hiss(0.3, { freq: 600, vol: 0.5 });
        break;
      case "hype":
        for (let i = 0; i < 10; i++) this.hiss(0.08, { freq: 1500 + Math.random() * 3000, vol: 0.12, delay: i * 0.04 });
        [0, 7, 12, 19, 24].forEach((s, i) => this.tone(330 * Math.pow(2, s / 12), 0.15, { vol: 0.15, delay: i * 0.05 }));
        break;
      case "swing":
        this.hiss(0.08, { freq: 2500, vol: 0.25, sweep: 600 });
        break;
      case "step":
        this.hiss(0.03, { freq: 400, vol: 0.05 });
        break;
      case "crowd":
        for (let i = 0; i < 16; i++) this.hiss(0.15, { freq: 800 + Math.random() * 1600, vol: 0.06, delay: i * 0.03 });
        break;
    }
  }
}

export const audio = new ChipAudio();
