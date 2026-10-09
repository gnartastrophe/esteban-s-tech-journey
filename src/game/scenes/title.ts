import { audio } from "../engine/audio";
import { drawText, drawTitle, wrap } from "../engine/font";
import { Ctx, drawBar, drawHand, drawWindow, H, W, WINDOW_THEMES } from "../engine/gfx";
import { randomSeedPhrase } from "../engine/rng";
import { classLook, heroFrames, HAIRS, petFrames, SKINS } from "../engine/sprites";
import { CLASSES, SPECIES } from "../data/classes";
import { Game, Scene } from "../Game";
import { genStory } from "../gen/story";
import { deleteSave, hasSave, loadRun, Run } from "../run";
import { beginFloor, introThenFloor, wireRun } from "./flow";
import { drawBigCrystal, ListMenu, Starfield } from "./widgets";

const stars = new Starfield(140);

export class TitleScene implements Scene {
  opaque = true;
  private menu: ListMenu;
  private t = 0;
  constructor(private game: Game) {
    this.menu = new ListMenu([], 5, 13);
    this.refresh();
  }

  private refresh() {
    const items = [];
    if (hasSave()) items.push({ label: "Continue", value: "continue" });
    items.push({ label: "New Crawl", value: "new" });
    items.push({ label: "Settings", value: "settings" });
    if (this.game.onExit) items.push({ label: "Exit to Portfolio", value: "exit" });
    this.menu.setItems(items);
  }

  onEnter() {
    this.game.run = null;
    this.game.music("title");
    this.refresh();
  }
  onResume() {
    this.refresh();
  }

  update(dt: number) {
    this.t += dt;
    const res = this.menu.update(this.game.input, false);
    if (res !== "confirm") return;
    const v = this.menu.current?.value;
    if (v === "new") this.game.push(new CreateScene(this.game));
    if (v === "settings") this.game.push(new SettingsScene(this.game));
    if (v === "exit") this.game.onExit?.();
    if (v === "continue") {
      const run = loadRun();
      if (!run) {
        audio.sfx("error");
        this.game.toast("Save data is corrupted. The System shrugs.");
        deleteSave();
        this.refresh();
        return;
      }
      wireRun(this.game, run);
      beginFloor(this.game, false);
    }
  }

  draw(ctx: Ctx) {
    const t = this.t;
    for (let y = 0; y < H; y += 2) {
      ctx.fillStyle = `rgb(${8 + y * 0.06},${6 + y * 0.04},${22 + y * 0.12})`;
      ctx.fillRect(0, y, W, 2);
    }
    stars.draw(ctx, t, 4);
    // planet horizon
    ctx.fillStyle = "#120c2a";
    ctx.beginPath();
    ctx.ellipse(W / 2, H + 120, 300, 170, 0, 0, Math.PI * 2);
    ctx.fill();
    for (let i = 0; i < 3; i++) {
      ctx.strokeStyle = `rgba(120,100,255,${0.25 - i * 0.07})`;
      ctx.beginPath();
      ctx.ellipse(W / 2, H + 120, 300 + i * 3, 170 + i * 3, 0, Math.PI * 1.08, Math.PI * 1.92);
      ctx.stroke();
    }
    drawBigCrystal(ctx, W / 2, 96, 34, t, 200 + Math.sin(t * 0.3) * 20);
    // broadcast drones circling the crystal
    for (let i = 0; i < 3; i++) {
      const a = t * 0.8 + (i * Math.PI * 2) / 3;
      const x = W / 2 + Math.cos(a) * 70;
      const y = 92 + Math.sin(a) * 18;
      ctx.fillStyle = "#606878";
      ctx.fillRect(Math.round(x) - 3, Math.round(y) - 2, 6, 4);
      ctx.fillStyle = Math.floor(t * 4 + i) % 2 ? "#ff3040" : "#601018";
      ctx.fillRect(Math.round(x) - 1, Math.round(y) - 1, 2, 2);
    }
    drawTitle(ctx, "FINAL FLOOR", W / 2, 14, 4, "#fff4c0", "#d08020", "#200c00");
    drawText(ctx, "~ A  CRAWL  FANTASY ~", W / 2, 54, { color: "#c8b8ff", align: "center" });
    const live = Math.floor(t * 2) % 2 === 0;
    ctx.fillStyle = live ? "#ff3040" : "#601018";
    ctx.fillRect(8, 8, 5, 5);
    drawText(ctx, "LIVE", 16, 7, { color: "#ff6070" });

    const mh = this.menu.items.length * 13 + 12;
    drawWindow(ctx, W / 2 - 64, 140, 128, mh);
    this.menu.draw(ctx, W / 2 - 58, 147, 116, t);
    drawText(ctx, "Arrows/WASD move  ·  Z/Enter confirm  ·  X back  ·  Esc menu", W / 2, H - 12, { color: "#8078a8", align: "center" });
  }
}

