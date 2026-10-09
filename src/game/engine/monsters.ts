// Procedural monster sprites. Each archetype paints a rough silhouette from
// random parameters onto half a grid; the result is mirrored, roughened,
// outlined, shaded with a top-left light, then given eyes, mouths and markings.

import { makeCanvas } from "./gfx";
import { RNG } from "./rng";

export type Archetype = "beast" | "humanoid" | "floater" | "blob" | "insect" | "serpent" | "plant" | "construct";
export const ARCHETYPES: Archetype[] = ["beast", "humanoid", "floater", "blob", "insect", "serpent", "plant", "construct"];

export interface MonsterPalette {
  hue: number;
  sat: number;
  hue2: number;
  eye: string;
}

function hsl(h: number, s: number, l: number): string {
  h = ((h % 360) + 360) % 360;
  s = Math.max(0, Math.min(100, s)) / 100;
  l = Math.max(0, Math.min(100, l)) / 100;
  const k = (n: number) => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  const to = (x: number) => Math.round(x * 255).toString(16).padStart(2, "0");
  return `#${to(f(0))}${to(f(8))}${to(f(4))}`;
}

export function randomPalette(r: RNG, hueHint?: number): MonsterPalette {
  const hue = hueHint !== undefined ? hueHint + r.int(-25, 25) : r.int(0, 359);
  return {
    hue,
    sat: r.int(35, 75),
    hue2: hue + r.pick([30, 150, 180, 200, -40]),
    eye: r.pick(["#ffffff", "#ffe040", "#ff3030", "#40ff80", "#40e0ff"]),
  };
}

class Grid {
  d: Uint8Array;
  constructor(public w: number, public h: number) {
    this.d = new Uint8Array(w * h);
  }
  get(x: number, y: number) {
    if (x < 0 || y < 0 || x >= this.w || y >= this.h) return 0;
    return this.d[y * this.w + x];
  }
  set(x: number, y: number, v: number) {
    x = Math.round(x);
    y = Math.round(y);
    if (x < 0 || y < 0 || x >= this.w || y >= this.h) return;
    this.d[y * this.w + x] = v;
  }
  ellipse(cx: number, cy: number, rx: number, ry: number, v = 1) {
    for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++)
      for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) {
        const dx = (x + 0.5 - cx) / Math.max(0.5, rx);
        const dy = (y + 0.5 - cy) / Math.max(0.5, ry);
        if (dx * dx + dy * dy <= 1) this.set(x, y, v);
      }
  }
  rect(x0: number, y0: number, w: number, h: number, v = 1) {
    for (let y = Math.round(y0); y < Math.round(y0 + h); y++) for (let x = Math.round(x0); x < Math.round(x0 + w); x++) this.set(x, y, v);
  }
  line(x0: number, y0: number, x1: number, y1: number, thick = 1, v = 1) {
    const steps = Math.max(1, Math.ceil(Math.hypot(x1 - x0, y1 - y0) * 2));
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const x = x0 + (x1 - x0) * t;
      const y = y0 + (y1 - y0) * t;
      if (thick <= 1) this.set(x, y, v);
      else this.ellipse(x, y, thick / 2, thick / 2, v);
    }
  }
}

// Region codes painted into the mask: 1 body, 2 secondary (belly/markings), 3 horn/claw (light), 4 dark detail
type Painter = (g: Grid, r: RNG, S: number) => { eyeY: number; eyeDX: number; eyeSize: number; mouthY: number; cyclops?: boolean; noEyes?: boolean };

