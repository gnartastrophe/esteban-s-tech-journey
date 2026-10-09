// Procedural tile textures and battle backdrops for each floor theme.

import { mix } from "./font";
import { H, makeCanvas, TILE, W } from "./gfx";
import { RNG } from "./rng";

export type FloorPattern = "flagstone" | "cave" | "checker" | "planks" | "moss" | "grate" | "carpet" | "crystal";
export type WallStyle = "brick" | "rock" | "panel" | "ice";

export interface Theme {
  id: string;
  label: string;
  floor: [string, string, string];
  wall: [string, string, string]; // light, base, mortar/dark
  top: string;
  pattern: FloorPattern;
  wallStyle: WallStyle;
  sky: [string, string];
  ambient: number; // 0 = pitch black outside light, 1 = fully lit
  monsterHue: number;
  safeFloor: [string, string];
}

export const THEMES: Theme[] = [
  { id: "crypt", label: "stone crypt", floor: ["#5a5668", "#4c4858", "#3a3644"], wall: ["#8a8498", "#6a6478", "#2c2836"], top: "#1c1a24", pattern: "flagstone", wallStyle: "brick", sky: ["#141020", "#2c2840"], ambient: 0.3, monsterHue: 260, safeFloor: ["#7a5a3a", "#6a4a2c"] },
  { id: "fungal", label: "fungal cavern", floor: ["#3c4a44", "#33403a", "#28322e"], wall: ["#6a5a88", "#4c3e68", "#221a30"], top: "#120e1a", pattern: "moss", wallStyle: "rock", sky: ["#0c1418", "#28203c"], ambient: 0.22, monsterHue: 290, safeFloor: ["#5a4a3a", "#4a3c2e"] },
  { id: "frost", label: "frozen vault", floor: ["#a8c4dc", "#94b2cc", "#7898b4"], wall: ["#d8ecf8", "#9cc0dc", "#4a6a8c"], top: "#1a2a3c", pattern: "flagstone", wallStyle: "ice", sky: ["#0c1828", "#3a5a80"], ambient: 0.42, monsterHue: 200, safeFloor: ["#8a6a4a", "#7a5a3c"] },
  { id: "inferno", label: "magma works", floor: ["#4a3430", "#3e2a26", "#2c1c1a"], wall: ["#8a4a34", "#6a3424", "#2a1210"], top: "#140808", pattern: "cave", wallStyle: "rock", sky: ["#200808", "#602010"], ambient: 0.35, monsterHue: 15, safeFloor: ["#5a5a68", "#4c4c58"] },
  { id: "studio", label: "abandoned soundstage", floor: ["#3a3a48", "#2c2c38", "#1c1c26"], wall: ["#5a5a70", "#44445a", "#1c1c28"], top: "#0a0a10", pattern: "checker", wallStyle: "panel", sky: ["#08080c", "#20203a"], ambient: 0.28, monsterHue: 320, safeFloor: ["#6a3a4a", "#5a2c3c"] },
  { id: "sewer", label: "royal sewers", floor: ["#4a5444", "#3e483a", "#2c342a"], wall: ["#6c7c5c", "#566448", "#232a1c"], top: "#10140c", pattern: "grate", wallStyle: "brick", sky: ["#0c120c", "#2a3a24"], ambient: 0.25, monsterHue: 100, safeFloor: ["#6a5a4a", "#5a4a3c"] },
  { id: "palace", label: "drowned palace", floor: ["#7a2c3c", "#6a2432", "#4a1824"], wall: ["#d8b870", "#a88a48", "#4a3a1c"], top: "#1a1408", pattern: "carpet", wallStyle: "panel", sky: ["#100810", "#4a2030"], ambient: 0.4, monsterHue: 40, safeFloor: ["#3a5a7a", "#2c4a6a"] },
  { id: "mall", label: "dead shopping mall", floor: ["#c8b8a8", "#b8a898", "#8a7a6a"], wall: ["#e0a8b8", "#c08898", "#5a3a48"], top: "#1a1218", pattern: "checker", wallStyle: "panel", sky: ["#180c14", "#5a3a50"], ambient: 0.45, monsterHue: 330, safeFloor: ["#4a7a6a", "#3a6a5a"] },
  { id: "crystal", label: "crystal sanctum", floor: ["#3a2c5a", "#30244c", "#20183a"], wall: ["#9a8ae0", "#6a5ab8", "#241c48"], top: "#0c0818", pattern: "crystal", wallStyle: "ice", sky: ["#0a0618", "#3a2a7a"], ambient: 0.32, monsterHue: 270, safeFloor: ["#5a4a7a", "#4a3c6a"] },
];

