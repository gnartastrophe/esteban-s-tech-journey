// Dungeon exploration: grid movement with smooth tweening, a follower pet,
// visible wandering monsters that chase you (hit them first for a First
// Strike, get caught from behind and you're Ambushed), FOV lighting, traps,
// NPCs and all the story triggers.

import { audio } from "../engine/audio";
import { drawText, measure } from "../engine/font";
import { Ctx, drawBar, drawWindow, formatNum, formatTime, H, makeCanvas, TILE, W } from "../engine/gfx";
import { genMonster } from "../engine/monsters";
import { hashString, RNG } from "../engine/rng";
import { classLook, Dir, drawCrystal, drawShadow, drawTorch, heroFrames, Look, petFrames, props, randomLook } from "../engine/sprites";
import { drawFloorTile, drawStairs, drawWallFace, drawWallTop, Theme, themeById } from "../engine/tiles";
import { elementName } from "../data/enemies";
import { genGear } from "../data/items";
import { floorBoss, mimic, rivalBoss } from "../encounters";
import { Game, Scene } from "../Game";
import { Entity, Floor, inRoom, T_SAFE, T_STAIRS, T_WALL, tileAt } from "../gen/dungeon";
import * as St from "../gen/story";
import { consumableName, Run, saveRun } from "../run";
import type { EnemyInstance } from "../types";
import { BattleScene, BattleResult } from "./battle";
import { GameOverScene } from "./cutscene";
import { descend } from "./flow";
import { MapScene, MenuScene } from "./menu";
import { ShopScene } from "./shop";
import { finalSequence } from "./finale";
import { drawBigCrystal } from "./widgets";

const DIRS: Record<Dir, [number, number]> = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };

interface MapEnemy {
  ent: Entity;
  x: number;
  y: number;
  fx: number;
  fy: number;
  t: number;
  moving: boolean;
  cool: number;
  chase: boolean;
  stun: number;
  dir: Dir;
  sprite: HTMLCanvasElement;
  dur: number;
}

const npcLookCache = new Map<number, Look>();
function lookFor(seed: number): Look {
  let l = npcLookCache.get(seed);
  if (!l) {
    l = randomLook(new RNG(seed));
    npcLookCache.set(seed, l);
  }
  return l;
}

export class ExploreScene implements Scene {
  opaque = true;
  busy = false;
  private run: Run;
  private floor: Floor;
  private theme: Theme;
  private mapCanvas!: HTMLCanvasElement;
  private explored: Uint8Array;
  private visible: Uint8Array;
  private lightCanvas: HTMLCanvasElement;
  private lightCtx: CanvasRenderingContext2D;
  private lightData: ImageData;
  private mini: HTMLCanvasElement;
  private miniDirty = true;
  // player
  private px: number;
  private py: number;
  private fromX: number;
  private fromY: number;
  private moveT = 1;
  private moveDur = 0.15;
  private dir: Dir = "down";
  private walkPhase = 0;
  private trail: { x: number; y: number }[] = [];
  private petPos: { x: number; y: number; fx: number; fy: number };
  private swingT = 0;
  private invuln = 0;
  // world
  private enemies: MapEnemy[] = [];
  private t = 0;
  private camX = 0;
  private camY = 0;
  private timerWarned = false;
  private inSafe = false;
  private bossSprite: HTMLCanvasElement | null = null;
  private bossInst: EnemyInstance | null = null;

  constructor(private game: Game) {
    this.run = game.run!;
    this.floor = this.run.floor;
    this.theme = themeById(this.run.story.floors[this.floor.n - 1].themeId);
    const f = this.floor;
    this.explored = new Uint8Array(f.w * f.h);
    const ex = this.run.fstate.explored;
    for (let i = 0; i < ex.length && i < this.explored.length; i++) this.explored[i] = ex.charCodeAt(i) === 49 ? 1 : 0;
    this.visible = new Uint8Array(f.w * f.h);
    [this.lightCanvas, this.lightCtx] = makeCanvas(f.w, f.h);
    this.lightData = this.lightCtx.createImageData(f.w, f.h);
    [this.mini] = makeCanvas(f.w, f.h);
    const start = this.run.playerPos ?? f.start;
    this.px = this.fromX = start.x;
    this.py = this.fromY = start.y;
    this.petPos = { x: start.x, y: start.y + 1, fx: start.x, fy: start.y + 1 };
    if (!this.passable(this.petPos.x, this.petPos.y, true)) this.petPos = { x: start.x, y: start.y, fx: start.x, fy: start.y };
    this.buildMap();
    this.spawnEnemies();
    if (!this.run.fstate.bossDefeated) {
      this.bossInst = floorBoss(this.run, f.n);
      if (f.n === 5) this.bossInst.pal = { hue: 340, sat: 70, hue2: 45, eye: "#ffe040" };
      this.bossSprite = genMonster(this.bossInst.spriteSeed, f.n === 5 ? this.run.story.villain.arch1 : this.bossInst.arch, this.bossInst.pal, { size: 32, boss: true });
    }
    this.computeFov();
  }

  // ------------------------------------------------------------- setup
  private buildMap() {
    const f = this.floor;
    const [c, ctx] = makeCanvas(f.w * TILE, f.h * TILE);
    for (let y = 0; y < f.h; y++)
      for (let x = 0; x < f.w; x++) {
        const t = tileAt(f, x, y);
        const r = new RNG(hashString(`${this.run.seed}:${f.n}:${x},${y}`));
        const X = x * TILE;
        const Y = y * TILE;
        if (t !== T_WALL) {
          drawFloorTile(ctx, X, Y, this.theme, r, t === T_SAFE);
          if (t === T_STAIRS && f.n < 5) drawStairs(ctx, X, Y, this.theme);
          if (tileAt(f, x, y - 1) === T_WALL) {
            ctx.fillStyle = "rgba(0,0,0,0.35)";
            ctx.fillRect(X, Y, TILE, 3);
            ctx.fillStyle = "rgba(0,0,0,0.15)";
            ctx.fillRect(X, Y + 3, TILE, 2);
          }
          if (tileAt(f, x - 1, y) === T_WALL) {
            ctx.fillStyle = "rgba(0,0,0,0.2)";
            ctx.fillRect(X, Y, 2, TILE);
          }
          continue;
        }
        const below = tileAt(f, x, y + 1);
        if (below !== T_WALL) {
          drawWallFace(ctx, X, Y, this.theme, r);
          continue;
        }
        let near = false;
        for (let dy = -1; dy <= 1 && !near; dy++) for (let dx = -1; dx <= 1; dx++) if (tileAt(f, x + dx, y + dy) !== T_WALL) near = true;
        if (near)
          drawWallTop(ctx, X, Y, this.theme, {
            n: tileAt(f, x, y - 1) !== T_WALL,
            s: false,
            e: tileAt(f, x + 1, y) !== T_WALL,
            w: tileAt(f, x - 1, y) !== T_WALL,
          });
      }
    this.mapCanvas = c;
  }

  private spawnEnemies() {
    const fs = this.run.fstate;
    this.enemies = [];
    for (const e of this.floor.entities) {
      if (e.type !== "enemy" || fs.defeated.includes(e.id)) continue;
      const lead = e.data.group![0];
      this.enemies.push({
        ent: e,
        x: e.x,
        y: e.y,
        fx: e.x,
        fy: e.y,
        t: 1,
        moving: false,
        cool: Math.random() * 1.5,
        chase: false,
        stun: 0,
        dir: "down",
        sprite: genMonster(lead.spriteSeed, lead.arch, lead.pal, { size: 16 }),
        dur: 0.4,
      });
    }
  }