const painters: Record<Archetype, Painter> = {
  blob: (g, r, S) => {
    const cx = S / 2;
    const ry = S * r.float(0.26, 0.36);
    const cy = S - ry - 1;
    g.ellipse(cx, cy, S * r.float(0.34, 0.46), ry);
    g.rect(cx - S * 0.36, cy, S * 0.72, ry, 1);
    const drips = r.int(1, 3);
    for (let i = 0; i < drips; i++) {
      const x = cx - S * r.float(0.05, 0.35);
      g.line(x, cy - ry * 0.2, x, cy - ry - r.float(1, S * 0.12), Math.max(1, S / 14));
    }
    if (r.chance(0.4)) g.ellipse(cx, cy + ry * 0.35, S * 0.2, ry * 0.4, 2);
    return { eyeY: cy - ry * 0.3, eyeDX: S * 0.12, eyeSize: S > 20 ? 2 : 1, mouthY: cy + ry * 0.2 };
  },
  floater: (g, r, S) => {
    const cx = S / 2;
    const cy = S * r.float(0.34, 0.42);
    const rad = S * r.float(0.24, 0.32);
    g.ellipse(cx, cy, rad, rad * r.float(0.85, 1.05));
    const tent = r.int(2, 4);
    for (let i = 0; i < tent; i++) {
      const x = cx - (rad * 0.85 * (i + 0.5)) / tent;
      let px = x;
      let py = cy + rad * 0.6;
      const len = S * r.float(0.35, 0.55);
      const wob = r.float(-2, 2);
      for (let k = 1; k <= 6; k++) {
        const nx = x + Math.sin(k * 0.9 + i) * wob;
        const ny = cy + rad * 0.6 + (len * k) / 6;
        g.line(px, py, nx, ny, Math.max(1, (S / 12) * (1 - k / 8)), i % 2 ? 1 : 2);
        px = nx;
        py = ny;
      }
    }
    if (r.chance(0.5)) {
      // wings
      const wy = cy - rad * 0.2;
      g.line(cx - rad * 0.8, wy, cx - rad * 1.6, wy - rad * 0.8, Math.max(1, S / 10), 2);
      g.line(cx - rad * 1.6, wy - rad * 0.8, cx - rad * 1.4, wy + rad * 0.4, Math.max(1, S / 12), 2);
    }
    const cyclops = r.chance(0.55);
    return { eyeY: cy - rad * 0.1, eyeDX: cyclops ? 0 : rad * 0.4, eyeSize: cyclops ? Math.max(2, Math.round(S / 7)) : Math.max(1, Math.round(S / 16)), mouthY: cy + rad * 0.45, cyclops };
  },
  beast: (g, r, S) => {
    const cx = S / 2;
    const bodyY = S * r.float(0.6, 0.68);
    const bodyR = S * r.float(0.26, 0.34);
    g.ellipse(cx, bodyY, bodyR, S * 0.2);
    g.ellipse(cx, bodyY + S * 0.06, bodyR * 0.55, S * 0.13, 2);
    const headY = S * r.float(0.3, 0.38);
    const headR = S * r.float(0.16, 0.22);
    g.ellipse(cx, headY, headR * 1.1, headR);
    // snout
    g.ellipse(cx, headY + headR * 0.6, headR * 0.55, headR * 0.45, 2);
    // legs
    const legs = [cx - bodyR * 0.75, cx - bodyR * 0.3];
    for (const lx of legs) g.rect(lx - S * 0.05, bodyY + S * 0.1, S * 0.1, S - (bodyY + S * 0.1) - 1, 1);
    // ears / horns
    if (r.chance(0.5)) {
      g.line(cx - headR * 0.7, headY - headR * 0.6, cx - headR * 1.3, headY - headR * 1.6, Math.max(1, S / 14), 3);
    } else {
      g.ellipse(cx - headR * 0.8, headY - headR * 0.9, headR * 0.35, headR * 0.5, 1);
    }
    if (r.chance(0.4)) g.line(cx - bodyR, bodyY - S * 0.05, cx - bodyR - S * 0.12, bodyY - S * 0.25, Math.max(1, S / 14), 1); // tail-ish spike
    return { eyeY: headY - headR * 0.15, eyeDX: headR * 0.5, eyeSize: Math.max(1, Math.round(S / 18)), mouthY: headY + headR * 0.7 };
  },
  humanoid: (g, r, S) => {
    const cx = S / 2;
    const headR = S * r.float(0.11, 0.15);
    const headY = S * 0.12 + headR;
    g.ellipse(cx, headY, headR, headR * 1.05);
    const shoulderY = headY + headR + 1;
    const torsoW = S * r.float(0.16, 0.24);
    const torsoH = S * r.float(0.28, 0.34);
    g.rect(cx - torsoW, shoulderY, torsoW * 2, torsoH, 1);
    g.rect(cx - torsoW * 0.6, shoulderY + 2, torsoW * 1.2, torsoH * 0.6, 2);
    // arms
    const armLen = S * r.float(0.25, 0.35);
    const ang = r.float(0.3, 1.1);
    g.line(cx - torsoW, shoulderY + 1, cx - torsoW - Math.sin(ang) * armLen, shoulderY + 1 + Math.cos(ang) * armLen, Math.max(1, S / 12), 1);
    // legs
    const hipY = shoulderY + torsoH;
    g.rect(cx - torsoW * 0.9, hipY, torsoW * 0.7, S - hipY - 1, 1);
    // ears or horns
    if (r.chance(0.6)) g.line(cx - headR * 0.8, headY - headR * 0.3, cx - headR * 1.8, headY - headR * r.float(0.2, 1.4), Math.max(1, S / 16), r.chance(0.5) ? 3 : 1);
    if (r.chance(0.35)) g.rect(cx - torsoW * 1.1, shoulderY - 1, torsoW * 0.5, 3, 3); // pauldron
    return { eyeY: headY - headR * 0.05, eyeDX: headR * 0.45, eyeSize: 1, mouthY: headY + headR * 0.55 };
  },
  insect: (g, r, S) => {
    const cx = S / 2;
    const headY = S * 0.22;
    g.ellipse(cx, headY, S * 0.12, S * 0.1);
    g.ellipse(cx, S * 0.42, S * 0.15, S * 0.13);
    g.ellipse(cx, S * 0.7, S * r.float(0.18, 0.26), S * 0.2, 1);
    for (let i = 0; i < 3; i++) g.rect(cx - S * 0.2, S * (0.62 + i * 0.09), S * 0.4, 1, 2);
    for (let i = 0; i < 3; i++) {
      const y = S * (0.38 + i * 0.08);
      const x2 = cx - S * r.float(0.32, 0.45);
      g.line(cx - S * 0.12, y, x2, y - S * 0.06, 1, 4);
      g.line(x2, y - S * 0.06, x2 - S * 0.04, y + S * 0.12, 1, 4);
    }
    g.line(cx - S * 0.05, headY - S * 0.08, cx - S * 0.2, headY - S * 0.22, 1, 4);
    if (r.chance(0.5)) {
      g.ellipse(cx - S * 0.26, S * 0.4, S * 0.14, S * 0.22, 2);
    }
    return { eyeY: headY - S * 0.01, eyeDX: S * 0.06, eyeSize: Math.max(1, Math.round(S / 16)), mouthY: headY + S * 0.06 };
  },
  serpent: (g, r, S) => {
    // coiled front view: stacked coils, a rising neck, a hooded head
    const cx = S / 2;
    const base = S - 2;
    const coils = r.int(2, 3);
    let y = base;
    let rx = S * r.float(0.36, 0.44);
    for (let i = 0; i < coils; i++) {
      const ry = S * 0.09;
      g.ellipse(cx, y - ry, rx, ry, 1);
      g.ellipse(cx, y - ry * 0.6, rx * 0.7, ry * 0.4, 2);
      y -= ry * 1.5;
      rx *= 0.78;
    }
    const neckW = S * r.float(0.09, 0.12);
    const headY = S * r.float(0.24, 0.32);
    g.rect(cx - neckW, headY, neckW * 2, y - headY, 1);
    g.rect(cx - neckW * 0.5, headY + 2, neckW, y - headY - 2, 2);
    if (r.chance(0.6)) g.ellipse(cx, headY + S * 0.06, S * 0.2, S * 0.13, 2); // hood
    g.ellipse(cx, headY, S * 0.13, S * 0.1, 1);
    return { eyeY: headY - S * 0.03, eyeDX: S * 0.06, eyeSize: Math.max(1, Math.round(S / 20)), mouthY: headY + S * 0.05 };
  },
  plant: (g, r, S) => {
    const cx = S / 2;
    g.rect(cx - 1, S * 0.45, 2, S * 0.55, 4);
    const leaves = r.int(1, 3);
    for (let i = 0; i < leaves; i++) {
      const y = S * (0.6 + i * 0.12);
      g.ellipse(cx - S * r.float(0.12, 0.22), y, S * 0.13, S * 0.05, 2);
    }
    const headY = S * r.float(0.28, 0.36);
    const headR = S * r.float(0.18, 0.24);
    const petals = r.int(4, 7);
    for (let i = 0; i < petals; i++) {
      const a = (i / petals) * Math.PI * 2;
      g.ellipse(cx + Math.cos(a) * headR, headY + Math.sin(a) * headR, headR * 0.45, headR * 0.45, 2);
    }
    g.ellipse(cx, headY, headR, headR, 1);
    g.rect(cx - S * 0.25, S - 3, S * 0.5, 2, 4);
    return { eyeY: headY - headR * 0.3, eyeDX: headR * 0.4, eyeSize: 1, mouthY: headY + headR * 0.35 };
  },
  construct: (g, r, S) => {
    const cx = S / 2;
    const headW = S * r.float(0.12, 0.18);
    const headY = S * 0.12;
    g.rect(cx - headW, headY, headW * 2, S * 0.18, 1);
    const bodyW = S * r.float(0.24, 0.32);
    const bodyY = headY + S * 0.2;
    g.rect(cx - bodyW, bodyY, bodyW * 2, S * 0.34, 1);
    g.rect(cx - bodyW * 0.5, bodyY + 2, bodyW, S * 0.12, 2);
    g.rect(cx - bodyW - S * 0.12, bodyY + 1, S * 0.12, S * 0.4, 1);
    g.rect(cx - bodyW - S * 0.14, bodyY + S * 0.38, S * 0.16, S * 0.08, 3);
    const legY = bodyY + S * 0.34;
    g.rect(cx - bodyW * 0.8, legY, bodyW * 0.55, S - legY - 1, 1);
    for (let y = Math.round(bodyY + 3); y < bodyY + S * 0.32; y += 4) g.rect(cx - bodyW + 1, y, 2, 1, 4);
    return { eyeY: headY + S * 0.07, eyeDX: headW * 0.45, eyeSize: 1, mouthY: headY + S * 0.14 };
  },
};