export function themeById(id: string): Theme {
  return THEMES.find((t) => t.id === id) ?? THEMES[0];
}

type C = CanvasRenderingContext2D;

function px(ctx: C, x: number, y: number, c: string, w = 1, h = 1) {
  ctx.fillStyle = c;
  ctx.fillRect(x, y, w, h);
}

export function drawFloorTile(ctx: C, x: number, y: number, theme: Theme, r: RNG, safe = false) {
  const [a, b, d] = safe ? [theme.safeFloor[0], theme.safeFloor[1], mix(theme.safeFloor[1], "#000", 0.35)] : theme.floor;
  px(ctx, x, y, a, TILE, TILE);
  if (safe) {
    // wooden planks for safe rooms
    for (let i = 0; i < 4; i++) {
      px(ctx, x, y + i * 4 + 3, d, TILE, 1);
      const off = (i * 7 + (r.int(0, 3))) % 16;
      px(ctx, x + off, y + i * 4, d, 1, 3);
      if (r.chance(0.3)) px(ctx, x + r.int(1, 14), y + i * 4 + 1, b, 2, 1);
    }
    return;
  }
  switch (theme.pattern) {
    case "flagstone": {
      const ox = r.int(0, 1) * 8;
      px(ctx, x, y + 7, d, TILE, 1);
      px(ctx, x, y + 15, d, TILE, 1);
      px(ctx, x + ((ox + 4) % 16), y, d, 1, 7);
      px(ctx, x + ((ox + 12) % 16), y + 8, d, 1, 7);
      for (let i = 0; i < 5; i++) px(ctx, x + r.int(0, 15), y + r.int(0, 15), r.chance(0.5) ? b : d);
      if (r.chance(0.15)) {
        const cx = x + r.int(2, 12);
        const cy = y + r.int(2, 12);
        px(ctx, cx, cy, d, 2, 1);
        px(ctx, cx + 1, cy + 1, d, 2, 1);
      }
      break;
    }
    case "cave": {
      for (let i = 0; i < 14; i++) px(ctx, x + r.int(0, 15), y + r.int(0, 15), r.chance(0.5) ? b : d, r.int(1, 2), 1);
      if (r.chance(0.12)) {
        // glowing lava crack
        const cx = x + r.int(2, 10);
        const cy = y + r.int(3, 12);
        px(ctx, cx, cy, "#f06020", 3, 1);
        px(ctx, cx + 2, cy + 1, "#f8a030", 3, 1);
      }
      break;
    }
    case "moss": {
      for (let i = 0; i < 10; i++) px(ctx, x + r.int(0, 15), y + r.int(0, 15), r.chance(0.5) ? b : d, 2, 1);
      if (r.chance(0.2)) {
        const cx = x + r.int(3, 12);
        const cy = y + r.int(4, 12);
        px(ctx, cx, cy - 2, "#e0f0a0", 1, 2);
        px(ctx, cx - 1, cy - 3, "#c060e0", 3, 1);
      }
      if (r.chance(0.3)) px(ctx, x + r.int(0, 12), y + r.int(0, 14), "#4a6a4a", 4, 2);
      break;
    }
    case "checker": {
      const tx = Math.floor(x / 8);
      const ty = Math.floor(y / 8);
      for (let j = 0; j < 2; j++)
        for (let i = 0; i < 2; i++) if ((tx + i + ty + j) % 2 === 0) px(ctx, x + i * 8, y + j * 8, b, 8, 8);
      px(ctx, x, y + 15, d, TILE, 1);
      px(ctx, x + 15, y, d, 1, TILE);
      if (r.chance(0.2)) px(ctx, x + r.int(1, 13), y + r.int(1, 13), d, 2, 2);
      break;
    }
    case "planks":
      for (let i = 0; i < 4; i++) px(ctx, x, y + i * 4 + 3, d, TILE, 1);
      break;
    case "grate": {
      for (let i = 0; i < 6; i++) px(ctx, x + r.int(0, 15), y + r.int(0, 15), b, 1, 1);
      if (r.chance(0.18)) {
        px(ctx, x + 2, y + 2, d, 12, 12);
        for (let i = 0; i < 5; i++) px(ctx, x + 3 + i * 2 + 1, y + 3, "#1a2214", 1, 10);
        px(ctx, x + 2, y + 2, b, 12, 1);
      }
      break;
    }
    case "carpet": {
      px(ctx, x, y, b, TILE, 1);
      px(ctx, x, y + 8, b, TILE, 1);
      for (let i = 0; i < 16; i += 4) px(ctx, x + i + ((y / 16) % 2 ? 2 : 0), y + 4, "#c89a40", 1, 1);
      for (let i = 0; i < 6; i++) px(ctx, x + r.int(0, 15), y + r.int(0, 15), d);
      break;
    }
    case "crystal": {
      for (let i = 0; i < 8; i++) px(ctx, x + r.int(0, 15), y + r.int(0, 15), b, 2, 1);
      if (r.chance(0.18)) {
        const cx = x + r.int(3, 12);
        const cy = y + r.int(5, 13);
        px(ctx, cx, cy - 4, "#c8b8ff", 1, 4);
        px(ctx, cx + 1, cy - 2, "#8a7ae0", 1, 2);
        px(ctx, cx - 1, cy - 1, "#6a5ab8", 1, 1);
      }
      break;
    }
  }
}

