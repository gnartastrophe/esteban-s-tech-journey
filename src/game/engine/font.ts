// Hand-built variable-width bitmap font (cap height 7px, 1px descender).
// Glyphs are rendered once per color into tiny canvases and cached.

const G: Record<string, string> = {
  A: ".###. #...# #...# ##### #...# #...# #...#",
  B: "####. #...# #...# ####. #...# #...# ####.",
  C: ".###. #...# #.... #.... #.... #...# .###.",
  D: "####. #...# #...# #...# #...# #...# ####.",
  E: "##### #.... #.... ####. #.... #.... #####",
  F: "##### #.... #.... ####. #.... #.... #....",
  G: ".###. #...# #.... #.### #...# #...# .####",
  H: "#...# #...# #...# ##### #...# #...# #...#",
  I: "### .#. .#. .#. .#. .#. ###",
  J: "..### ....# ....# ....# #...# #...# .###.",
  K: "#...# #..#. #.#.. ##... #.#.. #..#. #...#",
  L: "#.... #.... #.... #.... #.... #.... #####",
  M: "#...# ##.## #.#.# #.#.# #...# #...# #...#",
  N: "#...# #...# ##..# #.#.# #..## #...# #...#",
  O: ".###. #...# #...# #...# #...# #...# .###.",
  P: "####. #...# #...# ####. #.... #.... #....",
  Q: ".###. #...# #...# #...# #.#.# #..#. .##.#",
  R: "####. #...# #...# ####. #.#.. #..#. #...#",
  S: ".###. #...# #.... .###. ....# #...# .###.",
  T: "##### ..#.. ..#.. ..#.. ..#.. ..#.. ..#..",
  U: "#...# #...# #...# #...# #...# #...# .###.",
  V: "#...# #...# #...# #...# #...# .#.#. ..#..",
  W: "#...# #...# #...# #.#.# #.#.# #.#.# .#.#.",
  X: "#...# #...# .#.#. ..#.. .#.#. #...# #...#",
  Y: "#...# #...# .#.#. ..#.. ..#.. ..#.. ..#..",
  Z: "##### ....# ...#. ..#.. .#... #.... #####",
  a: ".... .... .##. ...# .### #..# .###",
  b: "#... #... ###. #..# #..# #..# ###.",
  c: ".... .... .### #... #... #... .###",
  d: "...# ...# .### #..# #..# #..# .###",
  e: ".... .... .##. #..# #### #... .###",
  f: "..## .#.. ###. .#.. .#.. .#.. .#..",
  g: ".... .... .### #..# #..# .### ...# .##.",
  h: "#... #... ###. #..# #..# #..# #..#",
  i: "# . # # # # #",
  j: "..# ... .## ..# ..# ..# ..# ##.",
  k: "#... #... #..# #.#. ##.. #.#. #..#",
  l: "#. #. #. #. #. #. .#",
  m: "..... ..... ##.#. #.#.# #.#.# #.#.# #.#.#",
  n: ".... .... ###. #..# #..# #..# #..#",
  o: ".... .... .##. #..# #..# #..# .##.",
  p: ".... .... ###. #..# #..# ###. #... #...",
  q: ".... .... .### #..# #..# .### ...# ...#",
  r: ".... .... #.## ##.. #... #... #...",
  s: ".... .... .### #... .##. ...# ###.",
  t: ".#.. .#.. ###. .#.. .#.. .#.. ..##",
  u: ".... .... #..# #..# #..# #..# .###",
  v: "..... ..... #...# #...# #...# .#.#. ..#..",
  w: "..... ..... #...# #...# #.#.# #.#.# .#.#.",
  x: ".... .... #..# #..# .##. #..# #..#",
  y: ".... .... #..# #..# #..# .### ...# .##.",
  z: ".... .... #### ..#. .#.. #... ####",
  "0": ".##. #..# #..# #..# #..# #..# .##.",
  "1": "..#. .##. ..#. ..#. ..#. ..#. .###",
  "2": ".##. #..# ...# ..#. .#.. #... ####",
  "3": "###. ...# ...# .##. ...# ...# ###.",
  "4": "..## .#.# #..# #### ...# ...# ...#",
  "5": "#### #... ###. ...# ...# #..# .##.",
  "6": ".##. #... #... ###. #..# #..# .##.",
  "7": "#### ...# ...# ..#. .#.. .#.. .#..",
  "8": ".##. #..# #..# .##. #..# #..# .##.",
  "9": ".##. #..# #..# .### ...# ...# .##.",
  ".": ". . . . . . #",
  ",": ".. .. .. .. .. .# #.",
  "!": "# # # # # . #",
  "?": ".##. #..# ...# ..#. .#.. .... .#..",
  ":": ". . # . . # .",
  ";": ".. .. .# .. .. .# #.",
  "'": "# # . . . . .",
  '"': "#.# #.# ... ... ... ... ...",
  "-": "... ... ... ### ... ... ...",
  "+": "... ... .#. ### .#. ... ...",
  "=": "... ... ### ... ### ... ...",
  "/": "..# ..# .#. .#. .#. #.. #..",
  "\\": "#.. #.. .#. .#. .#. ..# ..#",
  "(": ".# #. #. #. #. #. .#",
  ")": "#. .# .# .# .# .# #.",
  "[": "## #. #. #. #. #. ##",
  "]": "## .# .# .# .# .# ##",
  "*": "... #.# .#. #.# ... ... ...",
  "%": "##... ##..# ...#. ..#.. .#... #..## ...##",
  "&": ".##.. #..#. #.#.. .#... #.#.# #..#. .##.#",
  "#": ".#.#. ##### .#.#. .#.#. ##### .#.#. .....",
  $: "..#.. .#### #.#.. .###. ..#.# ####. ..#..",
  "@": ".###. #...# #.### #.#.# #.### #.... .###.",
  "<": "... ..# .#. #.. .#. ..# ...",
  ">": "... #.. .#. ..# .#. #.. ...",
  _: ".... .... .... .... .... .... ####",
  "~": ".... .... .#.# #.#. .... .... ....",
  "^": ".#. #.# ... ... ... ... ...",
  "`": "#. .# .. .. .. .. ..",
  "|": "# # # # # # #",
  "♥": "..... .#.#. ##### ##### .###. ..#.. .....",
  "★": "..#.. ..#.. ##### .###. .#.#. #...# .....",
  "•": ".. .. .. ## ## .. ..",
  "·": ". . . # . . .",
  "→": "..... ..#.. ...#. ##### ...#. ..#.. .....",
  "←": "..... ..#.. .#... ##### .#... ..#.. .....",
  "↑": "..#.. .###. #.#.# ..#.. ..#.. ..#.. .....",
  "↓": "..... ..#.. ..#.. ..#.. #.#.# .###. ..#..",
  "×": "... ... #.# .#. #.# ... ...",
  "…": "..... ..... ..... ..... ..... ..... #.#.#",
  "—": "..... ..... ..... ##### ..... ..... .....",
  "é": "..#. .#.. .##. #..# #### #... .###",
};