  onEnter() {
    this.updateMusic(true);
  }

  onResume() {
    this.updateMusic(false);
    this.computeFov();
  }

  private updateMusic(force: boolean) {
    const inSafe = tileAt(this.floor, this.px, this.py) === T_SAFE;
    if (force || inSafe !== this.inSafe || !["safe", "dungeon"].includes(audioMood())) {
      this.inSafe = inSafe;
      this.game.music(inSafe ? "safe" : "dungeon");
    }
  }

  // ------------------------------------------------------------- helpers
  private entityAt(x: number, y: number, solidOnly = true): Entity | undefined {
    const fs = this.run.fstate;
    return this.floor.entities.find((e) => {
      if (e.x !== x || e.y !== y) return false;
      if (solidOnly && !e.solid) return false;
      if (e.type === "enemy") return false;
      if (e.type === "boss" && fs.bossDefeated) return false;
      if ((e.type === "barrel" || e.type === "bones") && fs.opened.includes(e.id)) return false;
      if ((e.type === "rival" || e.type === "guide" || e.type === "sponsor") && fs.talked.includes(e.id + ":gone")) return false;
      if (e.data.wall) return false;
      return true;
    });
  }

  private enemyAt(x: number, y: number): MapEnemy | undefined {
    return this.enemies.find((m) => (m.x === x && m.y === y) || (m.moving && m.fx === x && m.fy === y && m.t < 0.5));
  }

  private passable(x: number, y: number, forPet = false): boolean {
    if (tileAt(this.floor, x, y) === T_WALL) return false;
    if (this.entityAt(x, y)) return false;
    if (!forPet && this.enemyAt(x, y)) return false;
    return true;
  }

  private playerPixel(): [number, number] {
    const k = Math.min(1, this.moveT);
    return [(this.fromX + (this.px - this.fromX) * k) * TILE, (this.fromY + (this.py - this.fromY) * k) * TILE];
  }

  private hasRogue() {
    return this.run.party.some((h) => h.cls === "rogue" && h.hp > 0);
  }

  // ------------------------------------------------------------- FOV
  private computeFov() {
    const f = this.floor;
    this.visible.fill(0);
    const R = 9;
    for (let dy = -R; dy <= R; dy++)
      for (let dx = -R; dx <= R; dx++) {
        if (dx * dx + dy * dy > R * R + 1) continue;
        const tx = this.px + dx;
        const ty = this.py + dy;
        if (tx < 0 || ty < 0 || tx >= f.w || ty >= f.h) continue;
        if (this.los(this.px, this.py, tx, ty)) {
          this.visible[ty * f.w + tx] = 1;
          if (!this.explored[ty * f.w + tx]) {
            this.explored[ty * f.w + tx] = 1;
            this.miniDirty = true;
          }
        }
      }
    // the room you're standing in is always fully mapped
    const rm = f.rooms.find((r) => inRoom(r, this.px, this.py));
    if (rm)
      for (let y = rm.y - 1; y <= rm.y + rm.h; y++)
        for (let x = rm.x - 1; x <= rm.x + rm.w; x++) {
          const k = y * f.w + x;
          if (k >= 0 && k < this.explored.length && !this.explored[k]) {
            this.explored[k] = 1;
            this.miniDirty = true;
          }
        }
  }

  private los(x0: number, y0: number, x1: number, y1: number): boolean {
    const dx = Math.abs(x1 - x0);
    const dy = -Math.abs(y1 - y0);
    const sx = x0 < x1 ? 1 : -1;
    const sy = y0 < y1 ? 1 : -1;
    let err = dx + dy;
    let x = x0;
    let y = y0;
    while (!(x === x1 && y === y1)) {
      if (!(x === x0 && y === y0) && tileAt(this.floor, x, y) === T_WALL) return false;
      const e2 = 2 * err;
      if (e2 >= dy) {
        err += dy;
        x += sx;
      }
      if (e2 <= dx) {
        err += dx;
        y += sy;
      }
    }
    return true;
  }

  private persistExplored() {
    let s = "";
    for (let i = 0; i < this.explored.length; i++) s += this.explored[i] ? "1" : "0";
    this.run.fstate.explored = s;
    this.run.playerPos = { x: this.px, y: this.py };
  }

  // ------------------------------------------------------------- update
  update(dt: number) {
    this.t += dt;
    this.swingT = Math.max(0, this.swingT - dt);
    this.invuln = Math.max(0, this.invuln - dt);
    const inp = this.game.input;

    // movement tween
    if (this.moveT < 1) {
      this.moveT += dt / this.moveDur;
      this.walkPhase += dt * 8;
      if (this.moveT >= 1) {
        this.moveT = 1;
        this.arrive();
      }
    }
    this.updateEnemies(dt);
    if (this.busy) return;

    // floor timer
    this.run.timeLeft -= dt;
    if (!this.timerWarned && this.run.timeLeft <= 60) {
      this.timerWarned = true;
      this.script(async () => {
        await this.game.dialog([{ speaker: "SYSTEM", text: St.sysLine(this.run.story, "timer", this.run.rng("timer" + this.floor.n)), style: "system" }]);
      });
      return;
    }
    if (this.run.timeLeft <= 0) {
      this.run.timeLeft = 0;
      audio.sfx("death");
      this.game.goto(new GameOverScene(this.game, `Floor ${this.floor.n} collapsed with you still on it. The stairwell was right there.`));
      this.busy = true;
      return;
    }

    if (inp.pressed("menu") || inp.pressed("cancel")) {
      audio.sfx("confirm");
      this.persistExplored();
      this.game.push(new MenuScene(this.game));
      return;
    }
    if (inp.pressed("map")) {
      this.persistExplored();
      this.game.push(new MapScene(this.game, this.explored, { x: this.px, y: this.py }));
      return;
    }
    if (inp.pressed("confirm") && this.moveT >= 1) {
      this.actionButton();
      return;
    }
    if (this.moveT >= 1) {
      const [dx, dy] = inp.dir();
      if (dx || dy) this.tryMove(dx, dy, inp.isDown("run"));
    }
  }

  private tryMove(dx: number, dy: number, run: boolean) {
    this.dir = dx < 0 ? "left" : dx > 0 ? "right" : dy < 0 ? "up" : "down";
    const nx = this.px + dx;
    const ny = this.py + dy;
    const me = this.enemyAt(nx, ny);
    if (me && me.stun <= 0 && this.invuln <= 0) {
      this.startBattle(me, "normal");
      return;
    }
    if (!this.passable(nx, ny)) return;
    this.trail.unshift({ x: this.px, y: this.py });
    this.trail.length = Math.min(this.trail.length, 4);
    this.fromX = this.px;
    this.fromY = this.py;
    this.px = nx;
    this.py = ny;
    this.moveT = 0;
    this.moveDur = run ? 0.1 : 0.15;
    this.run.stats.steps++;
    // the pet follows into the tile we just left
    this.petPos.fx = this.petPos.x;
    this.petPos.fy = this.petPos.y;
    this.petPos.x = this.fromX;
    this.petPos.y = this.fromY;
  }

