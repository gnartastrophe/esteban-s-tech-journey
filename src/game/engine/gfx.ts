import { drawText, mix, parseHex } from "./font";

export const W = 384;
export const H = 216;
export const TILE = 16;

export type Ctx = CanvasRenderingContext2D;

export function makeCanvas(w: number, h: number): [HTMLCanvasElement, Ctx] {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const ctx = c.getContext("2d")!;
  ctx.imageSmoothingEnabled = false;
  return [c, ctx];
}

/** Build a sprite from rows of palette keys. '.' is transparent. */
export function spriteFrom(rows: string[], pal: Record<string, string>, flip = false): HTMLCanvasElement {
  const h = rows.length;
  const w = Math.max(...rows.map((r) => r.length));
  const [c, ctx] = makeCanvas(w, h);
  rows.forEach((row, y) => {
    for (let x = 0; x < row.length; x++) {
      const k = row[x];
      if (k === "." || k === " ") continue;
      const col = pal[k];
      if (!col) continue;
      ctx.fillStyle = col;
      ctx.fillRect(flip ? w - 1 - x : x, y, 1, 1);
    }
  });
  return c;
}

export function flipCanvas(src: HTMLCanvasElement): HTMLCanvasElement {
  const [c, ctx] = makeCanvas(src.width, src.height);
  ctx.translate(src.width, 0);
  ctx.scale(-1, 1);
  ctx.drawImage(src, 0, 0);
  return c;
}

/** Solid-color silhouette of a sprite (used for hit flashes and shadows). */
export function tintCanvas(src: HTMLCanvasElement, color: string): HTMLCanvasElement {
  const [c, ctx] = makeCanvas(src.width, src.height);
  ctx.drawImage(src, 0, 0);
  ctx.globalCompositeOperation = "source-in";
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, c.width, c.height);
  return c;
}

// ---------------------------------------------------------------------------
// Windows: classic blue gradient boxes. The player can recolor them in Config.

export interface WindowTheme {
  name: string;
  top: string;
  bottom: string;
}

export const WINDOW_THEMES: WindowTheme[] = [
  { name: "Classic Blue", top: "#3a52c4", bottom: "#0c1460" },
  { name: "Crimson", top: "#a8323c", bottom: "#38080e" },
  { name: "Moss", top: "#3c8c4c", bottom: "#0a2c14" },
  { name: "Midnight", top: "#3c3c58", bottom: "#08080e" },
  { name: "Sponsor Gold", top: "#b48a28", bottom: "#3c2604" },
  { name: "Vaporwave", top: "#a03ca8", bottom: "#1c0c4c" },
];

let windowTheme = WINDOW_THEMES[0];
export function setWindowTheme(i: number) {
  windowTheme = WINDOW_THEMES[((i % WINDOW_THEMES.length) + WINDOW_THEMES.length) % WINDOW_THEMES.length];
}

export function drawWindow(ctx: Ctx, x: number, y: number, w: number, h: number, theme: WindowTheme = windowTheme, alpha = 1) {
  x = Math.round(x);
  y = Math.round(y);
  w = Math.round(w);
  h = Math.round(h);
  ctx.save();
  ctx.globalAlpha = alpha;
  // banded vertical gradient
  const band = 2;
  for (let i = 0; i < h; i += band) {
    ctx.fillStyle = mix(theme.top, theme.bottom, i / Math.max(1, h - 1));
    ctx.fillRect(x + 1, y + i, w - 2, Math.min(band, h - i));
  }
  ctx.globalAlpha = 1 * alpha;
  // border: dark outer, bright inner, grey shade, with cut corners
  ctx.fillStyle = "#0a0a14";
  ctx.fillRect(x + 2, y, w - 4, 1);
  ctx.fillRect(x + 2, y + h - 1, w - 4, 1);
  ctx.fillRect(x, y + 2, 1, h - 4);
  ctx.fillRect(x + w - 1, y + 2, 1, h - 4);
  ctx.fillRect(x + 1, y + 1, 1, 1);
  ctx.fillRect(x + w - 2, y + 1, 1, 1);
  ctx.fillRect(x + 1, y + h - 2, 1, 1);
  ctx.fillRect(x + w - 2, y + h - 2, 1, 1);
  ctx.fillStyle = "#e8e8f0";
  ctx.fillRect(x + 2, y + 1, w - 4, 1);
  ctx.fillRect(x + 1, y + 2, 1, h - 4);
  ctx.fillStyle = "#9898b0";
  ctx.fillRect(x + 2, y + h - 2, w - 4, 1);
  ctx.fillRect(x + w - 2, y + 2, 1, h - 4);
  // clear the outer corner pixels (outside the box)
  ctx.clearRect(x, y, 1, 1);
  ctx.restore();
}