interface Glyph {
  rows: boolean[][];
  w: number;
}

const glyphs = new Map<string, Glyph>();
const DIGITS = "0123456789";

for (const [ch, def] of Object.entries(G)) {
  const rows = def.split(" ").map((r) => [...r].map((c) => c === "#"));
  let min = 99;
  let max = -1;
  for (const r of rows) r.forEach((on, x) => {
    if (on) { min = Math.min(min, x); max = Math.max(max, x); }
  });
  if (DIGITS.includes(ch)) { min = 0; max = rows[0].length - 1; }
  if (max < 0) { min = 0; max = 0; }
  glyphs.set(ch, { rows: rows.map((r) => r.slice(min, max + 1)), w: max - min + 1 });
}

export const LINE_H = 10;
const SPACE_W = 3;
const cache = new Map<string, HTMLCanvasElement>();

function glyphCanvas(ch: string, color: string): HTMLCanvasElement | null {
  const key = ch + "|" + color;
  let c = cache.get(key);
  if (c) return c;
  const g = glyphs.get(ch) ?? glyphs.get(ch.toUpperCase()) ?? glyphs.get("?");
  if (!g) return null;
  c = pixelCanvas(g.w, 8);
  const x = c.getContext("2d")!;
  x.fillStyle = color;
  g.rows.forEach((r, y) => r.forEach((on, gx) => on && x.fillRect(gx, y, 1, 1)));
  cache.set(key, c);
  return c;
}