export interface MonsterSpriteOpts {
  size: number;
  boss?: boolean;
}

/** Generate a monster sprite. Same rng seed + archetype → same creature at any size. */
export function genMonster(seed: number, arch: Archetype, pal: MonsterPalette, opts: MonsterSpriteOpts): HTMLCanvasElement {
  const S = opts.size;
  const r = new RNG(seed);
  const g = new Grid(S, S);
  const feat = painters[arch](g, r, S);

  // Roughen edges (on the left half only, mirrored after)
  const half = Math.ceil(S / 2);
  const rough = new RNG(seed ^ 0x9e3779b9);
  for (let y = 0; y < S; y++)
    for (let x = 0; x < half; x++) {
      const v = g.get(x, y);
      const n = (g.get(x - 1, y) ? 1 : 0) + (g.get(x + 1, y) ? 1 : 0) + (g.get(x, y - 1) ? 1 : 0) + (g.get(x, y + 1) ? 1 : 0);
      if (v && n <= 2 && rough.chance(0.25)) g.set(x, y, 0);
      else if (!v && n >= 3 && rough.chance(0.3)) g.set(x, y, 1);
    }

  // Boss adornments: a pair of great horns rising above the eyes
  if (opts.boss) {
    const hx = S / 2 - Math.max(2, feat.eyeDX) - 2;
    const hy = feat.eyeY - 3;
    g.line(hx, hy, hx - S * 0.08, hy - S * 0.12, Math.max(2, S / 16), 3);
    g.line(hx - S * 0.08, hy - S * 0.12, hx - S * 0.04, hy - S * 0.22, Math.max(1, S / 24), 3);
  }

  // Mirror left half onto right
  for (let y = 0; y < S; y++) for (let x = 0; x < half; x++) g.set(S - 1 - x, y, g.get(x, y));

  // Asymmetric extra: humanoids sometimes hold a weapon in their right hand
  if (arch === "humanoid" && r.chance(0.6)) {
    const wx = S * 0.82;
    g.line(wx, S * 0.25, wx, S * 0.75, 1, 3);
    g.rect(wx - 2, S * 0.55, 5, 1, 4);
  }

  // Colors
  const light = hsl(pal.hue, pal.sat, 72);
  const mid = hsl(pal.hue, pal.sat, 52);
  const dark = hsl(pal.hue, pal.sat + 5, 34);
  const deep = hsl(pal.hue, pal.sat + 10, 20);
  const s2l = hsl(pal.hue2, pal.sat - 10, 70);
  const s2m = hsl(pal.hue2, pal.sat - 10, 52);
  const s2d = hsl(pal.hue2, pal.sat, 34);
  const horn = "#efe6cc";
  const hornD = "#a89a78";
  const detail = hsl(pal.hue, 20, 18);
  const outline = "#140c18";

  const [c, ctx] = makeCanvas(S, S);
  const filled = (x: number, y: number) => g.get(x, y) > 0;
  // markings via coarse noise
  const spotR = new RNG(seed ^ 0x51ed27);
  const spots = new Set<number>();
  if (spotR.chance(0.45)) for (let i = 0; i < S / 3; i++) {
    const sx = spotR.int(0, half);
    const sy = spotR.int(0, S - 1);
    spots.add(sy * S + sx);
    spots.add(sy * S + (S - 1 - sx));
  }

  for (let y = 0; y < S; y++)
    for (let x = 0; x < S; x++) {
      const v = g.get(x, y);
      if (!v) {
        if (filled(x - 1, y) || filled(x + 1, y) || filled(x, y - 1) || filled(x, y + 1)) {
          ctx.fillStyle = outline;
          ctx.fillRect(x, y, 1, 1);
        }
        continue;
      }
      const lit = !filled(x - 1, y - 1) || !filled(x, y - 1);
      const shade = !filled(x + 1, y + 1) || !filled(x, y + 1);
      const edge = !filled(x - 1, y) || !filled(x + 1, y);
      let col: string;
      if (v === 3) col = lit ? "#ffffff" : shade ? hornD : horn;
      else if (v === 4) col = detail;
      else if (v === 2) col = lit ? s2l : shade ? s2d : s2m;
      else col = lit ? light : shade ? deep : edge ? dark : mid;
      if (v === 1 && spots.has(y * S + x)) col = s2m;
      ctx.fillStyle = col;
      ctx.fillRect(x, y, 1, 1);
      if (v === 1 && y > S * 0.75 && !lit) {
        ctx.fillStyle = "rgba(0,0,0,0.18)";
        ctx.fillRect(x, y, 1, 1);
      }
    }

  // Eyes
  if (!feat.noEyes) {
    const es = feat.eyeSize;
    const ey = Math.round(feat.eyeY);
    const drawEye = (ex: number) => {
      ctx.fillStyle = outline;
      ctx.fillRect(ex - 1, ey - 1, es + 2, es + 2);
      ctx.fillStyle = pal.eye;
      ctx.fillRect(ex, ey, es, es);
      if (es >= 2) {
        ctx.fillStyle = "#101010";
        ctx.fillRect(ex + Math.floor(es / 2), ey + Math.floor(es / 3), Math.max(1, Math.floor(es / 2)), Math.max(1, Math.ceil(es / 2)));
      }
    };
    if (feat.cyclops) drawEye(Math.round(S / 2 - es / 2));
    else {
      const dx = Math.max(1, Math.round(feat.eyeDX));
      const left = Math.round(S / 2 - dx - es / 2);
      drawEye(left);
      drawEye(S - es - left);
    }
  }
  // Mouth with fangs
  if (S >= 20 && r.chance(0.7)) {
    const my = Math.round(feat.mouthY);
    const mw = Math.max(2, Math.round(S * r.float(0.08, 0.16)));
    ctx.fillStyle = "#200810";
    ctx.fillRect(Math.round(S / 2 - mw), my, mw * 2, 1 + (S >= 40 ? 1 : 0));
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(Math.round(S / 2 - mw), my, 1, 1);
    ctx.fillRect(Math.round(S / 2 + mw - 1), my, 1, 1);
  }
  return c;
}