// =====================================================================

export class SettingsScene implements Scene {
  opaque = false;
  private sel = 0;
  constructor(private game: Game) {}

  private rows() {
    const s = this.game.settings;
    return [
      { label: "Music Volume", value: `${Math.round(s.music * 10)}` },
      { label: "Sound Effects", value: `${Math.round(s.sfx * 10)}` },
      { label: "Battle Mode", value: s.battleMode === "wait" ? "Wait" : "Active" },
      { label: "Battle Speed", value: ["", "Slow", "Normal", "Fast"][s.battleSpeed] },
      { label: "Text Speed", value: ["", "Slow", "Normal", "Fast"][s.textSpeed] },
      { label: "Window Color", value: WINDOW_THEMES[s.windowTheme].name },
      { label: "Done", value: "" },
    ];
  }

  update() {
    const inp = this.game.input;
    const s = this.game.settings;
    const n = this.rows().length;
    if (inp.repeat("up")) {
      this.sel = (this.sel + n - 1) % n;
      audio.sfx("cursor");
    }
    if (inp.repeat("down")) {
      this.sel = (this.sel + 1) % n;
      audio.sfx("cursor");
    }
    const d = inp.repeat("left") ? -1 : inp.repeat("right") || (inp.pressed("confirm") && this.sel < 6) ? 1 : 0;
    if (d) {
      switch (this.sel) {
        case 0:
          s.music = Math.max(0, Math.min(1, Math.round((s.music + d * 0.1) * 10) / 10));
          break;
        case 1:
          s.sfx = Math.max(0, Math.min(1, Math.round((s.sfx + d * 0.1) * 10) / 10));
          break;
        case 2:
          s.battleMode = s.battleMode === "wait" ? "active" : "wait";
          break;
        case 3:
          s.battleSpeed = ((s.battleSpeed - 1 + d + 3) % 3) + 1;
          break;
        case 4:
          s.textSpeed = ((s.textSpeed - 1 + d + 3) % 3) + 1;
          break;
        case 5:
          s.windowTheme = (s.windowTheme + d + WINDOW_THEMES.length) % WINDOW_THEMES.length;
          break;
      }
      this.game.saveSettings();
      audio.sfx("cursor");
    }
    if ((inp.pressed("confirm") && this.sel === 6) || inp.pressed("cancel") || inp.pressed("menu")) {
      audio.sfx("cancel");
      this.game.saveSettings();
      this.game.pop(this);
    }
  }

  draw(ctx: Ctx) {
    const w = 240;
    const rows = this.rows();
    const h = rows.length * 14 + 30;
    const x = (W - w) / 2;
    const y = (H - h) / 2;
    drawWindow(ctx, x, y, w, h);
    drawText(ctx, "SETTINGS", x + w / 2, y + 7, { color: "#ffe080", align: "center" });
    rows.forEach((r, i) => {
      const yy = y + 22 + i * 14;
      drawText(ctx, r.label, x + 22, yy, { color: i === this.sel ? "#ffffff" : "#b8c0e0" });
      if (r.value) drawText(ctx, (i === this.sel ? "← " : "") + r.value + (i === this.sel ? " →" : ""), x + w - 12, yy, { align: "right", color: "#c8f0ff" });
    });
    drawHand(ctx, x + 18, y + 25 + this.sel * 14, this.game.time);
  }
}

// =====================================================================

export class CreateScene implements Scene {
  opaque = true;
  private sel = 0;
  private name = "Esteban";
  private cls = 0;
  private skin = 1;
  private hair = 0;
  private seed = randomSeedPhrase();
  private t = 0;
  private preview = genStory(this.seed, this.name, CLASSES[0].id);

  constructor(private game: Game) {
    const names = ["Esteban", "Rook", "Juniper", "Mateo", "Wren", "Priya", "Kiko", "Hollis"];
    this.name = names[Math.floor(Math.random() * names.length)];
    this.refreshPreview();
  }

  private refreshPreview() {
    this.preview = genStory(this.seed, this.name, CLASSES[this.cls].id);
  }