export function drawWallFace(ctx: C, x: number, y: number, theme: Theme, r: RNG) {
  const [l, b, d] = theme.wall;
  px(ctx, x, y, b, TILE, TILE);
  switch (theme.wallStyle) {
    case "brick":
      for (let row = 0; row < 4; row++) {
        const yy = y + row * 4;
        px(ctx, x, yy + 3, d, TILE, 1);
        const off = row % 2 ? 4 : 0;
        for (let k = off; k < 16; k += 8) px(ctx, x + k, yy, d, 1, 3);
        px(ctx, x, yy, l, TILE, 1);
        if (r.chance(0.3)) px(ctx, x + r.int(1, 13), yy + 1, mix(b, d, 0.4), 2, 1);
      }
      break;
    case "rock":
      for (let i = 0; i < 18; i++) px(ctx, x + r.int(0, 15), y + r.int(0, 15), r.chance(0.5) ? l : d, r.int(1, 3), 1);
      px(ctx, x, y, l, TILE, 1);
      break;
    case "panel":
      px(ctx, x, y, l, TILE, 2);
      px(ctx, x + 1, y + 4, d, 6, 9);
      px(ctx, x + 9, y + 4, d, 6, 9);
      px(ctx, x + 2, y + 5, mix(b, l, 0.3), 4, 7);
      px(ctx, x + 10, y + 5, mix(b, l, 0.3), 4, 7);
      break;
    case "ice":
      for (let i = 0; i < 4; i++) {
        const xx = x + r.int(0, 13);
        px(ctx, xx, y + r.int(1, 8), l, 1, r.int(3, 7));
      }
      px(ctx, x, y, l, TILE, 1);
      for (let i = 0; i < 5; i++) px(ctx, x + r.int(0, 15), y + r.int(0, 15), "#ffffff");
      break;
  }
  // baseboard shadow
  px(ctx, x, y + 15, d, TILE, 1);
}

export function drawWallTop(ctx: C, x: number, y: number, theme: Theme, edges: { n: boolean; s: boolean; e: boolean; w: boolean }) {
  px(ctx, x, y, theme.top, TILE, TILE);
  const edge = mix(theme.wall[0], theme.top, 0.5);
  if (edges.s) px(ctx, x, y + 15, edge, TILE, 1);
  if (edges.n) px(ctx, x, y, edge, TILE, 1);
  if (edges.e) px(ctx, x + 15, y, edge, 1, TILE);
  if (edges.w) px(ctx, x, y, edge, 1, TILE);
}

export function drawStairs(ctx: C, x: number, y: number, theme: Theme) {
  px(ctx, x, y, "#08060c", TILE, TILE);
  for (let i = 0; i < 5; i++) {
    const c = mix(theme.wall[0], "#000000", i / 5);
    px(ctx, x + 1 + i, y + 1 + i * 3, c, 14 - i * 2, 2);
  }
  px(ctx, x, y, theme.wall[2], TILE, 1);
}