  private arrive() {
    this.computeFov();
    this.updateMusic(false);
    const fs = this.run.fstate;
    const f = this.floor;
    // step-on entities
    for (const e of f.entities) {
      if (e.x !== this.px || e.y !== this.py || e.solid) continue;
      if (e.type === "trap" && !fs.sprung.includes(e.id)) return this.springTrap(e);
      if (e.type === "note") return this.script(() => this.readNote(e));
      if (e.type === "questitem") {
        const q = this.run.quest();
        if (q && q.kind === "fetch" && !q.done && !fs.opened.includes(e.id)) {
          fs.opened.push(e.id);
          q.have = 1;
          q.done = true;
          audio.sfx("chest");
          this.game.toast(`Found the ${e.data.name}! Return it to ${q.giver}.`, "#a0ffa0");
        }
      }
    }
    if (tileAt(f, this.px, this.py) === T_STAIRS) this.script(() => this.stairs());
    // exploration achievement
    if (this.miniDirty) {
      let open = 0;
      let seen = 0;
      for (let i = 0; i < f.tiles.length; i++)
        if (f.tiles[i] !== T_WALL) {
          open++;
          if (this.explored[i]) seen++;
        }
      if (seen / open > 0.85) this.run.unlock("explorer");
    }
  }

  private updateEnemies(dt: number) {
    for (const m of this.enemies) {
      m.stun = Math.max(0, m.stun - dt);
      if (m.moving) {
        m.t += dt / m.dur;
        if (m.t >= 1) {
          m.t = 1;
          m.moving = false;
        }
        continue;
      }
      if (this.busy) continue;
      m.cool -= dt;
      if (m.cool > 0 || m.stun > 0) continue;
      const d = Math.abs(m.x - this.px) + Math.abs(m.y - this.py);
      const sees = d <= 6 && this.visible[m.y * this.floor.w + m.x] === 1 && tileAt(this.floor, this.px, this.py) !== T_SAFE;
      m.chase = sees;
      let step: [number, number] | null = null;
      if (sees) {
        const ddx = Math.sign(this.px - m.x);
        const ddy = Math.sign(this.py - m.y);
        const opts: [number, number][] = Math.abs(this.px - m.x) > Math.abs(this.py - m.y) ? [[ddx, 0], [0, ddy]] : [[0, ddy], [ddx, 0]];
        for (const [sx, sy] of opts) {
          if (!sx && !sy) continue;
          const nx = m.x + sx;
          const ny = m.y + sy;
          if (nx === this.px && ny === this.py) {
            if (this.invuln <= 0) {
              const [fx, fy] = DIRS[this.dir];
              const behind = fx * (m.x - this.px) + fy * (m.y - this.py) < 0;
              this.startBattle(m, behind ? "ambush" : "normal");
            }
            step = null;
            break;
          }
          if (this.enemyCanEnter(nx, ny)) {
            step = [sx, sy];
            break;
          }
        }
        m.cool = 0.02;
        m.dur = 0.26;
      } else {
        if (Math.random() < 0.55) {
          const [sx, sy] = [[1, 0], [-1, 0], [0, 1], [0, -1]][Math.floor(Math.random() * 4)];
          if (this.enemyCanEnter(m.x + sx, m.y + sy) && !(m.x + sx === this.px && m.y + sy === this.py)) step = [sx, sy];
        }
        m.cool = 0.5 + Math.random() * 1.1;
        m.dur = 0.42;
      }
      if (step) {
        m.fx = m.x;
        m.fy = m.y;
        m.x += step[0];
        m.y += step[1];
        m.t = 0;
        m.moving = true;
        m.dir = step[0] < 0 ? "left" : step[0] > 0 ? "right" : step[1] < 0 ? "up" : "down";
      }
    }
  }

  private enemyCanEnter(x: number, y: number) {
    const t = tileAt(this.floor, x, y);
    if (t === T_WALL || t === T_SAFE || t === T_STAIRS) return false;
    if (this.entityAt(x, y)) return false;
    if (this.enemies.some((o) => o.x === x && o.y === y)) return false;
    if (this.petPos.x === x && this.petPos.y === y) return false;
    return true;
  }

  // ------------------------------------------------------------- actions
  private script(fn: () => Promise<void>) {
    this.busy = true;
    fn()
      .catch((e) => console.error(e))
      .finally(() => {
        this.busy = false;
      });
  }

  private facing(): [number, number] {
    const [dx, dy] = DIRS[this.dir];
    return [this.px + dx, this.py + dy];
  }

  private actionButton() {
    const [fx, fy] = this.facing();
    const me = this.enemyAt(fx, fy);
    this.swingT = 0.2;
    if (me) {
      audio.sfx("swing");
      this.startBattle(me, "firststrike");
      return;
    }
    const ent = this.entityAt(fx, fy) ?? this.wallEntityAt(fx, fy);
    if (ent) {
      this.script(() => this.interact(ent));
      return;
    }
    audio.sfx("swing");
  }

  private wallEntityAt(x: number, y: number): Entity | undefined {
    return this.floor.entities.find((e) => e.x === x && e.y === y && e.type === "poster");
  }

  private startBattle(me: MapEnemy, mode: "normal" | "firststrike" | "ambush") {
    if (this.busy) return;
    this.busy = true;
    const group = me.ent.data.group!.map((e) => ({ ...e, stats: { ...e.stats }, status: {}, hp: e.stats.maxHp, uid: e.uid + Math.random() }));
    this.battle(group, { mode }).then((res) => {
      if (res === "win") {
        this.run.fstate.defeated.push(me.ent.id);
        this.enemies = this.enemies.filter((x) => x !== me);
      } else if (res === "flee") {
        me.stun = 3;
        this.invuln = 2.5;
      }
      this.busy = false;
    });
  }

  /** Run a battle; resolves with the result (game over handled here). */
  battle(enemies: EnemyInstance[], opts: { mode?: "normal" | "firststrike" | "ambush"; boss?: boolean; canFlee?: boolean; music?: "battle" | "boss" | "final"; noResults?: boolean }): Promise<BattleResult> {
    return new Promise((resolve) => {
      this.persistExplored();
      audio.sfx("encounter");
      const bs = new BattleScene(this.game, enemies, {
        mode: opts.mode ?? "normal",
        canFlee: opts.canFlee ?? !opts.boss,
        music: opts.music ?? (opts.boss ? "boss" : "battle"),
        theme: this.theme,
        noResults: opts.noResults,
        onEnd: (res) => {
          if (res === "lose") {
            this.game.goto(new GameOverScene(this.game, "Your party was wiped out on live television. The replay is already trending."));
            return;
          }
          this.game.pop(bs);
          resolve(res);
        },
      });
      this.game.push(bs);
    });
  }