  update(dt: number) {
    this.t += dt;
    const inp = this.game.input;
    const rows = 6;
    if (inp.repeat("up")) {
      this.sel = (this.sel + rows - 1) % rows;
      audio.sfx("cursor");
    }
    if (inp.repeat("down")) {
      this.sel = (this.sel + 1) % rows;
      audio.sfx("cursor");
    }
    const d = inp.repeat("left") ? -1 : inp.repeat("right") ? 1 : 0;
    if (d) {
      if (this.sel === 1) this.cls = (this.cls + d + CLASSES.length) % CLASSES.length;
      if (this.sel === 2) this.skin = (this.skin + d + SKINS.length) % SKINS.length;
      if (this.sel === 3) this.hair = (this.hair + d + HAIRS.length) % HAIRS.length;
      if (this.sel === 4) this.seed = randomSeedPhrase();
      if (this.sel >= 1 && this.sel <= 4) {
        audio.sfx("cursor");
        this.refreshPreview();
      }
    }
    if (inp.pressed("cancel") || inp.pressed("menu")) {
      audio.sfx("cancel");
      this.game.pop(this);
      return;
    }
    if (!inp.pressed("confirm")) return;
    audio.sfx("confirm");
    switch (this.sel) {
      case 0:
        this.game.push(new TextEntryScene(this.game, "Name your crawler", this.name, 10, false, (v) => {
          if (v.trim()) this.name = v.trim();
          this.refreshPreview();
        }));
        break;
      case 1:
        this.cls = (this.cls + 1) % CLASSES.length;
        this.refreshPreview();
        break;
      case 2:
        this.skin = (this.skin + 1) % SKINS.length;
        break;
      case 3:
        this.hair = (this.hair + 1) % HAIRS.length;
        break;
      case 4:
        this.game.push(new TextEntryScene(this.game, "Enter a seed (same seed = same season)", this.seed, 20, true, (v) => {
          if (v.trim()) this.seed = v.trim().toUpperCase();
          this.refreshPreview();
        }));
        break;
      case 5: {
        const run = Run.create(this.seed, this.name, CLASSES[this.cls].id, this.skin, this.hair);
        deleteSave();
        wireRun(this.game, run);
        introThenFloor(this.game);
        break;
      }
    }
  }

  draw(ctx: Ctx) {
    const t = this.t;
    ctx.fillStyle = "#0a0818";
    ctx.fillRect(0, 0, W, H);
    stars.draw(ctx, t, 2);
    drawWindow(ctx, 6, 6, 172, 128);
    drawText(ctx, "CRAWLER REGISTRATION", 92, 12, { color: "#ffe080", align: "center" });
    const cd = CLASSES[this.cls];
    const rows: [string, string][] = [
      ["Name", this.name],
      ["Class", cd.name],
      ["Skin", `Tone ${this.skin + 1}`],
      ["Hair", `Dye ${this.hair + 1}`],
      ["Seed", this.seed],
    ];
    rows.forEach(([k, v], i) => {
      const y = 28 + i * 16;
      const active = i === this.sel;
      drawText(ctx, k, 24, y, { color: active ? "#ffffff" : "#a8b0d8" });
      const arrows = active && i >= 1 && i <= 4;
      drawText(ctx, (arrows ? "← " : "") + v + (arrows ? " →" : ""), 170, y, { color: "#c8f0ff", align: "right" });
    });
    const by = 28 + 5 * 16 + 4;
    drawText(ctx, "★ BEGIN THE CRAWL ★", 92, by, { color: this.sel === 5 ? "#ffe040" : "#c0a040", align: "center" });
    drawHand(ctx, 20, (this.sel < 5 ? 31 + this.sel * 16 : by + 3), this.game.time);

    // preview
    drawWindow(ctx, 184, 6, 194, 128);
    const look = classLook(cd.id, this.skin, this.hair);
    const dirs = ["down", "left", "up", "right"] as const;
    const dir = dirs[Math.floor(t / 1.6) % 4];
    const fr = heroFrames(look, dir);
    const f = fr[Math.floor(t * 6) % fr.length];
    ctx.fillStyle = "rgba(0,0,0,0.3)";
    ctx.fillRect(202, 56, 28, 3);
    ctx.drawImage(f, 200, 18, 32, 40);
    const pf = petFrames(this.preview.pet.species, false);
    ctx.drawImage(pf[Math.floor(t * 3) % 2], 198, 76, 32, 32);
    drawText(ctx, cd.name, 248, 12, { color: "#ffffff" });
    drawText(ctx, `"${cd.systemTitle}"`, 248, 22, { color: "#ff80e0" });
    const stats: [string, number, number][] = [
      ["HP", cd.base.maxHp, 70],
      ["MP", cd.base.maxMp, 30],
      ["ATK", cd.base.atk, 16],
      ["DEF", cd.base.def, 14],
      ["MAG", cd.base.mag, 16],
      ["SPD", cd.base.spd, 16],
    ];
    stats.forEach(([k, v, max], i) => {
      const y = 36 + i * 10;
      drawText(ctx, k, 248, y, { color: "#a8c8ff" });
      drawBar(ctx, 274, y + 2, 70, 3, v / max, "#60c8ff");
      drawText(ctx, String(v), 372, y, { align: "right" });
    });
    wrap(cd.traits, 126).slice(0, 2).forEach((l, i) => drawText(ctx, l, 248, 100 + i * 10, { color: "#c8ffc8" }));

    drawWindow(ctx, 6, 138, W - 12, 72);
    const lines = wrap(cd.blurb, W - 32);
    lines.forEach((l, i) => drawText(ctx, l, 16, 145 + i * 10));
    const p = this.preview;
    const sp = SPECIES.find((x) => x.id === p.pet.species)!;
    drawText(ctx, `Companion: ${p.pet.name}, a sentient ${sp.label} (${sp.role})`, 16, 170, { color: "#ffd8a0" });
    drawText(ctx, `This seed: ${p.show} · Season ${p.season} · World of ${p.world}`, 16, 181, { color: "#ffe080" });
    drawText(ctx, `Network: ${p.corp}`, 16, 192, { color: "#c8b8ff" });
  }
}

