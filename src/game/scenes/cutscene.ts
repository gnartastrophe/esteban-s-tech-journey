import { audio } from "../engine/audio";
import { drawText, drawTitle, wrap } from "../engine/font";
import { Ctx, drawWindow, formatNum, formatTime, H, W } from "../engine/gfx";
import { themeById } from "../engine/tiles";
import { ACHIEVEMENTS } from "../data/achievements";
import { Game, Scene } from "../Game";
import { Line, sysLine } from "../gen/story";
import { deleteSave, hasSave, loadRun } from "../run";
import { beginFloor, wireRun } from "./flow";
import { TitleScene } from "./title";
import { drawBigCrystal, ListMenu, Starfield } from "./widgets";

const stars = new Starfield(160);

export class CutsceneScene implements Scene {
  opaque = true;
  private t = 0;
  private started = false;
  constructor(private game: Game, private lines: Line[], private bg: "intro" | "ending" | "dark", private done: () => void) {}

  onEnter() {
    this.game.music(this.bg === "ending" ? "ending" : "title", 3);
  }

  update(dt: number) {
    this.t += dt;
    if (!this.started && this.t > 0.4) {
      this.started = true;
      this.game.dialog(this.lines).then(() => this.done());
    }
  }

  draw(ctx: Ctx) {
    const t = this.t;
    ctx.fillStyle = this.bg === "ending" ? "#0c0a20" : "#05040c";
    ctx.fillRect(0, 0, W, H);
    stars.draw(ctx, t, this.bg === "ending" ? 2 : 8);
    if (this.bg === "dark") return;
    // the world below
    ctx.fillStyle = this.bg === "ending" ? "#1c3a2a" : "#18122e";
    ctx.beginPath();
    ctx.ellipse(W / 2, H + 140, 320, 190, 0, 0, Math.PI * 2);
    ctx.fill();
    drawBigCrystal(ctx, W / 2, 80, 26, t, this.bg === "ending" ? 140 : 200);
    if (this.bg === "intro") {
      // the network's fleet drifting in
      for (let i = 0; i < 5; i++) {
        const x = ((t * (8 + i * 2) + i * 90) % (W + 80)) - 40;
        const y = 24 + i * 9 + Math.sin(t + i) * 2;
        ctx.fillStyle = "#3a3a4c";
        ctx.fillRect(Math.round(x), Math.round(y), 18, 3);
        ctx.fillRect(Math.round(x) + 4, Math.round(y) - 2, 8, 2);
        ctx.fillStyle = Math.floor(t * 3 + i) % 2 ? "#ff4050" : "#40ffe0";
        ctx.fillRect(Math.round(x) + 16, Math.round(y) + 1, 2, 1);
      }
    }
  }
}

// =====================================================================

export class FloorTitleScene implements Scene {
  opaque = true;
  private t = 0;
  private fired = false;
  constructor(private game: Game, private n: number, private done: () => void) {}

  onEnter() {
    audio.stopMusic();
    audio.sfx("stairs");
  }

  update(dt: number) {
    this.t += dt;
    if (!this.fired && (this.t > 3 || (this.t > 0.6 && this.game.input.pressed("confirm")))) {
      this.fired = true;
      this.done();
    }
  }

  draw(ctx: Ctx) {
    const run = this.game.run!;
    const plan = run.story.floors[this.n - 1];
    const th = themeById(plan.themeId);
    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, W, H);
    for (let i = 0; i < 40; i++) {
      const y = ((i * 37 + this.t * 60) % (H + 20)) - 10;
      ctx.fillStyle = th.wall[2];
      ctx.fillRect(0, Math.round(y), W, 1);
    }
    const k = Math.min(1, this.t / 0.6);
    drawTitle(ctx, `FLOOR ${this.n}`, W / 2, 50 - (1 - k) * 20, 4, "#ffffff", th.wall[0]);
    drawText(ctx, plan.name.toUpperCase(), W / 2, 100, { color: "#ffe080", align: "center" });
    drawText(ctx, `a ${th.label}`, W / 2, 114, { color: "#a8a0c8", align: "center" });
    drawText(ctx, `Floor collapses in ${formatTime(run.timeLeft)}`, W / 2, 140, { color: "#ff8080", align: "center" });
    drawText(ctx, `${run.story.show}  ·  Season ${run.story.season}`, W / 2, 180, { color: "#706890", align: "center" });
    drawText(ctx, `This floor brought to you by ${run.story.sponsor.name}`, W / 2, 192, { color: "#706890", align: "center" });
  }
}

// =====================================================================