  private async interact(e: Entity) {
    const run = this.run;
    const fs = run.fstate;
    const s = run.story;
    const r = run.rng(e.id + ":" + fs.talked.length);
    // face the player
    switch (e.type) {
      case "chest":
        return this.openChest(e);
      case "barrel": {
        audio.sfx("hit");
        fs.opened.push(e.id);
        if (r.chance(0.35)) {
          const g = r.int(5, 15) * this.floor.n;
          run.addGold(g);
          this.game.toast(`The barrel had ${g} gold in it. Who keeps gold in a barrel?`);
        }
        return;
      }
      case "bones":
        return this.game.dialog([{ speaker: "", text: r.pick(["A pile of bones. A previous contestant, probably. They didn't make the highlight reel.", "Bones. There's a name tag: 'HELLO MY NAME IS: lunch'."]), style: "normal" }]);
      case "npc":
        return this.talkCrawler(e);
      case "vendor":
        return new Promise<void>((res) => this.game.push(new ShopScene(this.game, e.data.name ?? "Vendor", res)));
      case "bartender": {
        const lines = St.bartenderLines(s, this.floor.n, r);
        await this.game.dialog(lines.map((t) => ({ speaker: e.data.name ?? "Bartender", text: t })));
        if (!fs.talked.includes(e.id)) {
          fs.talked.push(e.id);
          this.countTalk();
          const boss = this.bossInst ?? floorBoss(run, this.floor.n);
          const drink = r.pick(["tonic", "ether", "antidote"]);
          run.addItem(drink);
          await this.game.dialog([
            { speaker: e.data.name ?? "Bartender", text: `One more thing: ${St.bossHint(s, this.floor.n, boss.weak.map(elementName).join(" and ") || "being hit really hard", r)} Here, on the house: one ${consumableName(drink)}.` },
          ]);
        }
        return;
      }
      case "crystal":
        return this.useCrystal();
      case "poster": {
        run.unlock("reader");
        const text = St.say(s, St.POSTER_LINES, new RNG(e.data.seed ?? 1), { rep: s.sponsor.rep });
        return this.game.dialog([{ speaker: "", text: `A poster on the wall: "${text}"` }]);
      }
      case "boss":
        return this.bossEncounter();
      case "oldtimer": {
        await this.game.dialog(St.oldTimerScript(s));
        if (!fs.talked.includes(e.id)) {
          fs.talked.push(e.id);
          this.countTalk();
          run.addItem("tonic", 2);
          this.game.toast("Received 2 Red Tonics.", "#a0ffa0");
        }
        return;
      }
      case "rival":
        return this.talkRival(e);
      case "guide":
        return this.talkGuide(e);
      case "sponsor":
        return this.talkSponsor(e);
      case "upstairs":
        return this.game.dialog([{ speaker: "", text: "The way back up has been bricked over. A sign reads: 'NO REFUNDS.'" }]);
    }
  }

  private countTalk() {
    this.run.stats.npcsTalked++;
    if (this.run.stats.npcsTalked >= 5) this.run.unlock("chatty");
  }

  private async talkCrawler(e: Entity) {
    const run = this.run;
    const s = run.story;
    const fs = run.fstate;
    const nr = new RNG(e.data.lookSeed ?? 1);
    const name = St.say(s, "#n#", nr, { n: [nameFrom(nr)] });
    const first = !fs.talked.includes(e.id);
    const r = run.rng(e.id + ":" + run.stats.steps);
    // quests
    if (e.data.quest) {
      const q = run.quest();
      if (!q && !fs.questTaken) {
        const plan = s.floors[this.floor.n - 1];
        const qi = this.floor.entities.find((x) => x.type === "questitem");
        const fetch = !!qi && r.chance(0.5);
        const target = fetch ? qi!.data.name! : r.pick(plan.archs);
        const need = fetch ? 1 : r.int(2, 3);
        const fam = { beast: "beasts", humanoid: "goblin-types", floater: "floating things", blob: "slimes", insect: "bugs", serpent: "snakes", plant: "angry plants", construct: "constructs" } as Record<string, string>;
        const text = fetch ? `I lost my ${target} somewhere on this floor. Find it and I'll make it worth your while.` : `The ${fam[target]} on this floor ate my lunch. Kill ${need} of them. For justice. And lunch.`;
        await this.game.dialog([{ speaker: name, text: St.crawlerChatter(s, r) }, { speaker: name, text }]);
        const c = await this.game.choose("Accept the quest?", ["Sure, why not", "Not my problem"], undefined, 1);
        if (c === 0) {
          fs.questTaken = true;
          run.quests.push({ id: e.id, giver: name, text, kind: fetch ? "fetch" : "kill", target, need, have: 0, done: false, rewarded: false, floor: this.floor.n });
          run.addLog(`Quest from ${name}: ${text}`);
          this.game.toast("Quest accepted! Check it in the menu under Log.", "#ffe080");
        }
        if (first) {
          fs.talked.push(e.id);
          this.countTalk();
        }
        return;
      }
      if (q && q.done && !q.rewarded) {
        q.rewarded = true;
        const gold = 60 + this.floor.n * 40;
        run.addGold(gold);
        run.addBox("Silver", "Quest reward");
        run.addViewers(3000 * this.floor.n);
        await this.game.dialog([{ speaker: name, text: q.kind === "fetch" ? `My ${q.target}! You found it! Here, take this. And this box. I don't know what's in it. Nobody does.` : "You did it! Justice is served. Lunch is avenged. Here's your reward." }]);
        this.game.toast(`+${gold} gold, +Silver Box`, "#a0ffa0");
        run.unlock("quest");
        return;
      }
      if (q && !q.done) {
        await this.game.dialog([{ speaker: name, text: q.kind === "fetch" ? `Still no sign of my ${q.target}? It's somewhere on this floor, I swear.` : `${q.have}/${q.need}. Keep going. I believe in you. Mostly.` }]);
        return;
      }
    }
    const lines: St.Line[] = [{ speaker: name, text: St.crawlerChatter(s, r) }];
    if (first && r.chance(0.5)) {
      const boss = this.bossInst ?? floorBoss(run, this.floor.n);
      lines.push({ speaker: name, text: St.bossHint(s, this.floor.n, boss.weak.map(elementName).join(" and ") || "brute force", r) });
    }
    await this.game.dialog(lines);
    if (first) {
      fs.talked.push(e.id);
      this.countTalk();
      if (r.chance(0.35)) {
        const gift = r.pick(["tonic", "ether", "antidote", "smoke"]);
        run.addItem(gift);
        this.game.toast(`${name} gave you a ${consumableName(gift)}.`, "#a0ffa0");
      }
    }
  }

  private async openChest(e: Entity) {
    const run = this.run;
    const fs = run.fstate;
    if (fs.opened.includes(e.id)) {
      await this.game.dialog([{ speaker: "", text: "It's empty. Like the promises of " + run.story.corp + "." }]);
      return;
    }
    if (e.data.mimic) {
      fs.opened.push(e.id);
      await this.game.dialog([{ speaker: "SYSTEM", text: "Oh, you sweet summer crawler. That's a MIMIC.", style: "system" }]);
      const res = await this.battle([mimic(e.data.level ?? 1, e.data.seed ?? 1)], { mode: "ambush", music: "boss" });
      if (res !== "win") fs.opened.splice(fs.opened.indexOf(e.id), 1);
      return;
    }
    fs.opened.push(e.id);
    audio.sfx("chest");
    const r = new RNG(e.data.seed ?? 1);
    const msgs: string[] = [];
    const gold = r.int(10, 30) * this.floor.n + r.int(0, 20);
    run.addGold(gold);
    msgs.push(`${gold} gold`);
    const item = r.pick(["tonic", "tonic", "ether", "antidote", "smoke", this.floor.n >= 2 ? "bigtonic" : "tonic", this.floor.n >= 3 ? "feather" : "ether"]);
    run.addItem(item);
    msgs.push(consumableName(item));
    if (r.chance(0.45)) {
      const g = genGear(r, this.floor.n * 2, r.chance(0.25) ? 2 : r.chance(0.5) ? 1 : 0);
      run.addGear(g);
      msgs.push(g.name);
    }
    await this.game.dialog([{ speaker: "", text: `Opened the chest! Found: ${msgs.join(", ")}.` }]);
  }

  private async readNote(e: Entity) {
    const run = this.run;
    run.unlock("reader");
    const txt = St.noteText(run.story, this.floor.n, new RNG(e.data.seed ?? 1));
    if (!run.fstate.talked.includes(e.id)) {
      run.fstate.talked.push(e.id);
      run.addLog(`Found a note: ${txt}`);
    }
    await this.game.dialog([{ speaker: "", text: `A crumpled note: ${txt}` }]);
  }