/** A "System" notification panel: the dungeon AI's own garish UI. */
export function drawSystemWindow(ctx: Ctx, x: number, y: number, w: number, h: number, t = 0) {
  ctx.fillStyle = "#07060f";
  ctx.fillRect(x, y, w, h);
  const glow = 0.6 + 0.4 * Math.sin(t * 4);
  ctx.fillStyle = mix("#7a1fa8", "#f040ff", glow);
  ctx.fillRect(x, y, w, 1);
  ctx.fillRect(x, y + h - 1, w, 1);
  ctx.fillRect(x, y, 1, h);
  ctx.fillRect(x + w - 1, y, 1, h);
  ctx.fillStyle = "#2ee6d6";
  ctx.fillRect(x + 2, y + 2, w - 4, 1);
  ctx.fillRect(x + 2, y + h - 3, w - 4, 1);
  // scanlines
  ctx.fillStyle = "rgba(255,255,255,0.03)";
  for (let i = y + 4; i < y + h - 4; i += 2) ctx.fillRect(x + 1, i, w - 2, 1);
}

export function drawBar(ctx: Ctx, x: number, y: number, w: number, h: number, ratio: number, color: string, back = "#181828", hi?: string) {
  ratio = Math.max(0, Math.min(1, ratio));
  ctx.fillStyle = "#05050a";
  ctx.fillRect(x - 1, y - 1, w + 2, h + 2);
  ctx.fillStyle = back;
  ctx.fillRect(x, y, w, h);
  const fw = Math.round(w * ratio);
  ctx.fillStyle = color;
  ctx.fillRect(x, y, fw, h);
  if (h > 2 && fw > 0) {
    ctx.fillStyle = hi ?? lighten(color, 0.35);
    ctx.fillRect(x, y, fw, 1);
  }
}

export function lighten(c: string, t: number) {
  return mix(c, "#ffffff", t);
}
export function darken(c: string, t: number) {
  return mix(c, "#000000", t);
}

export function rgba(c: string, a: number) {
  const [r, g, b] = parseHex(c);
  return `rgba(${r},${g},${b},${a})`;
}

// ---------------------------------------------------------------------------
// Cursor (pointing glove)

const HAND = [
  ".####........",
  "#wwww########",
  "#wwwwwwwwwww#",
  "#wwwwwwwwwww#",
  "#wwww########",
  "#wgwwwg#.....",
  "#wwwwww#.....",
  "#wgwwg#......",
  ".#wwww#......",
  "..####.......",
];
let handCanvas: HTMLCanvasElement | null = null;
export function drawHand(ctx: Ctx, x: number, y: number, t = 0) {
  if (!handCanvas) handCanvas = spriteFrom(HAND, { "#": "#181820", w: "#f8f8f8", g: "#9090a0" });
  const bob = Math.round(Math.sin(t * 8) * 1);
  ctx.drawImage(handCanvas, Math.round(x - 13 + bob), Math.round(y - 4));
}

/** Text with a label/value pair right-aligned inside a width. */
export function drawPair(ctx: Ctx, label: string, value: string, x: number, y: number, w: number, lc = "#a8c8ff", vc = "#ffffff") {
  drawText(ctx, label, x, y, { color: lc });
  drawText(ctx, value, x + w, y, { color: vc, align: "right" });
}

export function formatNum(n: number): string {
  if (n >= 1e9) return (n / 1e9).toFixed(n >= 1e10 ? 0 : 1) + "B";
  if (n >= 1e6) return (n / 1e6).toFixed(n >= 1e7 ? 0 : 1) + "M";
  if (n >= 1e4) return (n / 1e3).toFixed(n >= 1e5 ? 0 : 1) + "K";
  return Math.floor(n).toLocaleString("en-US");
}

export function formatTime(sec: number): string {
  sec = Math.max(0, Math.floor(sec));
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

/** Ordered-dither threshold (4x4 Bayer) for retro fades. */
export const BAYER4 = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map((v) => (v + 0.5) / 16);

/** Fill the screen with a dithered fade of a color (amount 0..1). */
export function ditherFade(ctx: Ctx, amount: number, color = "#000") {
  if (amount <= 0) return;
  if (amount >= 1) {
    ctx.fillStyle = color;
    ctx.fillRect(0, 0, W, H);
    return;
  }
  ctx.fillStyle = color;
  const s = 2;
  for (let by = 0; by < 4; by++)
    for (let bx = 0; bx < 4; bx++) {
      if (BAYER4[by * 4 + bx] >= amount) continue;
      for (let y = by * s; y < H; y += 4 * s) for (let x = bx * s; x < W; x += 4 * s) ctx.fillRect(x, y, s, s);
    }
}