// =====================================================================

const GRID = ["ABCDEFGHIJKLM", "NOPQRSTUVWXYZ", "abcdefghijklm", "nopqrstuvwxyz", "0123456789-'."];
const SPECIAL = ["SPACE", "DEL", "RANDOM", "DONE"];

export class TextEntryScene implements Scene {
  opaque = false;
  private cx = 0;
  private cy = 0;
  constructor(private game: Game, private prompt: string, private value: string, private max: number, private upper: boolean, private done: (v: string) => void) {}

  onEnter() {
    this.game.input.textMode = true;
  }

  private finish() {
    this.game.input.textMode = false;
    this.game.pop(this);
    this.done(this.value);
  }

  private add(ch: string) {
    if (this.value.length >= this.max) return;
    this.value += this.upper ? ch.toUpperCase() : ch;
  }

  update() {
    const inp = this.game.input;
    for (const ch of inp.typed) {
      if (ch === "\b") this.value = this.value.slice(0, -1);
      else if (ch === "\n") return this.finish();
      else this.add(ch);
    }
    const rows = GRID.length + 1;
    if (inp.repeat("up")) this.cy = (this.cy + rows - 1) % rows;
    if (inp.repeat("down")) this.cy = (this.cy + 1) % rows;
    const cols = this.cy < GRID.length ? 13 : SPECIAL.length;
    this.cx = Math.min(this.cx, cols - 1);
    if (inp.repeat("left")) this.cx = (this.cx + cols - 1) % cols;
    if (inp.repeat("right")) this.cx = (this.cx + 1) % cols;
    if (inp.pressed("cancel")) {
      this.value = this.value.slice(0, -1);
      audio.sfx("cancel");
    }
    if (inp.pressed("menu")) return this.finish();
    if (inp.pressed("confirm")) {
      audio.sfx("cursor");
      if (this.cy < GRID.length) this.add(GRID[this.cy][this.cx]);
      else {
        const s = SPECIAL[this.cx];
        if (s === "SPACE") this.add(" ");
        if (s === "DEL") this.value = this.value.slice(0, -1);
        if (s === "RANDOM") this.value = this.upper ? randomSeedPhrase() : ["Rook", "Juniper", "Sable", "Mateo", "Wren", "Priya", "Bo", "Ezra", "Vera", "Gus"][Math.floor(Math.random() * 10)];
        if (s === "DONE") return this.finish();
      }
    }
  }

  draw(ctx: Ctx) {
    const w = 260;
    const h = 150;
    const x = (W - w) / 2;
    const y = (H - h) / 2;
    drawWindow(ctx, x, y, w, h);
    drawText(ctx, this.prompt, x + w / 2, y + 7, { color: "#ffe080", align: "center" });
    ctx.fillStyle = "rgba(0,0,0,0.35)";
    ctx.fillRect(x + 20, y + 20, w - 40, 14);
    const cursor = Math.floor(this.game.time * 2) % 2 ? "_" : " ";
    drawText(ctx, this.value + cursor, x + w / 2, y + 23, { align: "center" });
    GRID.forEach((row, ry) => {
      [...row].forEach((ch, rx) => {
        const sel = ry === this.cy && rx === this.cx;
        drawText(ctx, this.upper && ry >= 2 && ry <= 3 ? ch.toUpperCase() : ch, x + 26 + rx * 16, y + 44 + ry * 14, { color: sel ? "#ffe040" : "#d8e0ff" });
      });
    });
    SPECIAL.forEach((s, i) => {
      const sel = this.cy === GRID.length && this.cx === i;
      drawText(ctx, s, x + 28 + i * 56, y + 44 + GRID.length * 14 + 4, { color: sel ? "#ffe040" : "#a8f0c8" });
    });
    const hx = this.cy < GRID.length ? x + 24 + this.cx * 16 : x + 26 + this.cx * 56;
    const hy = this.cy < GRID.length ? y + 47 + this.cy * 14 : y + 51 + GRID.length * 14;
    drawHand(ctx, hx, hy, this.game.time);
    drawText(ctx, "Type on keyboard, or pick letters. Esc = done.", x + w / 2, y + h - 12, { color: "#8890b8", align: "center" });
  }
}