  private springTrap(e: Entity) {
    const run = this.run;
    const fs = run.fstate;
    fs.sprung.push(e.id);
    this.script(async () => {
      if (this.hasRogue() && Math.random() < 0.6) {
        audio.sfx("cursor");
        await this.game.dialog([{ speaker: run.hero.cls === "rogue" ? run.hero.name : run.pet.name, text: "Trap. Disarmed it. You're welcome." }]);
        run.addViewers(500);
        return;
      }
      audio.sfx("trap");
      run.unlock("trap");
      switch (e.data.trapKind) {
        case "spike": {
          for (const h of run.party) if (h.hp > 0) h.hp = Math.max(1, h.hp - Math.ceil(run.statsOf(h).maxHp * 0.15));
          await this.game.dialog([{ speaker: "SYSTEM", text: "SPIKE TRAP! Everyone takes damage. The audience winces in unison.", style: "system" }]);
          break;
        }
        case "teleport": {
          const rooms = this.floor.rooms.filter((rm) => rm.role === "normal" || rm.role === "treasure");
          const rm = rooms[Math.floor(Math.random() * rooms.length)];
          await this.game.dialog([{ speaker: "SYSTEM", text: "TELEPORT TRAP! Enjoy your complimentary relocation.", style: "system" }]);
          for (let tries = 0; tries < 30; tries++) {
            const x = rm.x + Math.floor(Math.random() * rm.w);
            const y = rm.y + Math.floor(Math.random() * rm.h);
            if (this.passable(x, y)) {
              this.px = this.fromX = x;
              this.py = this.fromY = y;
              this.petPos = { x, y, fx: x, fy: y };
              break;
            }
          }
          this.computeFov();
          break;
        }
        case "alarm": {
          await this.game.dialog([{ speaker: "SYSTEM", text: "ALARM TRAP! Something heard that. Several somethings.", style: "system" }]);
          for (const m of this.enemies) if (Math.abs(m.x - this.px) + Math.abs(m.y - this.py) < 16) m.stun = 0;
          break;
        }
        default:
          run.addViewers(2500);
          await this.game.dialog([{ speaker: "SYSTEM", text: "CONFETTI TRAP! Harmless, humiliating, and great for ratings.", style: "system" }]);
      }
    });
  }

  private async useCrystal() {
    const run = this.run;
    audio.sfx("save");
    run.healAll();
    run.unlock("crystal");
    this.persistExplored();
    const ok = saveRun(run);
    await this.game.dialog([{ speaker: "", text: `The crystal hums. Your party is fully restored.${ok ? " Progress saved." : " (Saving failed — storage unavailable.)"}` }]);
  }

  private async talkRival(e: Entity) {
    const run = this.run;
    const s = run.story;
    const fs = run.fstate;
    const n = this.floor.n;
    if (n === 2) {
      if (!fs.talked.includes(e.id)) {
        await this.game.dialog(St.rivalMeetScript(s));
        fs.talked.push(e.id);
        this.countTalk();
        run.addLog(`Met ${s.rival.name}, a rival crawler.`);
      } else await this.game.dialog([{ speaker: s.rival.name, text: s.rival.catch }]);
      return;
    }
    if (n === 3) {
      if (run.flags.rival) {
        await this.game.dialog([{ speaker: s.rival.name, text: run.flags.rival === "robbed" ? "Get away from me." : run.flags.rival === "helped" ? "I'm patched up. Go on, I'll catch up!" : "...Thanks for nothing." }]);
        return;
      }
      await this.game.dialog(St.rivalTroubleScript(s));
      const c = await this.game.choose(`${s.rival.name} is wounded. What do you do?`, ["Help (give 2 Red Tonics)", "Rob them", "Walk away"]);
      if (c === 0) {
        if ((run.inv.items.tonic ?? 0) >= 2) run.removeItem("tonic", 2);
        else run.addGold(-Math.min(run.gold, 60));
        run.flags.rival = "helped";
        run.addViewers(5000);
        await this.game.dialog(St.rivalHelped(s));
        run.addLog(`Helped ${s.rival.name} when they were wounded.`);
      } else if (c === 1) {
        run.flags.rival = "robbed";
        run.addGold(250);
        run.addViewers(8000);
        await this.game.dialog(St.rivalRobbed(s));
        this.game.toast("+250 gold. You monster.", "#ffa0a0");
        run.addLog(`Robbed ${s.rival.name} while they bled.`);
      } else {
        run.flags.rival = "ignored";
        await this.game.dialog([{ speaker: s.rival.name, text: "Wow. Okay. Cool. Cool cool cool." }]);
        run.addLog(`Walked away from ${s.rival.name}.`);
      }
      return;
    }
    if (n === 4) {
      if (fs.talked.includes(e.id + ":gone")) return;
      if (run.flags.rival === "helped") {
        await this.game.dialog(St.rivalReturnScript(s, true));
        const g = genGear(run.rng("rivalgift"), 9, 3, "trinket");
        g.name = `${s.rival.name.split(" ")[0]}'s Lucky Token`;
        run.addGear(g);
        this.game.toast(`Received ${g.name}!`, "#d070ff");
      } else if (run.flags.rival === "robbed") {
        await this.game.dialog(St.rivalReturnScript(s, false));
        run.unlock("rivalfight");
        const res = await this.battle([rivalBoss(run)], { boss: true, music: "boss" });
        if (res !== "win") return;
        await this.game.dialog([{ speaker: s.rival.name, text: "...Fine. You win. This time. Enjoy the finale. I hope it eats you." }]);
      } else {
        await this.game.dialog([{ speaker: s.rival.name, text: "Oh. It's you. The one who walked away. ...Good luck down there, I guess." }]);
      }
      fs.talked.push(e.id + ":gone");
    }
  }

  private async talkGuide(e: Entity) {
    const run = this.run;
    const s = run.story;
    const fs = run.fstate;
    if (this.floor.n === 2) {
      if (!fs.talked.includes(e.id)) {
        await this.game.dialog(St.guideMeetScript(s));
        fs.talked.push(e.id);
        this.countTalk();
        run.addLog(`Met ${s.guide.name} of ${s.guide.group}.`);
        fs.talked.push(e.id + ":gone");
        this.game.toast(`${s.guide.name} slips back into the shadows.`);
      }
      return;
    }
    if (this.floor.n === 4 && run.flags.rebel === undefined) {
      await this.game.dialog(St.twistRevealScript(s));
      run.addLog(`The truth: ${twistSummary(run)}`);
      await this.game.dialog(St.rebelOfferScript(s));
      const c = await this.game.choose("Upload 'Dead Air' to the broadcast?", ["Upload it. End the show.", "Not like this."]);
      run.flags.rebel = c === 0;
      if (c === 0) {
        run.unlock("rebel");
        await this.game.dialog([
          { speaker: s.guide.name, text: "It's done. Nobody will notice until it's too late. Probably. Go." },
          { speaker: "SYSTEM", text: "...I didn't see anything.", style: "system" },
        ]);
        run.addLog("Uploaded the Dead Air virus to the broadcast.");
      } else {
        await this.game.dialog([{ speaker: s.guide.name, text: "I understand. I don't agree. But I understand. The finale's yours, crawler." }]);
        run.addLog("Refused to upload the Dead Air virus.");
      }
      fs.talked.push(e.id);
      return;
    }
    await this.game.dialog([{ speaker: s.guide.name, text: "Keep moving. The cameras are turning this way." }]);
  }

