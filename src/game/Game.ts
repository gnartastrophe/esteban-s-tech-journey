// Main loop, scene stack, global notices (achievements/toasts), screen
// transitions and the async helpers scenes use to script conversations.

import { audio, Mood } from "./engine/audio";
import { drawText, measure, wrap } from "./engine/font";
import { Ctx, ditherFade, drawHand, drawSystemWindow, drawWindow, H, makeCanvas, setWindowTheme, W } from "./engine/gfx";
import { Input } from "./engine/input";
import { BOX_INFO } from "./data/items";
import type { Line } from "./gen/story";
import type { Notice, Run } from "./run";
import type { Settings } from "./types";

export interface Scene {
  opaque: boolean;
  update(dt: number): void;
  draw(ctx: Ctx): void;
  onEnter?(): void;
  onResume?(): void;
}

interface ActiveNotice {
  n: Notice;
  t: number;
  dur: number;
}

const SETTINGS_KEY = "finalfloor.settings.v1";

export class Game {
  readonly canvas: HTMLCanvasElement;
  readonly ctx: Ctx;
  readonly input = new Input();
  stack: Scene[] = [];
  run: Run | null = null;
  time = 0;
  settings: Settings;
  portraits = new Map<string, HTMLCanvasElement>();
  private notices: ActiveNotice[] = [];
  private banner: ActiveNotice | null = null;
  private fade = { amount: 0, target: 0, speed: 4, color: "#000", resolve: null as null | (() => void) };
  private raf = 0;
  private last = 0;
  private running = false;
  onExit: (() => void) | null = null;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    canvas.width = W;
    canvas.height = H;
    this.ctx = canvas.getContext("2d")!;
    this.ctx.imageSmoothingEnabled = false;
    this.settings = this.loadSettings();
    setWindowTheme(this.settings.windowTheme);
    audio.setVolumes(this.settings.music, this.settings.sfx);
    this.input.onGesture = () => audio.unlock();
  }

  start() {
    this.running = true;
    this.last = performance.now();
    const loop = (now: number) => {
      if (!this.running) return;
      const dt = Math.min(0.05, (now - this.last) / 1000);
      this.last = now;
      this.frame(dt);
      this.raf = requestAnimationFrame(loop);
    };
    this.raf = requestAnimationFrame(loop);
  }

  stop() {
    this.running = false;
    cancelAnimationFrame(this.raf);
    audio.stopMusic();
  }

  private frame(dt: number) {
    this.time += dt;
    this.input.update(dt);
    if (this.run) this.run.stats.timePlayed += dt;
    const top = this.stack[this.stack.length - 1];
    if (top && this.fade.amount < 0.5) top.update(dt);
    this.updateNotices(dt);
    this.updateFade(dt);
    this.draw();
    this.input.endFrame();
  }

  private draw() {
    const ctx = this.ctx;
    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, W, H);
    let from = this.stack.length - 1;
    while (from > 0 && !this.stack[from].opaque) from--;
    for (let i = Math.max(0, from); i < this.stack.length; i++) this.stack[i].draw(ctx);
    this.drawNotices(ctx);
    ditherFade(ctx, this.fade.amount, this.fade.color);
  }

  // ---------------------------------------------------------------- stack
  push(s: Scene) {
    this.stack.push(s);
    s.onEnter?.();
    this.input.consume();
  }

  pop(s?: Scene) {
    if (s) {
      const i = this.stack.lastIndexOf(s);
      if (i >= 0) this.stack.splice(i, 1);
    } else this.stack.pop();
    this.input.consume();
    this.stack[this.stack.length - 1]?.onResume?.();
  }

  top(): Scene | undefined {
    return this.stack[this.stack.length - 1];
  }

  /** Fade to black, replace the whole stack with a scene, fade back in. */
  async goto(s: Scene, color = "#000") {
    await this.fadeTo(1, color);
    this.stack = [];
    this.push(s);
    await this.fadeTo(0, color);
  }

  fadeTo(target: number, color = "#000", speed = 4): Promise<void> {
    return new Promise((res) => {
      this.fade.resolve?.();
      this.fade.target = target;
      this.fade.color = color;
      this.fade.speed = speed;
      this.fade.resolve = res;
    });
  }

  private updateFade(dt: number) {
    const f = this.fade;
    if (f.amount !== f.target) {
      const d = f.speed * dt;
      f.amount = f.amount < f.target ? Math.min(f.target, f.amount + d) : Math.max(f.target, f.amount - d);
    }
    if (f.amount === f.target && f.resolve) {
      const r = f.resolve;
      f.resolve = null;
      r();
    }
  }

  wait(sec: number): Promise<void> {
    return new Promise((res) => {
      const s: Scene = {
        opaque: false,
        update: (dt) => {
          sec -= dt;
          if (sec <= 0) {
            this.pop(s);
            res();
          }
        },
        draw: () => {},
      };
      this.push(s);
    });
  }

  // ---------------------------------------------------------------- dialogue helpers
  dialog(lines: Line[]): Promise<void> {
    return new Promise((res) => this.push(new DialogueScene(this, lines, res)));
  }

  choose(prompt: string | null, options: string[], speaker?: string, cancelIndex = -1): Promise<number> {
    return new Promise((res) => this.push(new ChoiceScene(this, prompt, options, res, speaker, cancelIndex)));
  }

  // ---------------------------------------------------------------- notices
  notify(n: Notice) {
    if (n.kind === "achievement") audio.sfx("achievement");
    if (n.kind === "viewers") audio.sfx("crowd");
    this.notices.push({ n, t: 0, dur: n.kind === "achievement" ? 3.8 : 2.4 });
  }

  toast(text: string, color?: string) {
    this.notify({ kind: "toast", text, color });
  }

  private updateNotices(dt: number) {
    if (this.banner) {
      this.banner.t += dt;
      if (this.banner.t >= this.banner.dur) this.banner = null;
    }
    if (!this.banner && this.notices.length) this.banner = this.notices.shift()!;
  }

  private drawNotices(ctx: Ctx) {
    const b = this.banner;
    if (!b) return;
    const inT = Math.min(1, b.t / 0.25);
    const outT = Math.min(1, Math.max(0, (b.dur - b.t) / 0.25));
    const k = Math.min(inT, outT);
    if (b.n.kind === "achievement") {
      const w = 300;
      const lines = wrap(b.n.desc, w - 16);
      const h = 26 + lines.length * 10;
      const x = (W - w) / 2;
      const y = -h + (h + 6) * easeOut(k);
      drawSystemWindow(ctx, x, y, w, h, this.time);
      drawText(ctx, "★ NEW ACHIEVEMENT! ★", W / 2, y + 5, { color: "#ffe040", align: "center" });
      drawText(ctx, b.n.title, W / 2, y + 15, { color: "#40f0e0", align: "center" });
      lines.forEach((l, i) => drawText(ctx, l, x + 8, y + 26 + i * 10, { color: "#e8e0ff" }));
      const info = BOX_INFO[b.n.reward];
      drawText(ctx, `+${info.label}`, x + w - 6, y + h - 11, { color: info.color, align: "right" });
    } else {
      const text = b.n.text;
      const w = Math.min(W - 20, measure(text) + 20);
      const x = (W - w) / 2;
      const y = -22 + 28 * easeOut(k);
      if (b.n.kind === "viewers") drawSystemWindow(ctx, x, y, w, 18, this.time);
      else drawWindow(ctx, x, y, w, 18);
      drawText(ctx, text, W / 2, y + 5, { color: b.n.kind === "viewers" ? "#ff80d0" : b.n.color ?? "#ffffff", align: "center" });
    }
  }

  // ---------------------------------------------------------------- settings / music
  music(mood: Mood, salt = 0) {
    const base = this.run ? this.run.seed.length * 7919 + this.run.floorN * 131 : 7;
    let h = 0;
    for (const ch of (this.run?.seed ?? "title") + mood) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
    audio.music(mood, (h + base + salt) >>> 0);
  }

  loadSettings(): Settings {
    const def: Settings = { music: 0.55, sfx: 0.7, battleMode: "wait", battleSpeed: 2, windowTheme: 0, textSpeed: 2 };
    try {
      const raw = localStorage.getItem(SETTINGS_KEY);
      if (raw) return { ...def, ...JSON.parse(raw) };
    } catch {
      /* private mode */
    }
    return def;
  }

  saveSettings() {
    try {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(this.settings));
    } catch {
      /* ignore */
    }
    setWindowTheme(this.settings.windowTheme);
    audio.setVolumes(this.settings.music, this.settings.sfx);
  }
}

