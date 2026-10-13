/** Tiny synthesized sound effects, so the game needs no audio files. */
class Sfx {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private noise: AudioBuffer | null = null;
  private last = new Map<string, number>();
  muted = false;

  private ensure(): AudioContext | null {
    if (typeof window === "undefined") return null;
    if (!this.ctx) {
      const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!Ctx) return null;
      this.ctx = new Ctx();
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.35;
      this.master.connect(this.ctx.destination);
      const len = this.ctx.sampleRate * 0.5;
      this.noise = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
      const data = this.noise.getChannelData(0);
      for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
    }
    if (this.ctx.state === "suspended") void this.ctx.resume();
    return this.ctx;
  }

  /** Call from a user gesture so browsers allow sound. */
  unlock() {
    this.ensure();
  }

  private gate(key: string, ms: number) {
    const now = performance.now();
    if ((this.last.get(key) ?? 0) + ms > now) return false;
    this.last.set(key, now);
    return true;
  }

  private tone(freq: number, dur: number, opts: { type?: OscillatorType; to?: number; vol?: number; delay?: number } = {}) {
    const ctx = this.ensure();
    if (!ctx || this.muted) return;
    const t = ctx.currentTime + (opts.delay ?? 0);
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = opts.type ?? "sine";
    osc.frequency.setValueAtTime(freq, t);
    if (opts.to) osc.frequency.exponentialRampToValueAtTime(opts.to, t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(opts.vol ?? 0.3, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(g).connect(this.master!);
    osc.start(t);
    osc.stop(t + dur + 0.05);
  }

  private hiss(dur: number, opts: { freq?: number; q?: number; vol?: number; type?: BiquadFilterType; to?: number } = {}) {
    const ctx = this.ensure();
    if (!ctx || this.muted || !this.noise) return;
    const t = ctx.currentTime;
    const src = ctx.createBufferSource();
    src.buffer = this.noise;
    const f = ctx.createBiquadFilter();
    f.type = opts.type ?? "bandpass";
    f.frequency.setValueAtTime(opts.freq ?? 1000, t);
    if (opts.to) f.frequency.exponentialRampToValueAtTime(opts.to, t + dur);
    f.Q.value = opts.q ?? 1;
    const g = ctx.createGain();
    g.gain.setValueAtTime(opts.vol ?? 0.4, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(f).connect(g).connect(this.master!);
    src.start(t);
    src.stop(t + dur + 0.05);
  }

  swing() {
    if (this.gate("swing", 45)) this.hiss(0.12, { freq: 2500, to: 600, q: 2, vol: 0.25 });
  }
  shoot(kind: string) {
    if (!this.gate("shoot" + kind, 50)) return;
    if (kind === "fireball") this.hiss(0.3, { freq: 400, to: 150, type: "lowpass", vol: 0.4 });
    else if (kind === "powershot") {
      this.tone(900, 0.25, { to: 200, type: "sawtooth", vol: 0.15 });
      this.hiss(0.25, { freq: 3000, to: 800, vol: 0.3 });
    } else if (kind === "knife") this.hiss(0.08, { freq: 4000, to: 2000, q: 4, vol: 0.2 });
    else this.tone(1400, 0.1, { to: 500, type: "triangle", vol: 0.15 });
  }
  hit(big?: boolean) {
    if (!this.gate("hit", 35)) return;
    this.tone(big ? 110 : 180, big ? 0.2 : 0.09, { to: 60, type: "square", vol: big ? 0.25 : 0.12 });
    this.hiss(0.06, { freq: 1800, vol: 0.2 });
  }
  heal() {
    if (!this.gate("heal", 120)) return;
    this.tone(880, 0.15, { type: "sine", vol: 0.12 });
    this.tone(1320, 0.2, { type: "sine", vol: 0.1, delay: 0.06 });
  }
  death(team: string) {
    if (!this.gate("death", 60)) return;
    const base = team === "red" ? 520 : 330;
    this.tone(base, 0.35, { to: base / 4, type: "square", vol: 0.12 });
    this.hiss(0.3, { freq: 600, to: 200, vol: 0.25 });
  }
  explode(kind: string) {
    if (!this.gate("explode", 60)) return;
    if (kind === "holy") {
      [660, 880, 1100, 1320].forEach((f, i) => this.tone(f, 0.4, { vol: 0.08, delay: i * 0.05 }));
      return;
    }
    const big = kind === "meteor" || kind === "stomp";
    this.tone(big ? 70 : 120, big ? 0.6 : 0.3, { to: 30, type: "sine", vol: 0.5 });
    this.hiss(big ? 0.7 : 0.35, { freq: 1200, to: 100, type: "lowpass", vol: big ? 0.6 : 0.35 });
  }
  /** The classic "!" when someone gets spotted. */
  spotted(byBlue: boolean) {
    if (!this.gate("spotted", 150)) return;
    this.tone(byBlue ? 988 : 523, 0.08, { type: "square", vol: 0.08 });
    this.tone(byBlue ? 1319 : 392, 0.12, { type: "square", vol: 0.08, delay: 0.07 });
  }
  smoke() {
    this.hiss(0.5, { freq: 800, to: 200, type: "lowpass", vol: 0.35 });
  }
  warn() {
    this.tone(300, 0.6, { to: 900, type: "sawtooth", vol: 0.05 });
  }
  whirl() {
    this.hiss(0.4, { freq: 600, to: 3000, q: 3, vol: 0.35 });
  }
  pickup() {
    [784, 988, 1175, 1568].forEach((f, i) => this.tone(f, 0.12, { type: "square", vol: 0.07, delay: i * 0.05 }));
  }
  special() {
    if (this.gate("special", 80)) this.tone(500, 0.25, { to: 1500, type: "triangle", vol: 0.12 });
  }
  wave() {
    [392, 523, 659].forEach((f, i) => this.tone(f, 0.25, { type: "sawtooth", vol: 0.08, delay: i * 0.12 }));
  }
  countdown(final: boolean) {
    this.tone(final ? 880 : 440, final ? 0.5 : 0.15, { type: "square", vol: 0.12 });
  }
  victory() {
    const notes = [523, 659, 784, 1047, 784, 1047];
    const times = [0, 0.12, 0.24, 0.36, 0.55, 0.67];
    notes.forEach((f, i) => this.tone(f, i === notes.length - 1 ? 0.7 : 0.18, { type: "square", vol: 0.1, delay: times[i] }));
  }
  defeat() {
    [392, 370, 349, 262].forEach((f, i) => this.tone(f, i === 3 ? 0.8 : 0.3, { type: "triangle", vol: 0.18, delay: i * 0.28 }));
  }
  star(i: number) {
    this.tone(660 * Math.pow(1.26, i), 0.3, { type: "triangle", vol: 0.15 });
  }
  click() {
    this.tone(700, 0.05, { type: "triangle", vol: 0.08 });
  }
}

export const sfx = new Sfx();