  private async talkSponsor(e: Entity) {
    const run = this.run;
    const s = run.story;
    if (run.flags.sponsor !== undefined) {
      await this.game.dialog([{ speaker: s.sponsor.rep, text: run.flags.sponsor ? `Remember: ${s.sponsor.slogan}` : "The offer's off the table. Mostly. Call me." }]);
      return;
    }
    await this.game.dialog(St.sponsorOfferScript(s));
    const c = await this.game.choose(`Sign with ${s.sponsor.name}?`, ["Sign the contract", "Decline"]);
    run.flags.sponsor = c === 0;
    if (c === 0) {
      run.addGold(300);
      run.unlock("sponsored");
      await this.game.dialog(St.sponsorAccept(s));
      run.addLog(`Signed a sponsorship deal with ${s.sponsor.name}.`);
    } else {
      run.addViewers(4000);
      await this.game.dialog(St.sponsorDecline(s));
      run.addLog(`Declined ${s.sponsor.name}'s sponsorship.`);
    }
    run.fstate.talked.push(e.id);
  }

  private async bossEncounter() {
    const run = this.run;
    const s = run.story;
    const n = this.floor.n;
    if (n === 5) {
      await finalSequence(this.game, this);
      return;
    }
    const plan = s.floors[n - 1];
    const boss = this.bossInst ?? floorBoss(run, n);
    await this.game.dialog([
      { speaker: "SYSTEM", text: `${St.sysLine(s, "bossIntro", run.rng("bi" + n))}  FLOOR BOSS: ${plan.boss.name.toUpperCase()}, ${plan.boss.epithet.toUpperCase()}.`, style: "system" },
      { speaker: plan.boss.name, text: plan.boss.taunt, style: "villain" },
    ]);
    const res = await this.battle([{ ...boss, stats: { ...boss.stats }, hp: boss.stats.maxHp, status: {} }], { boss: true, music: "boss" });
    if (res !== "win") return;
    run.fstate.bossDefeated = true;
    run.unlock("boss1");
    run.addLog(`Defeated ${plan.boss.name} ${plan.boss.epithet}.`);
    await this.game.dialog([{ speaker: plan.boss.name, text: plan.boss.death, style: "villain" }, ...St.villainBroadcast(s, n)]);
    run.addBox("Boss", plan.boss.name);
    this.game.toast("Received a Boss Box!", "#c040ff");
  }

  private async stairs() {
    const run = this.run;
    if (this.floor.n === 5) {
      await this.game.dialog([{ speaker: "", text: "There are no more stairs. Only the Crystal, and whoever is standing in front of it." }]);
      return;
    }
    if (!run.fstate.bossDefeated) {
      const plan = run.story.floors[this.floor.n - 1];
      await this.game.dialog([{ speaker: "SYSTEM", text: `The stairwell is sealed. Defeat ${plan.boss.name} first. Rules are rules.`, style: "system" }]);
      return;
    }
    const c = await this.game.choose(`Descend to floor ${this.floor.n + 1}? There's no coming back.`, ["Descend", "Not yet"], undefined, 1);
    if (c !== 0) return;
    if (run.timeLeft > run.story.floors[this.floor.n - 1].timer / 2) run.unlock("speedrun");
    audio.sfx("stairs");
    descend(this.game);
  }

  // ------------------------------------------------------------- draw
  draw(ctx: Ctx) {
    const f = this.floor;
    const [ppx, ppy] = this.playerPixel();
    const tx = Math.round(ppx + 8 - W / 2);
    const ty = Math.round(ppy + 8 - H / 2);
    this.camX = Math.max(-16, Math.min(f.w * TILE - W + 16, tx));
    this.camY = Math.max(-32, Math.min(f.h * TILE - H + 16, ty));
    const cx = this.camX;
    const cy = this.camY;
    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, W, H);
    ctx.drawImage(this.mapCanvas, -cx, -cy);

    const fs = this.run.fstate;
    const t = this.t;
    type D = { y: number; fn: () => void };
    const draws: D[] = [];
    const vis = (x: number, y: number) => this.explored[y * f.w + x] === 1;

    for (const e of f.entities) {
      if (!vis(e.x, e.y) && !(e.data.wall && vis(e.x, e.y + 1))) continue;
      const X = e.x * TILE - cx;
      const Y = e.y * TILE - cy;
      if (X < -48 || Y < -48 || X > W + 48 || Y > H + 48) continue;
      switch (e.type) {
        case "torch":
          drawTorch(ctx, X + 4, Y + 1, t + e.x);
          break;
        case "poster": {
          const hue = (e.data.seed ?? 0) % 360;
          ctx.fillStyle = "#181018";
          ctx.fillRect(X + 3, Y + 2, 10, 12);
          ctx.fillStyle = `hsl(${hue},60%,60%)`;
          ctx.fillRect(X + 4, Y + 3, 8, 10);
          ctx.fillStyle = "#fff";
          ctx.fillRect(X + 5, Y + 5, 6, 1);
          ctx.fillRect(X + 5, Y + 8, 4, 1);
          ctx.fillRect(X + 5, Y + 10, 5, 1);
          break;
        }
        case "trap":
          if (fs.sprung.includes(e.id)) ctx.drawImage(props.spikes(), X, Y);
          else if (this.hasRogue() && this.visible[e.y * f.w + e.x]) {
            ctx.strokeStyle = `rgba(255,80,80,${0.4 + 0.3 * Math.sin(t * 5)})`;
            ctx.strokeRect(X + 3.5, Y + 3.5, 9, 9);
          }
          break;
        case "note":
          ctx.drawImage(props.note(), X, Y);
          break;
        case "questitem": {
          const q = this.run.quest();
          if (q && q.kind === "fetch" && !q.done && !fs.opened.includes(e.id)) {
            ctx.fillStyle = Math.floor(t * 6) % 2 ? "#ffffa0" : "#ffe040";
            ctx.fillRect(X + 7, Y + 6, 2, 2);
            ctx.fillRect(X + 5, Y + 7, 6, 1);
            ctx.fillRect(X + 7, Y + 4, 1, 6);
          }
          break;
        }
        case "upstairs":
          ctx.fillStyle = "rgba(255,240,200,0.12)";
          ctx.fillRect(X + 2, Y - 16, 12, 30);
          ctx.fillStyle = "#6a4a2a";
          ctx.fillRect(X + 4, Y - 14, 1, 26);
          ctx.fillRect(X + 11, Y - 14, 1, 26);
          for (let k = 0; k < 6; k++) ctx.fillRect(X + 4, Y - 12 + k * 4, 8, 1);
          break;
        case "bones":
          if (!fs.opened.includes(e.id)) draws.push({ y: Y - 100, fn: () => ctx.drawImage(props.bones(), X, Y) });
          break;
        case "barrel":
          if (!fs.opened.includes(e.id)) draws.push({ y: Y + 15, fn: () => ctx.drawImage(props.barrel(), X, Y) });
          break;
        case "chest":
          draws.push({ y: Y + 14, fn: () => ctx.drawImage(props.chest(fs.opened.includes(e.id)), X, Y) });
          break;
        case "crystal":
          draws.push({ y: Y + 15, fn: () => drawCrystal(ctx, X + 8, Y - 14, t) });
          break;
        case "boss":
          if (!fs.bossDefeated && this.bossSprite) {
            const bob = Math.round(Math.sin(t * 2) * 1.5);
            draws.push({
              y: Y + 15,
              fn: () => {
                drawShadow(ctx, X + 8, Y + 16, 20);
                ctx.drawImage(this.bossSprite!, X - 8, Y - 16 + bob);
              },
            });
          }
          break;
        case "vendor":
        case "bartender":
        case "npc":
        case "rival":
        case "guide":
        case "oldtimer":
        case "sponsor": {
          if (fs.talked.includes(e.id + ":gone")) break;
          const look = this.npcLook(e);
          const frames = heroFrames(look, "down");
          draws.push({
            y: Y + 15,
            fn: () => {
              drawShadow(ctx, X + 8, Y + 16);
              ctx.drawImage(frames[0], X, Y - 4);
              if (this.hasNews(e)) {
                const by = Y - 12 + Math.round(Math.sin(t * 5) * 1.5);
                ctx.fillStyle = "#181420";
                ctx.fillRect(X + 6, by - 1, 5, 9);
                ctx.fillStyle = "#ffe040";
                ctx.fillRect(X + 7, by, 3, 5);
                ctx.fillRect(X + 7, by + 6, 3, 1);
              }
            },
          });
          break;
        }
      }
    }

