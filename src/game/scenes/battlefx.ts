// Battle visual effects: particles, bouncing damage numbers and spell flourishes.

import { drawText } from "../engine/font";
import { Ctx, H, W } from "../engine/gfx";

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  g: number;
  life: number;
  max: number;
  color: string;
  size: number;
  shrink?: boolean;
}

interface Num {
  x: number;
  y: number;
  vy: number;
  by: number;
  text: string;
  color: string;
  t: number;
  bounces: number;
}

interface Fx {
  t: number;
  dur: number;
  draw: (ctx: Ctx, k: number) => void;
}

export class BattleFx {
  parts: Particle[] = [];
  nums: Num[] = [];
  fx: Fx[] = [];
  shake = 0;
  flash = 0;
  flashColor = "#ffffff";

  update(dt: number) {
    for (const p of this.parts) {
      p.vy += p.g * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.life -= dt;
    }
    this.parts = this.parts.filter((p) => p.life > 0);
    for (const n of this.nums) {
      n.t += dt;
      if (n.bounces < 2) {
        n.vy += 420 * dt;
        n.y += n.vy * dt;
        if (n.y >= n.by) {
          n.y = n.by;
          n.vy = -n.vy * 0.35;
          n.bounces++;
        }
      }
    }
    this.nums = this.nums.filter((n) => n.t < 1.3);
    for (const f of this.fx) f.t += dt;
    this.fx = this.fx.filter((f) => f.t < f.dur);
    this.shake = Math.max(0, this.shake - dt);
    this.flash = Math.max(0, this.flash - dt * 3);
  }

  draw(ctx: Ctx) {
    for (const f of this.fx) f.draw(ctx, f.t / f.dur);
    for (const p of this.parts) {
      const k = p.life / p.max;
      ctx.globalAlpha = Math.min(1, k * 2);
      ctx.fillStyle = p.color;
      const s = p.shrink ? Math.max(1, Math.round(p.size * k)) : p.size;
      ctx.fillRect(Math.round(p.x - s / 2), Math.round(p.y - s / 2), s, s);
    }
    ctx.globalAlpha = 1;
    for (const n of this.nums) {
      const a = n.t > 1 ? 1 - (n.t - 1) / 0.3 : 1;
      ctx.globalAlpha = Math.max(0, a);
      drawText(ctx, n.text, n.x, n.y, { color: n.color, align: "center", shadow: "#000000" });
      ctx.globalAlpha = 1;
    }
    if (this.flash > 0) {
      ctx.globalAlpha = Math.min(0.8, this.flash);
      ctx.fillStyle = this.flashColor;
      ctx.fillRect(0, 0, W, H);
      ctx.globalAlpha = 1;
    }
  }

  offset(): [number, number] {
    if (this.shake <= 0) return [0, 0];
    const m = Math.ceil(this.shake * 10);
    return [Math.round((Math.random() - 0.5) * m), Math.round((Math.random() - 0.5) * m)];
  }

  number(x: number, y: number, text: string, color: string) {
    this.nums.push({ x, y: y - 14, vy: -110, by: y, text, color, t: 0, bounces: 0 });
  }