export function easeOut(t: number) {
  return 1 - Math.pow(1 - Math.max(0, Math.min(1, t)), 3);
}

// =====================================================================
// Dialogue box

export class DialogueScene implements Scene {
  opaque = false;
  private i = 0;
  private shown = 0;
  private lines: string[] = [];
  private page = 0;
  private pages: string[][] = [];
  private t = 0;

  constructor(private game: Game, private script: Line[], private done: () => void) {
    this.prepare();
  }

  private get line(): Line {
    return this.script[this.i];
  }

  private boxWidth() {
    const l = this.line;
    if (l.style === "system") return 300;
    if (l.style === "narration") return 320;
    return this.game.portraits.has(l.speaker) ? W - 16 - 40 : W - 16;
  }

  private prepare() {
    if (!this.line) return;
    const w = this.boxWidth() - 20;
    this.lines = wrap(this.line.text, w);
    const per = this.line.style === "narration" ? 8 : this.line.style === "system" ? 6 : 4;
    this.pages = [];
    for (let k = 0; k < this.lines.length; k += per) this.pages.push(this.lines.slice(k, k + per));
    this.page = 0;
    this.shown = 0;
  }

  update(dt: number) {
    const inp = this.game.input;
    this.t += dt;
    const total = this.pages[this.page]?.join("").length ?? 0;
    const speed = [30, 55, 110][this.game.settings.textSpeed - 1] ?? 55;
    if (this.shown < total) {
      const before = Math.floor(this.shown);
      this.shown = Math.min(total, this.shown + dt * speed);
      if (Math.floor(this.shown) !== before && Math.floor(this.shown) % 3 === 0) audio.sfx("text");
      if (inp.pressed("confirm") || inp.pressed("cancel")) this.shown = total;
      return;
    }
    if (inp.pressed("confirm") || inp.pressed("cancel")) {
      audio.sfx("cursor");
      if (this.page < this.pages.length - 1) {
        this.page++;
        this.shown = 0;
        return;
      }
      this.i++;
      if (this.i >= this.script.length) {
        this.game.pop(this);
        this.done();
        return;
      }
      this.prepare();
    }
  }