export class GameOverScene implements Scene {
  opaque = true;
  private t = 0;
  private menu: ListMenu;
  private line: string;
  constructor(private game: Game, private reason: string) {
    const items = [];
    if (hasSave()) items.push({ label: "Load Last Save", value: "load" });
    items.push({ label: "Return to Title", value: "title" });
    this.menu = new ListMenu(items, 3, 13);
    const run = game.run!;
    this.line = sysLine(run.story, "gameover", run.rng("gameover" + run.stats.timePlayed));
  }

  onEnter() {
    this.game.music("gameover", Math.floor(Math.random() * 1000));
  }

  update(dt: number) {
    this.t += dt;
    if (this.t < 1.5) return;
    if (this.menu.update(this.game.input, false) !== "confirm") return;
    if (this.menu.current?.value === "load") {
      const run = loadRun();
      if (run) {
        wireRun(this.game, run);
        beginFloor(this.game, false);
        return;
      }
    }
    this.game.goto(new TitleScene(this.game));
  }

  draw(ctx: Ctx) {
    const run = this.game.run!;
    ctx.fillStyle = "#0a0004";
    ctx.fillRect(0, 0, W, H);
    for (let y = 0; y < H; y += 3) {
      ctx.fillStyle = `rgba(255,0,40,${0.03 + 0.02 * Math.sin(this.t * 3 + y * 0.2)})`;
      ctx.fillRect(0, y, W, 1);
    }
    drawTitle(ctx, "DELETED", W / 2, 24, 4, "#ff6070", "#600010");
    const lines = wrap(this.reason, 300);
    lines.forEach((l, i) => drawText(ctx, l, W / 2, 70 + i * 10, { color: "#ffb0b8", align: "center" }));
    const sl = wrap(this.line, 300);
    sl.forEach((l, i) => drawText(ctx, l, W / 2, 96 + i * 10, { color: "#c8fff0", align: "center" }));
    drawText(ctx, `Floor ${run.floorN}  ·  Level ${run.hero.level}  ·  Peak viewers ${formatNum(run.stats.peakViewers)}`, W / 2, 124, { color: "#a090b0", align: "center" });
    if (this.t > 1.5) {
      drawWindow(ctx, W / 2 - 70, 144, 140, this.menu.items.length * 13 + 12);
      this.menu.draw(ctx, W / 2 - 64, 151, 128, this.game.time);
    }
  }
}

// =====================================================================

export class EndingScene implements Scene {
  opaque = true;
  private t = 0;
  constructor(private game: Game, private title: string) {}

  onEnter() {
    this.game.music("ending", 99);
    deleteSave();
  }

  update(dt: number) {
    this.t += dt;
    if (this.t > 3 && this.game.input.pressed("confirm")) {
      audio.sfx("confirm");
      this.game.goto(new TitleScene(this.game));
    }
  }

  draw(ctx: Ctx) {
    const run = this.game.run!;
    const st = run.stats;
    ctx.fillStyle = "#06061a";
    ctx.fillRect(0, 0, W, H);
    stars.draw(ctx, this.t, 3);
    drawText(ctx, "ENDING:", W / 2, 8, { color: "#a8a0c8", align: "center" });
    drawTitle(ctx, this.title, W / 2, 18, this.title.length > 16 ? 2 : 3, "#fff8d0", "#e0a030");
    drawWindow(ctx, 40, 52, W - 80, 136);
    drawText(ctx, `SEASON ${run.story.season} RECAP  ·  ${run.story.show}`, W / 2, 59, { color: "#ffe080", align: "center" });
    const rows: [string, string][] = [
      ["Crawler", `${run.hero.name} (Lv ${run.hero.level})`],
      ["Companion", `${run.story.pet.name} (Lv ${run.pet.level})`],
      ["Time", formatTime(st.timePlayed)],
      ["Monsters slain", String(st.kills)],
      ["Battles", `${st.battles} (fled ${st.fled})`],
      ["Peak viewers", formatNum(st.peakViewers)],
      ["Achievements", `${run.achievements.length} / ${ACHIEVEMENTS.length}`],
      ["Loot boxes opened", String(st.boxesOpened)],
      ["Gold earned", String(st.goldEarned)],
      ["Seed", run.seed],
    ];
    rows.forEach(([k, v], i) => {
      drawText(ctx, k, 56, 74 + i * 11, { color: "#a8c8ff" });
      drawText(ctx, v, W - 56, 74 + i * 11, { align: "right" });
    });
    if (this.t > 3 && Math.floor(this.t * 2) % 2) drawText(ctx, "Thanks for watching!  Press Z to return to the title.", W / 2, H - 16, { color: "#c8b8ff", align: "center" });
  }
}