  burst(x: number, y: number, n: number, colors: string[], opts: { speed?: number; g?: number; life?: number; size?: number; up?: number; spread?: number } = {}) {
    const sp = opts.speed ?? 60;
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2;
      const v = sp * (0.3 + Math.random() * 0.7);
      this.parts.push({
        x: x + (Math.random() - 0.5) * (opts.spread ?? 6),
        y: y + (Math.random() - 0.5) * (opts.spread ?? 6),
        vx: Math.cos(a) * v,
        vy: Math.sin(a) * v - (opts.up ?? 0),
        g: opts.g ?? 0,
        life: (opts.life ?? 0.5) * (0.6 + Math.random() * 0.6),
        max: opts.life ?? 0.5,
        color: colors[Math.floor(Math.random() * colors.length)],
        size: opts.size ?? 2,
        shrink: true,
      });
    }
  }

  add(dur: number, draw: (ctx: Ctx, k: number) => void) {
    this.fx.push({ t: 0, dur, draw });
  }

  /** Spawn the visual for a skill/element at a target position. Returns suggested delay. */
  play(kind: string, x: number, y: number, size = 16): number {
    switch (kind) {
      case "slash":
      case "bigslash": {
        const big = kind === "bigslash";
        this.add(0.22, (ctx, k) => {
          ctx.strokeStyle = "#ffffff";
          ctx.lineWidth = big ? 2 : 1;
          for (let i = 0; i < (big ? 3 : 2); i++) {
            const o = (i - 1) * 5;
            const len = (size + 10) * Math.min(1, k * 2);
            ctx.beginPath();
            ctx.moveTo(x - size / 2 - 4 + o, y - size / 2 - 4);
            ctx.lineTo(x - size / 2 - 4 + o + len, y - size / 2 - 4 + len);
            ctx.stroke();
          }
          ctx.lineWidth = 1;
        });
        this.burst(x, y, big ? 14 : 6, ["#ffffff", "#ffe0a0"], { speed: 80, life: 0.3 });
        return 0.18;
      }
      case "claw":
        this.add(0.22, (ctx, k) => {
          ctx.strokeStyle = "#ff8080";
          for (let i = 0; i < 3; i++) {
            const len = (size + 8) * Math.min(1, k * 2);
            ctx.beginPath();
            ctx.moveTo(x + size / 2 - i * 4, y - size / 2);
            ctx.lineTo(x + size / 2 - i * 4 - len * 0.4, y - size / 2 + len);
            ctx.stroke();
          }
        });
        return 0.18;
      case "fire":
        for (let i = 0; i < 26; i++)
          this.parts.push({ x: x + (Math.random() - 0.5) * size, y: y + size / 3, vx: (Math.random() - 0.5) * 20, vy: -40 - Math.random() * 60, g: -20, life: 0.6, max: 0.6, color: ["#ff3010", "#ff8020", "#ffd040", "#fff0a0"][i % 4], size: 3, shrink: true });
        this.flash = 0.25;
        this.flashColor = "#ff6020";
        return 0.35;
      case "ice":
        for (let i = 0; i < 10; i++) {
          const ox = (Math.random() - 0.5) * size * 1.4;
          this.add(0.45, (ctx, k) => {
            const yy = y - 50 + k * 50 + (i % 3) * 3;
            ctx.fillStyle = k > 0.8 ? "#ffffff" : "#a0e8ff";
            ctx.fillRect(Math.round(x + ox), Math.round(yy), 2, 5);
            ctx.fillStyle = "#e0ffff";
            ctx.fillRect(Math.round(x + ox), Math.round(yy), 1, 2);
          });
        }
        this.burst(x, y, 12, ["#c0f0ff", "#ffffff", "#60c0ff"], { speed: 70, life: 0.5, size: 2 });
        return 0.4;
      case "bolt":
        this.add(0.3, (ctx, k) => {
          if (Math.floor(k * 10) % 2) return;
          ctx.strokeStyle = "#fff8a0";
          ctx.lineWidth = 2;
          ctx.beginPath();
          let bx = x;
          ctx.moveTo(bx, 0);
          for (let yy = 0; yy < y; yy += 12) {
            bx = x + (Math.random() - 0.5) * 16;
            ctx.lineTo(bx, yy);
          }
          ctx.lineTo(x, y);
          ctx.stroke();
          ctx.lineWidth = 1;
        });
        this.flash = 0.35;
        this.flashColor = "#fff8c0";
        this.shake = 0.2;
        return 0.3;
      case "holy":
        this.add(0.5, (ctx, k) => {
          ctx.strokeStyle = `rgba(255,255,220,${1 - k})`;
          ctx.beginPath();
          ctx.arc(x, y, 4 + k * size, 0, Math.PI * 2);
          ctx.stroke();
        });
        this.burst(x, y, 18, ["#ffffff", "#fff8c0", "#ffe080"], { speed: 50, life: 0.7, up: 30 });
        return 0.4;
      case "dark":
        for (let i = 0; i < 18; i++) {
          const a = (i / 18) * Math.PI * 2;
          const r = 24;
          this.parts.push({ x: x + Math.cos(a) * r, y: y + Math.sin(a) * r, vx: -Math.cos(a) * r * 2.2, vy: -Math.sin(a) * r * 2.2, g: 0, life: 0.45, max: 0.45, color: i % 2 ? "#a040ff" : "#400080", size: 3, shrink: true });
        }
        return 0.4;
      case "poison":
        for (let i = 0; i < 14; i++)
          this.parts.push({ x: x + (Math.random() - 0.5) * size, y: y + size / 3, vx: (Math.random() - 0.5) * 10, vy: -20 - Math.random() * 30, g: 0, life: 0.7, max: 0.7, color: i % 2 ? "#60ff60" : "#20a040", size: 2 + (i % 2), shrink: false });
        return 0.35;
      case "heal":
        for (let i = 0; i < 16; i++)
          this.parts.push({ x: x + (Math.random() - 0.5) * size, y: y + size / 2, vx: 0, vy: -30 - Math.random() * 40, g: 0, life: 0.8, max: 0.8, color: i % 3 ? "#80ffa0" : "#ffffff", size: 2, shrink: true });
        return 0.35;
      case "shield":
        this.add(0.45, (ctx, k) => {
          ctx.strokeStyle = `rgba(120,200,255,${1 - k})`;
          ctx.strokeRect(Math.round(x - size / 2 - 3 - k * 4) + 0.5, Math.round(y - size / 2 - 3 - k * 4) + 0.5, size + 6 + k * 8, size + 6 + k * 8);
        });
        return 0.3;
      case "debuff":
        for (let i = 0; i < 3; i++)
          this.add(0.5, (ctx, k) => {
            const yy = y - 10 + k * 16;
            ctx.fillStyle = "#c060ff";
            const xx = x - 8 + i * 8;
            ctx.fillRect(xx, yy, 1, 5);
            ctx.fillRect(xx - 1, yy + 3, 3, 1);
            ctx.fillRect(xx - 2, yy + 2, 5, 1);
          });
        return 0.35;
      case "steal":
        this.burst(x, y, 10, ["#ffe040", "#ffffff"], { speed: 40, life: 0.5 });
        return 0.25;
      case "quake":
        this.shake = 0.35;
        this.burst(x, y + size / 2, 16, ["#a08060", "#806040", "#c0a080"], { speed: 50, g: 200, life: 0.6, up: 60, spread: size });
        return 0.3;
      case "smoke":
        this.burst(x, y, 24, ["#a0a0a8", "#d0d0d8", "#707078"], { speed: 30, life: 0.9, size: 4 });
        return 0.4;
      case "charge":
        for (let i = 0; i < 20; i++) {
          const a = Math.random() * Math.PI * 2;
          const r = 30 + Math.random() * 10;
          this.parts.push({ x: x + Math.cos(a) * r, y: y + Math.sin(a) * r, vx: -Math.cos(a) * r * 1.8, vy: -Math.sin(a) * r * 1.8, g: 0, life: 0.55, max: 0.55, color: i % 2 ? "#ff4040" : "#ffa040", size: 2, shrink: true });
        }
        return 0.5;
      case "meteor":
        for (let i = 0; i < 6; i++) {
          const sx = x - 60 + i * 24;
          const delay = i * 0.06;
          this.add(0.7, (ctx, k) => {
            const kk = Math.max(0, (k * 0.7 - delay) / 0.4);
            if (kk <= 0 || kk >= 1) return;
            const mx = sx + 40 - kk * 40;
            const my = -20 + kk * (y + 20);
            ctx.fillStyle = "#ff8020";
            ctx.fillRect(Math.round(mx) - 3, Math.round(my) - 3, 7, 7);
            ctx.fillStyle = "#fff0a0";
            ctx.fillRect(Math.round(mx) - 1, Math.round(my) - 1, 3, 3);
            ctx.fillStyle = "rgba(255,120,30,0.5)";
            ctx.fillRect(Math.round(mx) + 3, Math.round(my) - 7, 4, 4);
          });
        }
        this.shake = 0.6;
        this.flash = 0.5;
        this.flashColor = "#ffb060";
        this.burst(x, y, 30, ["#ff3010", "#ff8020", "#ffd040"], { speed: 120, life: 0.8 });
        return 0.6;
      case "flash":
        this.flash = 0.6;
        this.flashColor = "#ffffff";
        return 0.25;
      default:
        this.burst(x, y, 8, ["#ffffff"], { speed: 60, life: 0.3 });
        return 0.15;
    }
  }
}