  draw(ctx: Ctx) {
    const l = this.line;
    if (!l) return;
    const page = this.pages[this.page] ?? [];
    let budget = Math.floor(this.shown);
    const visible = page.map((ln) => {
      const s = ln.slice(0, Math.max(0, budget));
      budget -= ln.length;
      return s;
    });
    const done = Math.floor(this.shown) >= page.join("").length;
    const blink = done && Math.floor(this.game.time * 3) % 2 === 0;
    if (l.style === "narration") {
      ctx.fillStyle = "rgba(0,0,0,0.7)";
      ctx.fillRect(0, 0, W, H);
      const top = H / 2 - (page.length * 11) / 2;
      visible.forEach((ln, k) => drawText(ctx, ln, W / 2 - 160, top + k * 11, { color: "#f0e8d8" }));
      if (blink) drawText(ctx, "↓", W - 24, H - 20, { color: "#f0e8d8" });
      return;
    }
    if (l.style === "system") {
      const w = 300;
      const h = 24 + page.length * 10 + 4;
      const x = (W - w) / 2;
      const y = 36;
      drawSystemWindow(ctx, x, y, w, h, this.game.time);
      drawText(ctx, `${this.game.run?.story.system.name.toUpperCase() ?? "SYSTEM"} MESSAGE`, x + 8, y + 6, { color: "#ff60ff" });
      visible.forEach((ln, k) => drawText(ctx, ln, x + 10, y + 20 + k * 10, { color: "#c8fff0" }));
      if (blink) drawText(ctx, "↓", x + w - 12, y + h - 12, { color: "#ffe040" });
      return;
    }
    const portrait = this.game.portraits.get(l.speaker);
    const x = 8;
    const y = H - 62;
    const w = W - 16;
    const h = 56;
    drawWindow(ctx, x, y, w, h);
    let tx = x + 10;
    if (portrait) {
      ctx.fillStyle = "rgba(0,0,0,0.25)";
      ctx.fillRect(x + 6, y + 8, 36, 42);
      ctx.drawImage(portrait, x + 8, y + 9, portrait.width * 2, portrait.height * 2);
      tx = x + 48;
    }
    if (l.speaker) {
      const nw = measure(l.speaker) + 14;
      drawWindow(ctx, x + 4, y - 14, nw, 16);
      drawText(ctx, l.speaker, x + 11, y - 10, { color: l.style === "villain" ? "#ff8080" : "#ffe080" });
    }
    visible.forEach((ln, k) => drawText(ctx, ln, tx, y + 8 + k * 11));
    if (blink) drawText(ctx, "↓", x + w - 12, y + h - 12, { color: "#ffffff" });
  }
}