    // the Crystal itself waits on the final floor, where the stairs would be
    if (f.n === 5 && vis(f.stairs.x, f.stairs.y)) {
      const X = f.stairs.x * TILE - cx + 8;
      const Y = f.stairs.y * TILE - cy;
      draws.push({ y: Y - 200, fn: () => drawBigCrystal(ctx, X, Y - 6, 12, t, 270) });
    }

    // monsters
    for (const m of this.enemies) {
      if (!this.visible[m.y * f.w + m.x] && !(m.moving && this.visible[m.fy * f.w + m.fx])) continue;
      const k = m.moving ? m.t : 1;
      const X = Math.round((m.fx + (m.x - m.fx) * k) * TILE - cx);
      const Y = Math.round((m.fy + (m.y - m.fy) * k) * TILE - cy);
      const bob = Math.round(Math.abs(Math.sin(t * (m.chase ? 10 : 4) + m.ent.x)) * -2);
      draws.push({
        y: Y + 15,
        fn: () => {
          drawShadow(ctx, X + 8, Y + 16);
          if (m.stun > 0 && Math.floor(t * 10) % 2) return;
          ctx.drawImage(m.sprite, X, Y + bob - 2);
          const size = m.ent.data.group!.length;
          if (size > 1) drawText(ctx, `×${size}`, X + 12, Y - 4, { color: "#ffd0d0" });
          if (m.chase) drawText(ctx, "!", X + 6, Y - 12, { color: "#ff4040" });
        },
      });
    }

    // pet
    {
      const pk = Math.min(1, this.moveT);
      const PX = Math.round((this.petPos.fx + (this.petPos.x - this.petPos.fx) * pk) * TILE - cx);
      const PY = Math.round((this.petPos.fy + (this.petPos.y - this.petPos.fy) * pk) * TILE - cy);
      const faceLeft = this.petPos.x > this.px || (this.petPos.x === this.px && this.dir === "left");
      const frames = petFrames(this.run.pet.species!, faceLeft);
      draws.push({
        y: PY + 15,
        fn: () => {
          drawShadow(ctx, PX + 8, PY + 16);
          ctx.drawImage(frames[Math.floor(this.walkPhase) % 2], PX, PY - 2);
        },
      });
    }

    // player
    {
      const X = Math.round(ppx - cx);
      const Y = Math.round(ppy - cy);
      const frames = heroFrames(this.run.hero.look!, this.dir);
      const fi = this.moveT < 1 ? Math.floor(this.walkPhase) % frames.length : 0;
      draws.push({
        y: Y + 15.5,
        fn: () => {
          drawShadow(ctx, X + 8, Y + 16);
          if (this.invuln > 0 && Math.floor(t * 12) % 2) return;
          ctx.drawImage(frames[fi], X, Y - 4);
          if (this.swingT > 0) {
            const [dx, dy] = DIRS[this.dir];
            ctx.strokeStyle = "rgba(255,255,255,0.9)";
            ctx.beginPath();
            const a0 = Math.atan2(dy, dx) - 1 + (1 - this.swingT / 0.2) * 2;
            ctx.arc(X + 8 + dx * 6, Y + 8 + dy * 6, 9, a0 - 0.6, a0);
            ctx.stroke();
          }
        },
      });
    }

    draws.sort((a, b) => a.y - b.y);
    for (const d of draws) d.fn();