function advance(ch: string): number {
  if (ch === " ") return SPACE_W + 1;
  const g = glyphs.get(ch) ?? glyphs.get(ch.toUpperCase()) ?? glyphs.get("?");
  return (g ? g.w : 3) + 1;
}

export function measure(text: string): number {
  let w = 0;
  for (const ch of text) w += advance(ch);
  return Math.max(0, w - 1);
}

export interface TextOpts {
  color?: string;
  shadow?: string | null;
  align?: "left" | "center" | "right";
  scale?: number;
}

export function drawText(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, opts: TextOpts = {}): number {
  const color = opts.color ?? "#ffffff";
  const shadow = opts.shadow === undefined ? "#101020" : opts.shadow;
  const scale = opts.scale ?? 1;
  const w = measure(text) * scale;
  let cx = Math.round(opts.align === "center" ? x - w / 2 : opts.align === "right" ? x - w : x);
  const cy = Math.round(y);
  for (const ch of text) {
    if (ch !== " ") {
      if (shadow) {
        const s = glyphCanvas(ch, shadow);
        if (s) ctx.drawImage(s, cx + scale, cy + scale, s.width * scale, s.height * scale);
      }
      const g = glyphCanvas(ch, color);
      if (g) ctx.drawImage(g, cx, cy, g.width * scale, g.height * scale);
    }
    cx += advance(ch) * scale;
  }
  return w;
}

/** Word-wrap text to a pixel width. Honors explicit \n. */
export function wrap(text: string, maxW: number): string[] {
  const out: string[] = [];
  for (const para of text.split("\n")) {
    let line = "";
    for (const word of para.split(" ")) {
      const test = line ? line + " " + word : word;
      if (measure(test) > maxW && line) {
        out.push(line);
        line = word;
      } else line = test;
    }
    out.push(line);
  }
  return out;
}

/** Big outlined title text, drawn from the bitmap font at an integer scale with a vertical gradient. */
export function drawTitle(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, scale: number, top: string, bottom: string, outline = "#000000") {
  const w = measure(text) * scale;
  const h = 8 * scale;
  const pad = scale + 1;
  const off = pixelCanvas(w + pad * 2, h + pad * 2);
  const o = off.getContext("2d")!;
  // outline: stamp the text in 8 directions
  for (let dx = -1; dx <= 1; dx++)
    for (let dy = -1; dy <= 1; dy++) drawText(o, text, pad + dx * scale, pad + dy * scale, { color: outline, shadow: null, scale });
  // banded vertical gradient, masked by the glyphs in one composite pass
  const grad = pixelCanvas(off.width, off.height);
  const g = grad.getContext("2d")!;
  const bands = 7;
  for (let i = 0; i < bands; i++) {
    g.fillStyle = mix(top, bottom, i / (bands - 1));
    g.fillRect(0, pad + Math.floor((h / bands) * i), grad.width, Math.ceil(h / bands) + 1);
  }
  const fill = pixelCanvas(off.width, off.height);
  const f = fill.getContext("2d")!;
  drawText(f, text, pad, pad, { color: "#fff", shadow: null, scale });
  f.globalCompositeOperation = "source-in";
  f.drawImage(grad, 0, 0);
  o.drawImage(fill, 0, 0);
  ctx.drawImage(off, Math.round(x - off.width / 2), Math.round(y));
}

function pixelCanvas(w: number, h: number): HTMLCanvasElement {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  c.getContext("2d")!.imageSmoothingEnabled = false;
  return c;
}

export function mix(a: string, b: string, t: number): string {
  const pa = parseHex(a);
  const pb = parseHex(b);
  const r = Math.round(pa[0] + (pb[0] - pa[0]) * t);
  const g = Math.round(pa[1] + (pb[1] - pa[1]) * t);
  const bl = Math.round(pa[2] + (pb[2] - pa[2]) * t);
  return `rgb(${r},${g},${bl})`;
}

export function parseHex(c: string): [number, number, number] {
  if (c.startsWith("rgb")) {
    const m = c.match(/\d+/g)!.map(Number);
    return [m[0], m[1], m[2]];
  }
  let h = c.replace("#", "");
  if (h.length === 3) h = h.split("").map((x) => x + x).join("");
  const n = parseInt(h, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