/** Battle backdrop: back wall, horizon, perspective floor. */
export function drawBattleBg(theme: Theme, seed: number): HTMLCanvasElement {
  const r = new RNG(seed);
  const [c, ctx] = makeCanvas(W, H);
  const horizon = 84;
  // back wall bands
  for (let y = 0; y < horizon; y += 2) px(ctx, 0, y, mix(theme.sky[0], theme.sky[1], y / horizon), W, 2);
  // wall texture strip
  const wallTop = 24;
  const wr = new RNG(seed + 7);
  for (let x = 0; x < W; x += 16) {
    const [wc, wx] = makeCanvas(16, 16);
    drawWallFace(wx, 0, 0, theme, wr);
    ctx.globalAlpha = 0.55;
    ctx.drawImage(wc, x, wallTop + 28, 16, 16);
    ctx.drawImage(wc, x, wallTop + 12, 16, 16);
    ctx.globalAlpha = 0.3;
    ctx.drawImage(wc, x, wallTop - 4, 16, 16);
    ctx.globalAlpha = 1;
  }
  // fade the top of the wall into darkness
  for (let y = 0; y < wallTop + 20; y += 2) {
    ctx.fillStyle = `rgba(0,0,0,${Math.max(0, 1 - y / (wallTop + 20))})`;
    ctx.fillRect(0, y, W, 2);
  }
  // pillars
  const pillars = r.int(2, 4);
  for (let i = 0; i < pillars; i++) {
    const px0 = Math.round((W / pillars) * (i + 0.5) + r.int(-20, 20));
    const pw = r.int(14, 22);
    for (let y = 0; y < horizon + 4; y++) {
      const shade = mix(theme.wall[1], "#000000", 0.25 + (1 - y / horizon) * 0.5);
      px(ctx, px0, y, shade, pw, 1);
      px(ctx, px0, y, mix(theme.wall[0], "#000", 0.3 + (1 - y / horizon) * 0.5), 2, 1);
      px(ctx, px0 + pw - 2, y, "#05050a", 2, 1);
    }
    px(ctx, px0 - 2, horizon - 2, theme.wall[2], pw + 4, 6);
  }
  // perspective floor
  const [fa, fb, fd] = theme.floor;
  for (let y = horizon; y < H; y++) {
    const t = (y - horizon) / (H - horizon);
    const band = Math.floor(Math.pow(t, 0.6) * 9);
    px(ctx, 0, y, band % 2 ? fa : fb, W, 1);
  }
  // converging lines
  ctx.strokeStyle = fd;
  ctx.lineWidth = 1;
  for (let i = -10; i <= 10; i++) {
    ctx.beginPath();
    ctx.moveTo(W / 2 + i * 20 + 0.5, horizon);
    ctx.lineTo(W / 2 + i * 70 + 0.5, H);
    ctx.stroke();
  }
  // light pools / props by theme
  if (theme.id === "studio" || theme.id === "mall") {
    for (let i = 0; i < 3; i++) {
      const sx = 60 + i * 130 + r.int(-20, 20);
      ctx.fillStyle = "rgba(255,240,200,0.06)";
      ctx.beginPath();
      ctx.moveTo(sx - 4, 0);
      ctx.lineTo(sx + 4, 0);
      ctx.lineTo(sx + 50, H);
      ctx.lineTo(sx - 50, H);
      ctx.fill();
    }
  }
  if (theme.id === "inferno") {
    for (let i = 0; i < 30; i++) px(ctx, r.int(0, W), r.int(horizon + 10, H), r.chance(0.5) ? "#f06020" : "#f8a030", r.int(2, 6), 1);
  }
  if (theme.id === "frost" || theme.id === "crystal") {
    for (let i = 0; i < 12; i++) {
      const x = r.int(0, W);
      const h = r.int(6, 20);
      const yb = horizon + r.int(-2, 10);
      for (let k = 0; k < h; k++) px(ctx, x - Math.floor((k * 3) / h), yb - h + k, mix(theme.wall[0], "#ffffff", 0.3), Math.max(1, Math.floor((k * 6) / h)), 1);
    }
  }
  // vignette
  for (let i = 0; i < 24; i++) {
    ctx.fillStyle = `rgba(0,0,0,${0.035})`;
    ctx.fillRect(0, 0, i * 2, H);
    ctx.fillRect(W - i * 2, 0, i * 2, H);
  }
  return c;
}
