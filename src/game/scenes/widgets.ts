import { audio } from "../engine/audio";
import { drawText } from "../engine/font";
import { Ctx, drawHand } from "../engine/gfx";
import type { Input } from "../engine/input";

export interface MenuItem {
  label: string;
  right?: string;
  color?: string;
  disabled?: boolean;
  value?: unknown;
}

/** Scrollable vertical list with a pointing-glove cursor. */
export class ListMenu {
  sel = 0;
  scroll = 0;
  constructor(public items: MenuItem[], public visible = 8, public rowH = 12) {}

  setItems(items: MenuItem[]) {
    this.items = items;
    this.sel = Math.min(this.sel, Math.max(0, items.length - 1));
    this.clampScroll();
  }

  get current(): MenuItem | undefined {
    return this.items[this.sel];
  }

  private clampScroll() {
    if (this.sel < this.scroll) this.scroll = this.sel;
    if (this.sel >= this.scroll + this.visible) this.scroll = this.sel - this.visible + 1;
    this.scroll = Math.max(0, Math.min(this.scroll, Math.max(0, this.items.length - this.visible)));
  }

  /** Returns "confirm" | "cancel" | null. Disabled items still confirm; callers decide. */
  update(input: Input, cancelable = true): "confirm" | "cancel" | null {
    const n = this.items.length;
    if (n > 0) {
      if (input.repeat("up")) {
        this.sel = (this.sel + n - 1) % n;
        audio.sfx("cursor");
      }
      if (input.repeat("down")) {
        this.sel = (this.sel + 1) % n;
        audio.sfx("cursor");
      }
    }
    this.clampScroll();
    if (input.pressed("confirm") && n > 0) {
      if (this.current?.disabled) audio.sfx("error");
      else audio.sfx("confirm");
      return "confirm";
    }
    if (cancelable && (input.pressed("cancel") || input.pressed("menu"))) {
      audio.sfx("cancel");
      return "cancel";
    }
    return null;
  }

  draw(ctx: Ctx, x: number, y: number, w: number, t: number, active = true) {
    const end = Math.min(this.items.length, this.scroll + this.visible);
    for (let i = this.scroll; i < end; i++) {
      const it = this.items[i];
      const yy = y + (i - this.scroll) * this.rowH;
      const col = it.disabled ? "#707890" : it.color ?? "#ffffff";
      drawText(ctx, it.label, x + 14, yy, { color: col });
      if (it.right) drawText(ctx, it.right, x + w, yy, { color: it.disabled ? "#707890" : "#c8d0f0", align: "right" });
    }
    if (this.items.length && active) drawHand(ctx, x + 10, y + (this.sel - this.scroll) * this.rowH + 3, t);
    else if (this.items.length) drawHand(ctx, x + 10, y + (this.sel - this.scroll) * this.rowH + 3, 0);
    if (this.scroll > 0) drawText(ctx, "↑", x + w - 4, y - 9, { color: "#ffe080" });
    if (end < this.items.length) drawText(ctx, "↓", x + w - 4, y + this.visible * this.rowH - 2, { color: "#ffe080" });
  }
}

/** Starfield used behind the title and cutscenes. */
export class Starfield {
  stars: { x: number; y: number; z: number; tw: number }[] = [];
  constructor(n = 120, w = 384, h = 216) {
    let s = 1234567;
    const rnd = () => ((s = (s * 16807) % 2147483647) / 2147483647);
    for (let i = 0; i < n; i++) this.stars.push({ x: rnd() * w, y: rnd() * h, z: 0.2 + rnd() * 0.8, tw: rnd() * 6 });
  }
  draw(ctx: Ctx, t: number, drift = 6, w = 384, h = 216) {
    for (const st of this.stars) {
      const x = (st.x - t * drift * st.z + w * 10) % w;
      const b = 0.4 + 0.6 * Math.abs(Math.sin(t * 1.5 + st.tw)) * st.z;
      ctx.fillStyle = `rgba(${200 + st.z * 55},${200 + st.z * 55},255,${b})`;
      ctx.fillRect(Math.floor(x), Math.floor(st.y), st.z > 0.85 ? 2 : 1, st.z > 0.85 ? 2 : 1);
    }
  }
}

/** A big faceted crystal drawn procedurally (title screen, cutscenes, finale). */
export function drawBigCrystal(ctx: Ctx, cx: number, cy: number, size: number, t: number, hue = 200) {
  const h = size * 2;
  const top = Math.round(cy - h / 2 + Math.sin(t * 1.3) * 3);
  // halo
  for (let i = 6; i > 0; i--) {
    ctx.fillStyle = `hsla(${hue},90%,70%,${0.025 * i})`;
    ctx.beginPath();
    ctx.ellipse(cx, top + h / 2, size * 0.6 + i * 6, size * 1.0 + i * 6, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  const upper = Math.round(h * 0.38);
  for (let i = 0; i < h; i++) {
    const half = i < upper ? Math.round((i / upper) * size * 0.5) : Math.round(((h - 1 - i) / (h - upper)) * size * 0.5);
    if (half <= 0) continue;
    const shimmer = Math.sin(t * 2.4 + i * 0.12) * 7;
    const y = top + i;
    ctx.fillStyle = "#0c0818";
    ctx.fillRect(cx - half - 1, y, half * 2 + 2, 1);
    ctx.fillStyle = `hsl(${hue},80%,${80 + shimmer}%)`;
    ctx.fillRect(cx - half, y, Math.ceil(half * 0.45), 1);
    ctx.fillStyle = `hsl(${hue + 10},75%,${62 + shimmer}%)`;
    ctx.fillRect(cx - half + Math.ceil(half * 0.45), y, Math.ceil(half * 0.55), 1);
    ctx.fillStyle = `hsl(${hue + 25},70%,${44 + shimmer}%)`;
    ctx.fillRect(cx, y, Math.ceil(half * 0.6), 1);
    ctx.fillStyle = `hsl(${hue + 35},70%,${30 + shimmer}%)`;
    ctx.fillRect(cx + Math.ceil(half * 0.6), y, half - Math.ceil(half * 0.6), 1);
  }
  // glints
  const g = (Math.sin(t * 3) + 1) / 2;
  ctx.fillStyle = `rgba(255,255,255,${0.5 + g * 0.5})`;
  ctx.fillRect(cx - Math.round(size * 0.22), top + Math.round(h * 0.3), 2, Math.round(size * 0.35));
  ctx.fillRect(cx - Math.round(size * 0.16), top + Math.round(h * 0.25), 1, 3);
}