// =====================================================================
// Choice box

export class ChoiceScene implements Scene {
  opaque = false;
  private sel = 0;
  constructor(
    private game: Game,
    private prompt: string | null,
    private options: string[],
    private done: (i: number) => void,
    private speaker?: string,
    private cancelIndex = -1,
  ) {}

  update() {
    const inp = this.game.input;
    if (inp.repeat("up")) {
      this.sel = (this.sel + this.options.length - 1) % this.options.length;
      audio.sfx("cursor");
    }
    if (inp.repeat("down")) {
      this.sel = (this.sel + 1) % this.options.length;
      audio.sfx("cursor");
    }
    if (inp.pressed("confirm")) {
      audio.sfx("confirm");
      this.game.pop(this);
      this.done(this.sel);
    } else if (this.cancelIndex >= 0 && (inp.pressed("cancel") || inp.pressed("menu"))) {
      audio.sfx("cancel");
      this.game.pop(this);
      this.done(this.cancelIndex);
    }
  }

  draw(ctx: Ctx) {
    const ow = Math.max(...this.options.map((o) => measure(o))) + 34;
    const oh = this.options.length * 12 + 10;
    let y = H - 62;
    if (this.prompt) {
      const lines = wrap(this.prompt, W - 36);
      const ph = lines.length * 11 + 12;
      drawWindow(ctx, 8, H - ph - 6, W - 16, ph);
      lines.forEach((l, i) => drawText(ctx, l, 18, H - ph + i * 11));
      if (this.speaker) {
        const nw = measure(this.speaker) + 14;
        drawWindow(ctx, 12, H - ph - 20, nw, 16);
        drawText(ctx, this.speaker, 19, H - ph - 16, { color: "#ffe080" });
      }
      y = H - ph - 10;
    }
    const x = W - ow - 12;
    const oy = y - oh - (this.speaker ? 8 : 0);
    drawWindow(ctx, x, oy, ow, oh);
    this.options.forEach((o, i) => drawText(ctx, o, x + 22, oy + 7 + i * 12, { color: i === this.sel ? "#ffffff" : "#b8c0e0" }));
    drawHand(ctx, x + 18, oy + 10 + this.sel * 12, this.game.time);
  }
}

export function snapshot(game: Game): HTMLCanvasElement {
  const [c, x] = makeCanvas(W, H);
  x.drawImage(game.canvas, 0, 0);
  return c;
}