    this.drawLighting(ctx, cx, cy);
    this.drawPrompt(ctx, cx, cy);
    this.drawHud(ctx);
  }

  private hasNews(e: Entity): boolean {
    const run = this.run;
    const fs = run.fstate;
    if (e.type === "npc" && e.data.quest) {
      const q = run.quest();
      if (!q && !fs.questTaken) return true;
      if (q && q.done && !q.rewarded) return true;
      return false;
    }
    if (e.type === "rival" || e.type === "guide" || e.type === "oldtimer") return !fs.talked.includes(e.id) && !(this.floor.n === 3 && e.type === "rival" && run.flags.rival);
    if (e.type === "sponsor") return run.flags.sponsor === undefined;
    if (e.type === "bartender") return !fs.talked.includes(e.id);
    return false;
  }

  private npcLook(e: Entity): Look {
    const seed = e.data.lookSeed ?? 1;
    if (e.type === "rival") {
      const s = this.run.story;
      return classLook(s.rival.cls, s.rival.lookSeed % 5, s.rival.lookSeed % 7);
    }
    const base = lookFor(seed);
    if (e.type === "vendor") return { head: "bald", pal: { ...base.pal, s: "#78c878", S: "#50a050", c: "#6a3a8a", C: "#40205a", a: "#f0c840" } };
    if (e.type === "bartender") return { head: "hair", pal: { ...base.pal, c: "#e8e8e8", C: "#a8a8b0", a: "#3a2a2a" } };
    if (e.type === "sponsor") return { head: "bald", pal: { ...base.pal, s: "#a080f0", S: "#7050c0", c: "#202028", C: "#101014", a: "#40e0b0" } };
    if (e.type === "guide") return { head: "mage", pal: { ...base.pal, t: "#2a2a3a", T: "#16161e", c: "#2a2a3a", C: "#16161e", a: "#606070" } };
    if (e.type === "oldtimer") return { head: "bald", pal: { ...base.pal, c: "#706050", C: "#4a4034" } };
    return base;
  }

  private drawLighting(ctx: Ctx, cx: number, cy: number) {
    const f = this.floor;
    const d = this.lightData.data;
    const amb = this.theme.ambient;
    const torches = f.entities.filter((e) => e.type === "torch");
    const flick = 0.06 * Math.sin(this.t * 9) + 0.04 * Math.sin(this.t * 23);
    const [ppx, ppy] = this.playerPixel();
    const pcx = ppx / TILE;
    const pcy = ppy / TILE;
    const x0 = Math.max(0, Math.floor(cx / TILE) - 2);
    const y0 = Math.max(0, Math.floor(cy / TILE) - 2);
    const x1 = Math.min(f.w - 1, Math.ceil((cx + W) / TILE) + 2);
    const y1 = Math.min(f.h - 1, Math.ceil((cy + H) / TILE) + 2);
    const nearTorches = torches.filter((tt) => tt.x >= x0 - 6 && tt.x <= x1 + 6 && tt.y >= y0 - 6 && tt.y <= y1 + 6);
    for (let y = y0; y <= y1; y++)
      for (let x = x0; x <= x1; x++) {
        const i = y * f.w + x;
        let L = 0;
        if (this.visible[i]) {
          const dd = Math.hypot(x - pcx, y - pcy);
          L = Math.max(amb, Math.min(1, 1.15 - dd / 7.5 + flick * 0.3));
          for (const tt of nearTorches) {
            const td = Math.hypot(x - tt.x, y - tt.y - 0.5);
            if (td < 5) L = Math.max(L, 0.95 - td / 5.5 + flick);
          }
          if (f.tiles[i] === T_SAFE) L = Math.max(L, 0.9);
        } else if (this.explored[i]) L = 0.2;
        const a = Math.round(255 * (1 - Math.max(0, Math.min(1, L))));
        const p = i * 4;
        d[p] = 4;
        d[p + 1] = 2;
        d[p + 2] = 14;
        d[p + 3] = a;
      }
    this.lightCtx.putImageData(this.lightData, 0, 0);
    ctx.save();
    ctx.imageSmoothingEnabled = true;
    ctx.drawImage(this.lightCanvas, -cx - TILE / 2, -cy - TILE / 2, f.w * TILE, f.h * TILE);
    ctx.restore();
    // warm vignette when the timer is low
    if (this.run.timeLeft < 60) {
      ctx.fillStyle = `rgba(255,0,0,${0.08 + 0.06 * Math.sin(this.t * 6)})`;
      ctx.fillRect(0, 0, W, H);
    }
  }

  private drawPrompt(ctx: Ctx, cx: number, cy: number) {
    if (this.busy || this.moveT < 1) return;
    const [fx, fy] = this.facing();
    const ent = this.entityAt(fx, fy) ?? this.wallEntityAt(fx, fy);
    const me = this.enemyAt(fx, fy);
    if (!ent && !me) return;
    const X = fx * TILE - cx + 4;
    const Y = fy * TILE - cy - 18 + Math.round(Math.sin(this.t * 6));
    drawWindow(ctx, X - 2, Y - 2, 13, 12);
    drawText(ctx, me ? "!" : "Z", X + 4 - (me ? 0 : 1), Y + 1, { color: me ? "#ff6060" : "#ffffff", align: "left" });
  }

  private drawHud(ctx: Ctx) {
    const run = this.run;
    const f = this.floor;
    const plan = run.story.floors[f.n - 1];
    // floor + timer
    const title = `F${f.n}  ${plan.name}`;
    drawWindow(ctx, 4, 4, Math.max(110, measure(title) + 14), 26, undefined, 0.92);
    drawText(ctx, title, 10, 8, { color: "#ffe080" });
    const low = run.timeLeft < 60;
    drawText(ctx, `COLLAPSE IN ${formatTime(run.timeLeft)}`, 10, 18, { color: low ? (Math.floor(this.t * 4) % 2 ? "#ff4040" : "#ffa0a0") : "#c8d0f0" });
    // live viewers, tucked under the minimap
    const vx = W - 96;
    const vy = f.h + 14;
    drawWindow(ctx, vx, vy, 92, 16, undefined, 0.92);
    ctx.fillStyle = Math.floor(this.t * 2) % 2 ? "#ff3040" : "#801020";
    ctx.fillRect(vx + 6, vy + 5, 5, 5);
    drawText(ctx, `LIVE ${formatNum(run.viewers)}`, vx + 14, vy + 4, { color: "#ffb0c0" });
    // minimap
    this.drawMinimap(ctx);
    if (this.busy) return;
    // party
    const ph = run.party.length * 13 + 8;
    drawWindow(ctx, 4, H - ph - 4, 120, ph, undefined, 0.92);
    run.party.forEach((h, i) => {
      const st = run.statsOf(h);
      const y = H - ph + i * 13;
      drawText(ctx, h.name.slice(0, 9), 10, y, { color: h.hp <= 0 ? "#ff6060" : "#ffffff" });
      drawBar(ctx, 64, y + 2, 54, 3, h.hp / st.maxHp, h.hp / st.maxHp < 0.25 ? "#ff5050" : "#50e070");
      drawBar(ctx, 64, y + 7, 54, 2, st.maxMp ? h.mp / st.maxMp : 0, "#60a0ff");
    });
    // hype + boxes
    const boxes = run.boxes.length;
    if (boxes) {
      drawWindow(ctx, W - 92, H - 20, 88, 16, undefined, 0.92);
      drawText(ctx, `${boxes} unopened box${boxes > 1 ? "es" : ""}`, W - 48, H - 16, { color: Math.floor(this.t * 2) % 2 ? "#ffe040" : "#ffb040", align: "center" });
    }
    const q = run.quest();
    if (q && !q.rewarded) {
      const txt = q.done ? `Quest: return to ${q.giver.split(" ")[0]}` : q.kind === "kill" ? `Quest: ${q.have}/${q.need} ${q.target}s` : `Quest: find the ${q.target}`;
      drawText(ctx, txt, 130, H - 14, { color: q.done ? "#a0ffa0" : "#d0d0f0" });
    }
  }

  private drawMinimap(ctx: Ctx) {
    const f = this.floor;
    if (this.miniDirty) {
      const mctx = this.mini.getContext("2d")!;
      mctx.clearRect(0, 0, f.w, f.h);
      for (let y = 0; y < f.h; y++)
        for (let x = 0; x < f.w; x++) {
          const i = y * f.w + x;
          if (!this.explored[i] || f.tiles[i] === T_WALL) continue;
          mctx.fillStyle = f.tiles[i] === T_SAFE ? "#40c080" : f.tiles[i] === T_STAIRS ? "#ffe040" : "#8890b0";
          mctx.fillRect(x, y, 1, 1);
        }
      this.miniDirty = false;
    }
    const mw = f.w;
    const mh = f.h;
    const x = W - mw - 10;
    const y = 6;
    ctx.fillStyle = "rgba(8,8,24,0.75)";
    ctx.fillRect(x - 2, y - 2, mw + 4, mh + 4);
    ctx.drawImage(this.mini, x, y);
    if (Math.floor(this.t * 4) % 2) {
      ctx.fillStyle = "#ff4040";
      ctx.fillRect(x + this.px - 1, y + this.py - 1, 3, 3);
    }
    const b = this.floor.entities.find((e) => e.type === "boss");
    if (b && !this.run.fstate.bossDefeated && this.explored[b.y * f.w + b.x]) {
      ctx.fillStyle = "#c040ff";
      ctx.fillRect(x + b.x - 1, y + b.y - 1, 3, 3);
    }
  }

  /** Called by the finale module after the last battle. */
  setBusy(b: boolean) {
    this.busy = b;
  }
}

function audioMood(): string {
  return audio.currentMood();
}

function nameFrom(r: RNG): string {
  const F = ["Bertram", "Ysolde", "Gwen", "Tobias", "Marisol", "Dorian", "Pip", "Agatha", "Rook", "Sable", "Fennick", "Imelda", "Corvin", "Lettie", "Oswin", "Juniper", "Hollis", "Brigid", "Wren", "Ezra", "Mabel", "Nim", "Gus", "Odette", "Barnaby", "Kiko", "Ramona", "Zeke"];
  const L = ["the Lost", "of Floor 2", "the Damp", "the Hopeful", "Twelve-Toes", "the Unlucky", "the Loud", "No-Pants", "the Accountant", "the Third"];
  return `${r.pick(F)} ${r.pick(L)}`;
}

function twistSummary(run: Run): string {
  const s = run.story;
  switch (s.twist) {
    case "crystal":
      return `the ${s.crystal} IS the broadcast, and it's suffering.`;
    case "systemally":
      return `${s.system.name} has been secretly helping you all along.`;
    case "petroyal":
      return `${s.pet.name} is ${s.pet.royal}, cursed royal heir of ${s.world}.`;
    case "rerun":
      return `you've done this before. This is your second season.`;
    default:
      return `the audience is the people of ${s.world}, trapped in the Crystal.`;
  }
}
