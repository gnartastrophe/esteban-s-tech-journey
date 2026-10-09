// Side-view ATB battles. Gauges fill by speed; when a hero's fills, a command
// menu opens (time pauses in Wait mode). The audience is always watching:
// crits, weakness hits and kills earn viewers and Hype, and a full Hype bar
// unlocks each character's Showstopper.

import { audio, Mood } from "../engine/audio";
import { drawText, drawTitle, measure, wrap } from "../engine/font";
import { Ctx, drawBar, drawHand, drawSystemWindow, drawWindow, formatNum, H, makeCanvas, tintCanvas, W } from "../engine/gfx";
import { genMonster } from "../engine/monsters";
import { RNG } from "../engine/rng";
import { heroFrames, petFrames, props } from "../engine/sprites";
import { drawBattleBg, Theme } from "../engine/tiles";
import { CONSUMABLES } from "../data/items";
import { Skill, skill as getSkill, SKILLS } from "../data/skills";
import { fleeChance, healAmount, rollHit } from "../combat";
import { Game, Scene } from "../Game";
import { BATTLE_CHATTER, say, sysLine } from "../gen/story";
import type { LevelUp, Run } from "../run";
import type { Element, EnemyInstance, Hero, Stats, StatusKey, StatusMap } from "../types";
import { BattleFx } from "./battlefx";
import { ListMenu, MenuItem } from "./widgets";

export type BattleResult = "win" | "flee" | "lose";

export interface BattleOpts {
  mode: "normal" | "firststrike" | "ambush";
  canFlee: boolean;
  music: "battle" | "boss" | "final";
  theme: Theme;
  onEnd: (r: BattleResult) => void;
  noResults?: boolean;
}

interface Fighter {
  side: "party" | "enemy";
  hero?: Hero;
  foe?: EnemyInstance;
  atb: number;
  hx: number;
  hy: number;
  ox: number;
  flash: number;
  shake: number;
  dying: number;
  dead: boolean;
  sprite?: HTMLCanvasElement;
  white?: HTMLCanvasElement;
  turns: number;
  usedCommercial?: boolean;
  jump: number;
}

interface Action {
  actor: Fighter;
  kind: "skill" | "item" | "defend" | "flee";
  skill?: Skill;
  item?: string;
  targets: Fighter[];
}

type Stage = "root" | "skill" | "item" | "target";

interface Command {
  f: Fighter;
  stage: Stage;
  root: ListMenu;
  sub: ListMenu | null;
  pending: { skill?: Skill; item?: string; showstopper?: boolean } | null;
  targetSide: "party" | "enemy";
  targetIdx: number;
  targetAll: boolean;
  koOnly: boolean;
  prevStage: Stage;
}

const SKILL_LABEL: Record<string, string> = { knight: "Technique", mage: "Hex", cleric: "Prayer", rogue: "Trick" };

export class BattleScene implements Scene {
  opaque = true;
  private run: Run;
  private party: Fighter[] = [];
  private foes: Fighter[] = [];
  private bg: HTMLCanvasElement;
  private fx = new BattleFx();
  private queue: Action[] = [];
  private ready: Fighter[] = [];
  private acting = false;
  private cmd: Command | null = null;
  private state: "intro" | "run" | "victory" | "defeat" | "fled" | "done" = "intro";
  private t = 0;
  private banner: { text: string; t: number; color: string } | null = null;
  private chatter: { text: string; t: number } | null = null;
  private damageTaken = 0;
  private results: { lines: string[]; ups: LevelUp[] } | null = null;
  private resultT = 0;
  private killed: EnemyInstance[] = [];
  private lastKiller: Fighter | null = null;
  private waits: { t: number; res: () => void }[] = [];
  private rnd: () => number;
  private chargeWarned = false;

  constructor(private game: Game, enemies: EnemyInstance[], private opts: BattleOpts) {
    this.run = game.run!;
    const seed = Math.floor(Math.random() * 1e9);
    const r = new RNG(seed);
    this.rnd = () => r.next();
    this.bg = drawBattleBg(opts.theme, this.run.floorN * 977 + (enemies[0]?.spriteSeed ?? 1));
    // party on the right
    this.run.party.forEach((h, i) => {
      this.party.push(this.mk("party", { hero: h, hx: 296 + i * 12, hy: 102 + i * 22 }));
    });
    // enemies on the left
    const n = enemies.length;
    const slots: [number, number][][] = [
      [[112, 124]],
      [[78, 108], [160, 132]],
      [[70, 100], [164, 112], [100, 142]],
      [[60, 100], [150, 100], [80, 142], [170, 142]],
    ];
    enemies.forEach((e, i) => {
      if (!e.boss && !e.special) e.size = 40;
      const [x, y] = e.size >= 48 ? [118, e.size >= 64 ? 140 : 132] : slots[Math.min(3, n - 1)][i] ?? [60 + i * 40, 120];
      const f = this.mk("enemy", { foe: e, hx: x, hy: y });
      f.sprite = this.enemySprite(e);
      f.white = tintCanvas(f.sprite, "#ffffff");
      this.foes.push(f);
    });
    // opening ATB
    for (const f of this.all()) {
      const spdBias = Math.min(0.4, this.statsOf(f).spd / 60);
      if (opts.mode === "firststrike") f.atb = f.side === "party" ? 1 : 0;
      else if (opts.mode === "ambush") f.atb = f.side === "enemy" ? 0.85 + Math.random() * 0.15 : 0;
      else f.atb = Math.random() * 0.4 + spdBias;
    }
    this.run.stats.battles++;
  }

  private mk(side: "party" | "enemy", p: Partial<Fighter>): Fighter {
    return { side, atb: 0, hx: 0, hy: 0, ox: 0, flash: 0, shake: 0, dying: 0, dead: false, turns: 0, jump: 0, ...p };
  }

  private enemySprite(e: EnemyInstance): HTMLCanvasElement {
    if (e.special === "mimic") {
      const [c, ctx] = makeCanvas(32, 32);
      ctx.drawImage(props.chest(true), 0, 0, 16, 16, 0, 0, 32, 32);
      ctx.fillStyle = "#e04060";
      ctx.fillRect(10, 14, 12, 6);
      ctx.fillRect(14, 20, 6, 4);
      ctx.fillStyle = "#ffffff";
      for (let i = 0; i < 6; i++) {
        ctx.fillRect(5 + i * 4, 12, 2, 3);
        ctx.fillRect(6 + i * 4, 15, 2, 2);
      }
      ctx.fillStyle = "#ffe040";
      ctx.fillRect(9, 4, 3, 3);
      ctx.fillRect(20, 4, 3, 3);
      return c;
    }
    const portrait = e.special === "person" ? this.game.portraits.get(e.name) : undefined;
    if (portrait) {
      // people fight at triple scale, facing the party, wreathed in a menacing aura
      const [c, ctx] = makeCanvas(portrait.width * 3 + 8, portrait.height * 3 + 4);
      ctx.translate(c.width, 0);
      ctx.scale(-1, 1);
      const aura = tintCanvas(portrait, e.bossKind === "rival" ? "#40a0ff" : "#ff2050");
      ctx.globalAlpha = 0.5;
      for (const [dx, dy] of [[-2, 0], [2, 0], [0, -2], [0, 2]]) ctx.drawImage(aura, 4 + dx, 2 + dy, portrait.width * 3, portrait.height * 3);
      ctx.globalAlpha = 1;
      ctx.drawImage(portrait, 4, 2, portrait.width * 3, portrait.height * 3);
      return c;
    }
    return genMonster(e.spriteSeed, e.arch, e.pal, { size: e.size, boss: e.boss });
  }

  onEnter() {
    this.game.music(this.opts.music as Mood, this.run.stats.battles % 3);
    const banner = this.opts.mode === "firststrike" ? "FIRST STRIKE!" : this.opts.mode === "ambush" ? "AMBUSHED!" : null;
    if (banner) this.showBanner(banner, this.opts.mode === "ambush" ? "#ff8080" : "#80ff80");
    if (this.opts.mode === "firststrike") this.run.unlock("firststrike");
    if (this.opts.mode === "ambush") this.run.unlock("ambushed");
  }

  // ---------------------------------------------------------------- helpers
  private all(): Fighter[] {
    return [...this.party, ...this.foes];
  }
  private alive(side: "party" | "enemy"): Fighter[] {
    return (side === "party" ? this.party : this.foes).filter((f) => this.hp(f) > 0 && !f.dead);
  }
  private hp(f: Fighter): number {
    return f.hero ? f.hero.hp : f.foe!.hp;
  }
  private setHp(f: Fighter, v: number) {
    const max = this.statsOf(f).maxHp;
    v = Math.max(0, Math.min(max, Math.round(v)));
    if (f.hero) f.hero.hp = v;
    else f.foe!.hp = v;
  }
  private status(f: Fighter): StatusMap {
    return f.hero ? f.hero.status : f.foe!.status;
  }
  private name(f: Fighter): string {
    return f.hero ? f.hero.name : f.foe!.name;
  }
  private statsOf(f: Fighter): Stats {
    if (f.hero) return this.run.statsOf(f.hero);
    const s = { ...f.foe!.stats };
    const st = f.foe!.status;
    if (st.weaken) s.atk = Math.round(s.atk * 0.7);
    if (st.break) s.def = Math.round(s.def * 0.6);
    if (st.haste) s.spd = Math.round(s.spd * 1.5);
    return s;
  }
  private opponents(f: Fighter) {
    return this.alive(f.side === "party" ? "enemy" : "party");
  }
  private allies(f: Fighter) {
    return this.alive(f.side);
  }
  private center(f: Fighter): [number, number] {
    if (f.side === "enemy") {
      const s = f.foe!.size;
      return [f.hx, f.hy - s / 2];
    }
    return [f.hx + 8 + f.ox, f.hy - 10];
  }

  private sleep(sec: number): Promise<void> {
    const speed = [1, 1.35, 1, 0.65][this.game.settings.battleSpeed] ?? 1;
    return new Promise((res) => this.waits.push({ t: sec * speed, res }));
  }

  private showBanner(text: string, color = "#ffffff") {
    this.banner = { text, t: 1.4, color };
  }

  private say(text: string) {
    this.chatter = { text, t: 3.2 };
  }

  private viewers(n: number, chat = false) {
    this.run.addViewers(n);
    if (chat && this.rnd() < 0.5) this.say(say(this.run.story, BATTLE_CHATTER, new RNG(Math.floor(this.rnd() * 1e9)), { viewers: formatNum(this.run.viewers) }));
  }

  // ---------------------------------------------------------------- update
  update(dt: number) {
    this.t += dt;
    this.fx.update(dt);
    for (const w of this.waits) w.t -= dt;
    const fire = this.waits.filter((w) => w.t <= 0);
    this.waits = this.waits.filter((w) => w.t > 0);
    fire.forEach((w) => w.res());
    for (const f of this.all()) {
      f.flash = Math.max(0, f.flash - dt);
      f.shake = Math.max(0, f.shake - dt);
      if (f.dying > 0 && f.dying < 1) f.dying = Math.min(1, f.dying + dt * 1.6);
      if (f.jump > 0) f.jump += dt;
    }
    if (this.banner) {
      this.banner.t -= dt;
      if (this.banner.t <= 0) this.banner = null;
    }
    if (this.chatter) {
      this.chatter.t -= dt;
      if (this.chatter.t <= 0) this.chatter = null;
    }

    switch (this.state) {
      case "intro":
        if (this.t > 0.7) {
          this.state = "run";
          this.acting = true;
          this.introInfo().then(() => (this.acting = false));
        }
        return;
      case "run":
        break;
      case "victory":
        this.resultT += dt;
        if (this.resultT > 0.8 && this.game.input.pressed("confirm")) {
          audio.sfx("confirm");
          this.state = "done";
          this.opts.onEnd("win");
        }
        return;
      case "defeat":
        this.resultT += dt;
        if (this.resultT > 2.2) {
          this.state = "done";
          this.opts.onEnd("lose");
        }
        return;
      case "fled":
        this.resultT += dt;
        if (this.resultT > 0.8) {
          this.state = "done";
          this.opts.onEnd("flee");
        }
        return;
      default:
        return;
    }

    if (this.acting) return;
    this.checkEnd();
    if (this.state !== "run") return;
    if (this.queue.length) {
      const a = this.queue.shift()!;
      this.acting = true;
      this.perform(a)
        .catch((e) => console.error(e))
        .finally(() => {
          this.acting = false;
          this.checkEnd();
        });
      return;
    }
    if (this.cmd) this.updateCommand();
    if (!this.cmd || this.game.settings.battleMode === "active") this.tickAtb(dt);
    if (!this.cmd && this.ready.length) this.openCommand(this.ready[0]);
  }

  private async introInfo() {
    const run = this.run;
    const lines = [];
    for (const f of this.foes) {
      const e = f.foe!;
      const key = e.boss ? "boss:" + e.name : e.name;
      if (run.seen.includes(key)) continue;
      run.seen.push(key);
      if (lines.length < 2) lines.push({ speaker: "SYSTEM", text: `${e.boss ? "BOSS" : "MONSTER"} INFO: ${e.name.toUpperCase()} (Lv ${e.level}). ${e.desc}`, style: "system" as const });
    }
    if (lines.length) await this.game.dialog(lines);
  }

  private tickAtb(dt: number) {
    const mult = [0, 0.7, 1, 1.5][this.game.settings.battleSpeed] ?? 1;
    for (const f of this.all()) {
      if (this.hp(f) <= 0 || f.dead) continue;
      if (f.atb >= 1) continue;
      const spd = this.statsOf(f).spd;
      f.atb = Math.min(1, f.atb + (dt * mult * (spd + 25)) / 95);
      if (f.atb >= 1) this.onReady(f);
    }
  }

  /** Start-of-turn: statuses tick, stun skips, then the fighter acts. */
  private onReady(f: Fighter) {
    const st = this.status(f);
    const max = this.statsOf(f).maxHp;
    delete st.defend;
    if (st.poison) {
      const d = Math.max(1, Math.round(max * 0.07));
      this.setHp(f, this.hp(f) - d);
      const [x, y] = this.center(f);
      this.fx.number(x, y, String(d), "#a0ff80");
      this.fx.play("poison", x, y);
      if (this.hp(f) <= 0) {
        this.kill(f);
        return;
      }
    }
    if (st.regen) {
      const h = Math.max(1, Math.round(max * 0.08));
      this.setHp(f, this.hp(f) + h);
      const [x, y] = this.center(f);
      this.fx.number(x, y, String(h), "#60ff90");
    }
    for (const k of ["poison", "regen", "shield", "weaken", "break", "haste"] as StatusKey[]) {
      if (st[k]) {
        st[k]! -= 1;
        if (st[k]! <= 0) delete st[k];
      }
    }
    if (st.stun) {
      st.stun -= 1;
      if (st.stun <= 0) delete st.stun;
      f.atb = 0;
      const [x, y] = this.center(f);
      this.fx.number(x, y, "Stunned", "#ffe040");
      return;
    }
    f.turns++;
    if (f.side === "party") {
      if (!this.ready.includes(f)) this.ready.push(f);
    } else this.queue.push(this.enemyAction(f));
  }

  // ---------------------------------------------------------------- commands
  private openCommand(f: Fighter) {
    const h = f.hero!;
    const items: MenuItem[] = [
      { label: "Attack", value: "attack" },
      { label: h.kind === "pet" ? "Tricks" : SKILL_LABEL[h.cls] ?? "Skill", value: "skill" },
      { label: "Items", value: "item", disabled: !this.battleItems().length },
      { label: "Defend", value: "defend" },
      { label: "Flee", value: "flee", disabled: !this.opts.canFlee },
    ];
    if (this.run.hype >= 100) items.unshift({ label: "SHOWSTOPPER!", value: "show", color: "#ffe040" });
    this.cmd = { f, stage: "root", root: new ListMenu(items, 6, 11), sub: null, pending: null, targetSide: "enemy", targetIdx: 0, targetAll: false, koOnly: false, prevStage: "root" };
    audio.sfx("cursor");
  }

  private battleItems(): string[] {
    return Object.keys(this.run.inv.items).filter((k) => (this.run.inv.items[k] ?? 0) > 0 && CONSUMABLES[k]?.battle);
  }

  private updateCommand() {
    const c = this.cmd!;
    const inp = this.game.input;
    const h = c.f.hero!;
    if (this.hp(c.f) <= 0) {
      this.ready = this.ready.filter((x) => x !== c.f);
      this.cmd = null;
      return;
    }
    if (c.stage === "root") {
      const res = c.root.update(inp, false);
      // cycle between ready heroes with left/right? keep simple.
      if (res !== "confirm") return;
      const v = c.root.current!.value;
      if (c.root.current!.disabled) return;
      if (v === "attack") return this.beginTarget(SKILLS.attack, "root");
      if (v === "show") {
        const sk = getSkill(this.run.showstopperOf(h));
        c.pending = { skill: sk, showstopper: true };
        return this.beginTarget(sk, "root");
      }
      if (v === "defend") return this.commit({ actor: c.f, kind: "defend", targets: [c.f] });
      if (v === "flee") return this.commit({ actor: c.f, kind: "flee", targets: [] });
      if (v === "skill") {
        const items: MenuItem[] = h.skills.map((id) => {
          const sk = getSkill(id);
          return { label: sk.name, right: sk.mp ? `${sk.mp} MP` : "", disabled: sk.mp > h.mp, value: id };
        });
        c.sub = new ListMenu(items, 5, 11);
        c.stage = "skill";
        return;
      }
      if (v === "item") {
        const items: MenuItem[] = this.battleItems().map((k) => ({ label: CONSUMABLES[k].name, right: `×${this.run.inv.items[k]}`, value: k }));
        c.sub = new ListMenu(items, 5, 11);
        c.stage = "item";
        return;
      }
      return;
    }
    if (c.stage === "skill" || c.stage === "item") {
      const res = c.sub!.update(inp);
      if (res === "cancel") {
        c.stage = "root";
        c.sub = null;
        return;
      }
      if (res !== "confirm" || c.sub!.current?.disabled) return;
      if (c.stage === "skill") {
        const sk = getSkill(c.sub!.current!.value as string);
        c.pending = { skill: sk };
        return this.beginTarget(sk, "skill");
      }
      const key = c.sub!.current!.value as string;
      c.pending = { item: key };
      const ct = CONSUMABLES[key].target;
      const pseudo: Skill = { ...SKILLS.attack, id: "item", name: CONSUMABLES[key].name, target: ct === "ally" ? "ally" : ct === "koally" ? "koally" : ct === "enemies" ? "enemies" : "self" };
      return this.beginTarget(pseudo, "item");
    }
    if (c.stage === "target") {
      const list = this.targetList();
      if (!list.length) {
        audio.sfx("error");
        c.stage = c.prevStage;
        return;
      }
      if (!c.targetAll) {
        if (inp.repeat("up") || inp.repeat("left")) {
          c.targetIdx = (c.targetIdx + list.length - 1) % list.length;
          audio.sfx("cursor");
        }
        if (inp.repeat("down") || inp.repeat("right")) {
          c.targetIdx = (c.targetIdx + 1) % list.length;
          audio.sfx("cursor");
        }
      }
      if (inp.pressed("cancel") || inp.pressed("menu")) {
        audio.sfx("cancel");
        c.stage = c.prevStage;
        return;
      }
      if (inp.pressed("confirm")) {
        audio.sfx("confirm");
        const targets = c.targetAll ? list : [list[Math.min(c.targetIdx, list.length - 1)]];
        const p = c.pending ?? { skill: SKILLS.attack };
        if (p.item) this.commit({ actor: c.f, kind: "item", item: p.item, targets });
        else this.commit({ actor: c.f, kind: "skill", skill: p.skill ?? SKILLS.attack, targets });
      }
    }
  }

  private beginTarget(sk: Skill, from: Stage) {
    const c = this.cmd!;
    if (sk.id === "attack") c.pending = { skill: sk };
    c.prevStage = from;
    if (sk.target === "self") {
      if (c.pending?.item) return this.commit({ actor: c.f, kind: "item", item: c.pending.item, targets: [c.f] });
      return this.commit({ actor: c.f, kind: "skill", skill: sk, targets: [c.f] });
    }
    c.targetSide = sk.target === "ally" || sk.target === "allies" || sk.target === "koally" ? "party" : "enemy";
    c.targetAll = sk.target === "enemies" || sk.target === "allies" || sk.target === "randomEnemies";
    c.koOnly = sk.target === "koally";
    c.targetIdx = 0;
    if (c.targetSide === "party" && !c.koOnly) {
      // default to the most hurt ally
      const list = this.targetList();
      let best = 0;
      list.forEach((f, i) => {
        if (this.hp(f) / this.statsOf(f).maxHp < this.hp(list[best]) / this.statsOf(list[best]).maxHp) best = i;
      });
      c.targetIdx = best;
    }
    c.stage = "target";
    if (!this.targetList().length) {
      audio.sfx("error");
      c.stage = from;
    }
  }

  private targetList(): Fighter[] {
    const c = this.cmd!;
    if (c.targetSide === "enemy") return this.alive("enemy");
    if (c.koOnly) return this.party.filter((f) => this.hp(f) <= 0);
    return this.alive("party");
  }

  private commit(a: Action) {
    const c = this.cmd!;
    this.queue.push(a);
    this.ready = this.ready.filter((x) => x !== c.f);
    this.cmd = null;
  }

  // ---------------------------------------------------------------- enemy AI
  private enemyAction(f: Fighter): Action {
    const e = f.foe!;
    const st = e.status;
    let id: string;
    if (st.charge) {
      delete st.charge;
      id = e.bossKind === "final2" ? "finale" : "devastate";
    } else if (e.boss && f.turns % 4 === 3) id = "charge";
    else {
      const hpFrac = e.hp / e.stats.maxHp;
      if (e.boss && !f.usedCommercial && e.moves.includes("commercial") && hpFrac < 0.4) {
        f.usedCommercial = true;
        id = "commercial";
      } else {
        const opts = e.moves.filter((m) => {
          const sk = getSkill(m);
          if (m === "charge" || m === "commercial") return false;
          if (sk.kind === "heal" && hpFrac > 0.5) return false;
          if (sk.kind === "buff" && sk.status && st[sk.status.key]) return false;
          return true;
        });
        id = opts[Math.floor(this.rnd() * opts.length)] ?? "attack";
      }
    }
    const sk = getSkill(id);
    let targets: Fighter[];
    const opp = this.alive("party");
    if (sk.target === "self") targets = [f];
    else if (sk.target === "enemies" || sk.target === "randomEnemies") targets = opp;
    else if (sk.target === "ally" || sk.target === "allies") targets = this.alive("enemy");
    else {
      const weakest = opp.reduce((a, b) => (this.hp(a) < this.hp(b) ? a : b), opp[0]);
      targets = [this.rnd() < 0.3 ? weakest : opp[Math.floor(this.rnd() * opp.length)]];
    }
    return { actor: f, kind: "skill", skill: sk, targets };
  }

  // ---------------------------------------------------------------- performing
  private async perform(a: Action) {
    const actor = a.actor;
    if (this.hp(actor) <= 0 || actor.dead) return;
    actor.atb = 0;
    if (a.kind === "defend") {
      this.status(actor).defend = 1;
      audio.sfx("defend");
      const [x, y] = this.center(actor);
      this.fx.play("shield", x, y);
      this.fx.number(x, y, "Defend", "#a0d0ff");
      await this.sleep(0.35);
      return;
    }
    if (a.kind === "flee") return this.tryFlee(actor, false);
    if (a.kind === "item") return this.useItem(actor, a.item!, a.targets);

    const sk = a.skill!;
    const isHero = actor.side === "party";
    if (sk.showstopper) {
      this.run.hype = 0;
      this.run.unlock("showstopper");
      audio.sfx("hype");
      this.fx.flash = 0.8;
      this.fx.flashColor = "#ffffff";
      this.showBanner(`★ ${sk.name.toUpperCase()} ★`, "#ffe040");
      this.viewers(5000 + this.run.floorN * 3000, true);
      await this.sleep(0.9);
    } else if (sk.id !== "attack") {
      this.showBanner(sk.name, isHero ? "#ffffff" : "#ff9090");
    }
    if (isHero && sk.mp) {
      actor.hero!.mp = Math.max(0, actor.hero!.mp - sk.mp);
      this.run.stats.spellsCast++;
      if (sk.element === "fire") {
        this.run.stats.fireCast++;
        if (this.run.stats.fireCast >= 10) this.run.unlock("pyro");
      }
    }
    // windup
    if (isHero) {
      for (let i = 0; i <= 6; i++) {
        actor.ox = -i * 2;
        await this.sleep(0.016);
      }
    } else {
      actor.flash = 0.25;
      await this.sleep(0.3);
    }
    if (sk.id === "charge") {
      const [x, y] = this.center(actor);
      this.fx.play("charge", x, y);
      audio.sfx("magic");
      this.status(actor).charge = 2;
      if (!this.chargeWarned) {
        this.chargeWarned = true;
        this.say("SYSTEM: Something nasty is charging up. Might want to DEFEND.");
      }
      this.fx.number(x, y, "Charging!", "#ff6040");
      await this.sleep(0.6);
      return;
    }
    if (sk.id === "commercial") {
      this.showBanner("WE'LL BE RIGHT BACK!", "#ffe040");
      audio.sfx("crowd");
      await this.sleep(0.6);
    }

    const hits = sk.hits ?? 1;
    let targets = a.targets.filter((t) => sk.kind === "revive" || this.hp(t) > 0);
    if (sk.target === "koally" && sk.kind !== "revive") targets = a.targets;
    if (!targets.length && sk.target !== "koally" && sk.kind !== "special") {
      // retarget to someone still standing on the intended side
      const side = a.targets[0]?.side ?? (isHero ? "enemy" : "party");
      const pool = this.alive(side);
      if (pool.length) targets = [pool[Math.floor(this.rnd() * pool.length)]];
    }
    if (sk.kind === "special") targets = this.party;

    for (let hIdx = 0; hIdx < hits; hIdx++) {
      const list = sk.target === "randomEnemies" ? [this.pickRandom(this.opponents(actor))].filter(Boolean) as Fighter[] : targets;
      for (const tgt of list) {
        await this.applySkill(actor, tgt, sk);
        if (list.length > 1) await this.sleep(0.06);
      }
      if (hits > 1) await this.sleep(0.12);
    }
    await this.sleep(0.25);
    if (isHero) {
      for (let i = 6; i >= 0; i--) {
        actor.ox = -i * 2;
        await this.sleep(0.016);
      }
    }
  }

  private pickRandom(arr: Fighter[]): Fighter | undefined {
    return arr[Math.floor(this.rnd() * arr.length)];
  }

  private async applySkill(actor: Fighter, tgt: Fighter, sk: Skill) {
    const [x, y] = this.center(tgt);
    const size = tgt.side === "enemy" ? tgt.foe!.size : 16;
    const att = this.statsOf(actor);
    const fxKind = sk.id === "attack" && actor.hero?.kind === "pet" ? "claw" : sk.id === "eggtoss" ? ["fire", "ice", "bolt", "holy"][Math.floor(this.rnd() * 4)] : sk.fx;
    const delay = this.fx.play(fxKind, x, y, size);
    audio.sfx(sfxFor(fxKind));
    await this.sleep(delay);

    switch (sk.kind) {
      case "phys":
      case "magic": {
        if (this.hp(tgt) <= 0) return;
        let element: Element | undefined = sk.element;
        if (sk.id === "attack" && actor.hero) element = actor.hero.equip.weapon?.element;
        if (sk.id === "eggtoss") element = (["fire", "ice", "bolt", "holy"] as Element[])[Math.floor(this.rnd() * 4)];
        const defn = tgt.hero ? { stats: this.statsOf(tgt), status: tgt.hero.status, weak: [], resist: [] } : { stats: this.statsOf(tgt), status: tgt.foe!.status, weak: tgt.foe!.weak, resist: tgt.foe!.resist };
        const hit = rollHit(att, defn, sk, element, this.rnd);
        if (hit.miss) {
          audio.sfx("miss");
          this.fx.number(x, y, "Miss", "#c0c0c0");
          return;
        }
        this.damage(actor, tgt, hit.amount, hit.crit, hit.weak, hit.resist);
        if (sk.drain) {
          const heal = Math.round(hit.amount * sk.drain);
          this.setHp(actor, this.hp(actor) + heal);
          const [ax, ay] = this.center(actor);
          this.fx.number(ax, ay, String(heal), "#60ff90");
        }
        if (sk.status && this.hp(tgt) > 0) this.tryStatus(tgt, sk.status.key, sk.status.turns, sk.status.chance);
        if (sk.steal) this.steal(actor, tgt, sk.id === "heist");
        break;
      }
      case "heal": {
        if (sk.cure) {
          const st = this.status(tgt);
          for (const k of sk.cure) delete st[k];
          this.fx.number(x, y, "Cured", "#a0ffa0");
        }
        if (sk.id === "secondwind") {
          const amt = Math.round(this.statsOf(tgt).maxHp * 0.4);
          this.setHp(tgt, this.hp(tgt) + amt);
          this.fx.number(x, y, String(amt), "#60ff90");
        } else if (sk.power > 0) {
          const amt = actor.side === "enemy" && tgt === actor ? Math.round(this.statsOf(tgt).maxHp * 0.12 * sk.power) : healAmount(att, sk.power, this.rnd);
          this.setHp(tgt, this.hp(tgt) + amt);
          this.fx.number(x, y, String(amt), "#60ff90");
        }
        break;
      }
      case "revive": {
        if (this.hp(tgt) > 0) {
          this.fx.number(x, y, "No effect", "#c0c0c0");
          break;
        }
        this.setHp(tgt, Math.max(1, Math.round(this.statsOf(tgt).maxHp * sk.power)));
        tgt.dead = false;
        tgt.atb = 0;
        this.fx.number(x, y, "Revived!", "#ffffa0");
        break;
      }
      case "buff":
      case "debuff":
        if (sk.status) this.tryStatus(tgt, sk.status.key, sk.status.turns, sk.status.chance);
        break;
      case "steal":
        this.steal(actor, tgt, false);
        break;
      case "escape":
        await this.tryFlee(actor, true);
        break;
      case "special": {
        const max = this.statsOf(tgt).maxHp;
        if (sk.id === "miracle") {
          this.setHp(tgt, max);
          tgt.dead = false;
          this.status(tgt).stun = 0;
          delete this.status(tgt).stun;
          delete this.status(tgt).poison;
          this.fx.number(x, y, "Full HP!", "#60ff90");
        } else if (sk.id === "ninelives") {
          this.setHp(tgt, Math.max(this.hp(tgt), Math.round(max * 0.6)));
          tgt.dead = false;
          this.fx.number(x, y, "Nine Lives!", "#60ff90");
        } else if (sk.id === "roostercall") {
          if (tgt.hero) tgt.hero.mp = this.statsOf(tgt).maxMp;
          this.status(tgt).haste = 4;
          this.fx.number(x, y, "Hasted!", "#ffe080");
        }
        break;
      }
    }
  }

  private tryStatus(tgt: Fighter, key: StatusKey, turns: number, chance: number) {
    const st = this.status(tgt);
    const boss = tgt.foe?.boss;
    if (boss && key === "stun") {
      chance *= 0.5;
      turns = 1;
    }
    const [x, y] = this.center(tgt);
    if (this.rnd() > chance) {
      if (tgt.side === "enemy" || key !== "shield") this.fx.number(x, y + 8, "Resisted", "#a0a0a0");
      return;
    }
    st[key] = Math.max(st[key] ?? 0, turns);
    const label: Record<string, string> = { poison: "Poisoned", stun: "Stunned", shield: "Shielded", weaken: "ATK Down", break: "DEF Down", regen: "Regen", haste: "Haste" };
    this.fx.number(x, y + 8, label[key] ?? key, key === "shield" || key === "regen" || key === "haste" ? "#a0d0ff" : "#e0a0ff");
  }

  private damage(actor: Fighter, tgt: Fighter, amount: number, crit: boolean, weak: boolean, resist: boolean) {
    const before = this.hp(tgt);
    this.setHp(tgt, before - amount);
    tgt.flash = 0.18;
    tgt.shake = 0.25;
    const [x, y] = this.center(tgt);
    this.fx.number(x, y, String(amount), crit ? "#ffe040" : resist ? "#a0a0c0" : "#ffffff");
    if (crit) this.fx.number(x, y - 10, "CRITICAL!", "#ffb040");
    if (weak) this.fx.number(x, y - (crit ? 20 : 10), "WEAK!", "#ff80ff");
    if (tgt.side === "party") {
      this.damageTaken += amount;
      this.run.addHype(Math.min(6, Math.round((amount / this.statsOf(tgt).maxHp) * 20)));
    } else {
      this.run.addHype(crit ? 8 : weak ? 6 : 2);
      if (crit) {
        this.run.stats.crits++;
        this.run.unlock("crit");
        this.viewers(200 + this.run.floorN * 120, true);
      }
      if (weak) {
        this.run.unlock("weakness");
        this.viewers(150 + this.run.floorN * 80);
      }
      if (amount >= tgt.foe!.stats.maxHp * 2 && before > 0) this.run.unlock("overkill");
    }
    if (this.hp(tgt) <= 0 && before > 0) {
      this.lastKiller = actor;
      this.kill(tgt);
    }
  }

  private kill(f: Fighter) {
    if (f.side === "enemy") {
      f.dying = 0.01;
      audio.sfx("death");
      const e = f.foe!;
      this.killed.push(e);
      this.run.stats.kills++;
      this.run.unlock("firstblood");
      if (e.prefix === "Shiny") this.run.unlock("shiny");
      this.run.addHype(5);
      this.viewers(60 * e.level + (e.boss ? 15000 * this.run.floorN : 0), true);
      if (e.boss && this.lastKiller?.hero?.kind === "pet") this.run.unlock("petkill");
      const q = this.run.quest();
      if (q && q.kind === "kill" && !q.done && q.target === e.arch) {
        q.have++;
        if (q.have >= q.need) {
          q.done = true;
          this.game.toast(`Quest complete! Return to ${q.giver.split(" ")[0]}.`, "#a0ffa0");
        }
      }
    } else {
      audio.sfx("ko");
      this.status(f).poison = 0;
      f.hero!.status = {};
      f.atb = 0;
      this.ready = this.ready.filter((x) => x !== f);
      this.run.stats.deaths++;
      this.run.unlock("ko");
      if (this.cmd?.f === f) this.cmd = null;
      this.say(sysLine(this.run.story, "ko", new RNG(Math.floor(this.rnd() * 1e9))));
    }
  }

  private steal(actor: Fighter, tgt: Fighter, gold: boolean) {
    const e = tgt.foe;
    if (!e) return;
    const [x, y] = this.center(tgt);
    if (gold) {
      const g = Math.round(e.gold * 0.8) + 5;
      this.run.addGold(g);
      this.fx.number(x, y - 16, `+${g}G`, "#ffe040");
      return;
    }
    const luck = this.statsOf(actor).luck;
    const chance = 0.4 + luck * 0.012 + (actor.hero?.cls === "rogue" ? 0.2 : 0);
    if (!e.stealable) {
      this.fx.number(x, y - 16, "Nothing!", "#c0c0c0");
      return;
    }
    if (this.rnd() < chance) {
      this.run.addItem(e.stealable);
      this.fx.number(x, y - 16, `Stole ${CONSUMABLES[e.stealable]?.name ?? e.stealable}!`, "#ffe040");
      e.stealable = undefined;
      this.run.unlock("steal");
      audio.sfx("buy");
    } else this.fx.number(x, y - 16, "Missed!", "#c0c0c0");
  }

  private async tryFlee(actor: Fighter, guaranteed: boolean) {
    if (!this.opts.canFlee) {
      this.showBanner("Can't escape!", "#ff8080");
      audio.sfx("error");
      await this.sleep(0.6);
      return;
    }
    const pSpd = Math.max(...this.alive("party").map((f) => this.statsOf(f).spd));
    const eSpd = Math.max(...this.alive("enemy").map((f) => this.statsOf(f).spd));
    if (guaranteed || this.rnd() < fleeChance(pSpd, eSpd)) {
      audio.sfx("cancel");
      this.showBanner("Escaped!", "#a0ffa0");
      this.run.stats.fled++;
      this.run.unlock("flee");
      for (const f of this.party) f.ox = 0;
      this.state = "fled";
      this.resultT = 0;
      this.say(sysLine(this.run.story, "flee", new RNG(this.run.stats.fled)));
      return;
    }
    this.showBanner(`${this.name(actor)} couldn't escape!`, "#ff8080");
    audio.sfx("error");
    await this.sleep(0.6);
  }

  private async useItem(actor: Fighter, key: string, targets: Fighter[]) {
    const it = CONSUMABLES[key];
    if (!it || (this.run.inv.items[key] ?? 0) <= 0) return;
    this.run.removeItem(key);
    this.run.unlock("item");
    this.showBanner(it.name);
    for (let i = 0; i <= 6; i++) {
      actor.ox = -i * 2;
      await this.sleep(0.016);
    }
    const tgt = targets[0] ?? actor;
    const [x, y] = this.center(tgt);
    switch (key) {
      case "tonic":
      case "bigtonic": {
        if (this.hp(tgt) <= 0) {
          this.fx.number(x, y, "No effect", "#c0c0c0");
          break;
        }
        this.fx.play("heal", x, y);
        audio.sfx("heal");
        const amt = key === "tonic" ? 60 : 220;
        this.setHp(tgt, this.hp(tgt) + amt);
        this.fx.number(x, y, String(amt), "#60ff90");
        break;
      }
      case "ether":
        this.fx.play("heal", x, y);
        audio.sfx("heal");
        if (tgt.hero) tgt.hero.mp = Math.min(this.statsOf(tgt).maxMp, tgt.hero.mp + 25);
        this.fx.number(x, y, "25", "#80c0ff");
        break;
      case "elixir":
        this.fx.play("holy", x, y);
        audio.sfx("holy");
        this.setHp(tgt, this.statsOf(tgt).maxHp);
        if (tgt.hero) tgt.hero.mp = this.statsOf(tgt).maxMp;
        tgt.dead = false;
        this.fx.number(x, y, "Full!", "#60ff90");
        break;
      case "feather":
        if (this.hp(tgt) > 0) {
          this.fx.number(x, y, "No effect", "#c0c0c0");
          break;
        }
        this.fx.play("holy", x, y);
        audio.sfx("holy");
        this.setHp(tgt, Math.round(this.statsOf(tgt).maxHp * 0.4));
        tgt.dead = false;
        tgt.atb = 0;
        this.fx.number(x, y, "Revived!", "#ffffa0");
        break;
      case "antidote":
        delete this.status(tgt).poison;
        this.fx.play("heal", x, y);
        this.fx.number(x, y, "Cured", "#a0ffa0");
        break;
      case "smoke":
        this.fx.play("smoke", x, y);
        await this.tryFlee(actor, true);
        break;
      case "dynamite":
        for (const f of this.alive("enemy")) {
          const [ex, ey] = this.center(f);
          this.fx.play("fire", ex, ey, f.foe!.size);
        }
        audio.sfx("fire");
        await this.sleep(0.35);
        for (const f of this.alive("enemy")) {
          const weak = f.foe!.weak.includes("fire");
          const resist = f.foe!.resist.includes("fire");
          const amt = Math.round((90 + this.run.floorN * 25) * (weak ? 1.6 : resist ? 0.5 : 1) * (0.9 + this.rnd() * 0.2));
          this.damage(actor, f, amt, false, weak, resist);
        }
        break;
      case "soda":
        this.run.addHype(40);
        audio.sfx("hype");
        this.fx.number(x, y, "+40 HYPE", "#ffe040");
        this.say(`${this.run.story.sponsor.name}: ${this.run.story.sponsor.slogan}`);
        break;
    }
    await this.sleep(0.4);
    for (let i = 6; i >= 0; i--) {
      actor.ox = -i * 2;
      await this.sleep(0.016);
    }
  }

  // ---------------------------------------------------------------- end of battle
  private checkEnd() {
    if (this.state !== "run") return;
    for (const f of this.foes) if (this.hp(f) <= 0 && f.dying === 0) f.dying = 0.01;
    if (!this.alive("enemy").length) {
      this.victory();
      return;
    }
    if (!this.alive("party").length) {
      this.state = "defeat";
      this.resultT = 0;
      this.cmd = null;
      audio.stopMusic();
      audio.sfx("ko");
      this.showBanner("Your party has fallen...", "#ff8080");
    }
  }

  private victory() {
    this.state = "victory";
    this.resultT = 0;
    this.cmd = null;
    const run = this.run;
    audio.stopMusic();
    if (!this.opts.noResults) this.game.music("victory", run.stats.battles);
    for (const f of this.party) {
      f.ox = 0;
      if (f.hero!.hp > 0) f.jump = 0.001;
    }
    const xp = this.killed.reduce((a, e) => a + e.xp, 0);
    const gold = this.killed.reduce((a, e) => a + e.gold, 0);
    run.addGold(gold);
    const lines: string[] = [`EXP +${xp}     GOLD +${gold}`];
    const drops: string[] = [];
    for (const e of this.killed) {
      if (e.stealable && this.rnd() < (e.boss ? 1 : 0.22)) {
        run.addItem(e.stealable);
        drops.push(CONSUMABLES[e.stealable]?.name ?? e.stealable);
      }
    }
    if (drops.length) lines.push(`Dropped: ${drops.join(", ")}`);
    const ups = run.gainXp(xp);
    for (const u of ups) {
      const learned = u.learned.map((s) => getSkill(s).name);
      lines.push(`${u.hero.name} reached Lv ${u.level}!${learned.length ? ` Learned ${learned.join(", ")}.` : ""}`);
      if (u.hero.kind === "hero") lines.push(sysLine(run.story, "levelup", new RNG(u.level)));
    }
    if (ups.length) {
      audio.sfx("levelup");
      lines.push("Level up! HP and MP fully restored.");
    }
    // the audience takes pity on a party that's barely standing
    const hpFrac = this.party.reduce((a, f) => a + Math.max(0, f.hero!.hp), 0) / this.party.reduce((a, f) => a + this.statsOf(f).maxHp, 0);
    if (!ups.length && hpFrac < 0.4 && this.rnd() < 0.6) {
      run.addItem("tonic");
      lines.push(`A viewer on ${pickFrom(["Xyl-7", "Gorp Prime", "the Outer Rim", "Moon Base Nine", run.story.hero.town], this.rnd)} sent you a Red Tonic!`);
    }
    if (this.damageTaken === 0) run.unlock("flawless");
    if (this.party.some((f) => f.hero!.hp > 0 && f.hero!.hp < this.statsOf(f).maxHp * 0.1)) run.unlock("closecall");
    // the knocked-out get back up with 1 HP; the audience likes a comeback
    for (const f of this.party)
      if (f.hero!.hp <= 0) {
        f.hero!.hp = 1;
        f.dead = false;
      }
    lines.push(sysLine(run.story, "battleWin", new RNG(run.stats.battles * 7)));
    this.results = { lines, ups };
    if (this.opts.noResults) {
      this.state = "done";
      this.opts.onEnd("win");
    }
  }

  // ---------------------------------------------------------------- draw
  draw(ctx: Ctx) {
    const [sx, sy] = this.fx.offset();
    ctx.save();
    ctx.translate(sx, sy);
    ctx.drawImage(this.bg, 0, 0);

    // enemies
    for (const f of this.foes) {
      if (f.dying >= 1) continue;
      const e = f.foe!;
      const s = f.sprite!;
      const bob = e.boss ? Math.round(Math.sin(this.t * 1.5) * 2) : Math.round(Math.sin(this.t * 2 + f.hx) * 1);
      const shake = f.shake > 0 ? Math.round(Math.sin(f.shake * 60) * 2) : 0;
      const x = Math.round(f.hx - s.width / 2 + shake);
      const y = Math.round(f.hy - s.height + bob);
      ctx.fillStyle = "rgba(0,0,0,0.3)";
      ctx.fillRect(Math.round(f.hx - s.width / 3), f.hy - 1, Math.round((s.width * 2) / 3), 3);
      if (f.dying > 0) {
        // dissolve: red tint + pixel crumble from the top
        const k = f.dying;
        ctx.save();
        ctx.beginPath();
        ctx.rect(x, y + s.height * k, s.width, s.height * (1 - k));
        ctx.clip();
        ctx.globalAlpha = 1 - k * 0.6;
        ctx.drawImage(tintCanvas(s, "#ff4060"), x, y);
        ctx.restore();
        if (Math.random() < 0.6) this.fx.burst(f.hx, y + s.height * k, 2, ["#ff4060", "#ffa0b0"], { speed: 30, life: 0.4, g: -40 });
        continue;
      }
      ctx.drawImage(f.flash > 0 && Math.floor(f.flash * 30) % 2 ? f.white! : s, x, y);
      if (e.status.charge) {
        ctx.strokeStyle = `rgba(255,80,40,${0.5 + 0.5 * Math.sin(this.t * 12)})`;
        ctx.strokeRect(x - 2.5, y - 2.5, s.width + 5, s.height + 5);
      }
      this.drawStatusIcons(ctx, e.status, f.hx - 10, y - 8);
      if (this.cmd?.stage === "target" && this.cmd.targetSide === "enemy") {
        const list = this.targetList();
        const sel = this.cmd.targetAll ? list.includes(f) : list[this.cmd.targetIdx] === f;
        if (sel && (Math.floor(this.t * 6) % 2 || !this.cmd.targetAll)) drawHand(ctx, x - 2, y + s.height / 2, this.t);
      }
    }

    // party
    for (const f of this.party) {
      const h = f.hero!;
      const ko = h.hp <= 0;
      const cmdActive = this.cmd?.f === f;
      const step = cmdActive ? -10 : 0;
      let frame: HTMLCanvasElement;
      if (h.kind === "pet") frame = petFrames(h.species!, true)[Math.floor(this.t * 3) % 2];
      else frame = heroFrames(h.look!, "left")[ko ? 0 : (cmdActive || f.ox) ? 1 : 0];
      const jump = f.jump > 0 ? Math.round(Math.abs(Math.sin(f.jump * 8)) * -6) : 0;
      const shake = f.shake > 0 ? Math.round(Math.sin(f.shake * 60) * 2) : 0;
      const x = Math.round(f.hx + f.ox + step + shake);
      const y = Math.round(f.hy - frame.height + jump);
      ctx.fillStyle = "rgba(0,0,0,0.3)";
      ctx.fillRect(f.hx + 2 + step, f.hy - 1, 12, 3);
      if (ko) {
        ctx.save();
        ctx.translate(x + 8, f.hy - 4);
        ctx.rotate(-Math.PI / 2);
        ctx.globalAlpha = 0.7;
        ctx.drawImage(tintCanvas(frame, "#707088"), -frame.width / 2, -frame.height / 2);
        ctx.restore();
      } else {
        ctx.drawImage(f.flash > 0 && Math.floor(f.flash * 30) % 2 ? tintCanvas(frame, "#ffffff") : frame, x, y);
        if (h.status.defend) {
          ctx.fillStyle = "#80c0ff";
          ctx.fillRect(x - 3, y + 8, 2, 6);
        }
        this.drawStatusIcons(ctx, h.status, x, y - 8);
      }
      if (this.cmd?.stage === "target" && this.cmd.targetSide === "party") {
        const list = this.targetList();
        const sel = this.cmd.targetAll ? list.includes(f) : list[this.cmd.targetIdx] === f;
        if (sel && (Math.floor(this.t * 6) % 2 || !this.cmd.targetAll)) drawHand(ctx, x - 2, y + frame.height / 2, this.t);
      }
    }

    this.fx.draw(ctx);
    ctx.restore();
    this.drawUi(ctx);
  }

  private drawStatusIcons(ctx: Ctx, st: StatusMap, x: number, y: number) {
    const icons: [StatusKey, string, string][] = [
      ["poison", "P", "#60ff60"],
      ["stun", "Z", "#ffe040"],
      ["shield", "S", "#80c0ff"],
      ["weaken", "↓", "#ff8080"],
      ["break", "↓", "#ffa040"],
      ["regen", "+", "#60ff90"],
      ["haste", "H", "#ffffa0"],
    ];
    let i = 0;
    for (const [k, ch, col] of icons) {
      if (!st[k]) continue;
      drawText(ctx, ch, x + i * 7, y, { color: col });
      i++;
    }
  }

  private drawUi(ctx: Ctx) {
    const run = this.run;
    // top bar: live + hype
    drawWindow(ctx, 4, 4, 86, 16, undefined, 0.9);
    ctx.fillStyle = Math.floor(this.t * 2) % 2 ? "#ff3040" : "#801020";
    ctx.fillRect(10, 9, 5, 5);
    drawText(ctx, `LIVE ${formatNum(run.viewers)}`, 18, 8, { color: "#ffb0c0" });
    drawWindow(ctx, W - 96, 4, 92, 16, undefined, 0.9);
    drawText(ctx, "HYPE", W - 90, 8, { color: run.hype >= 100 ? (Math.floor(this.t * 6) % 2 ? "#ffe040" : "#ff8040") : "#ffd0a0" });
    drawBar(ctx, W - 64, 10, 54, 4, run.hype / 100, run.hype >= 100 ? "#ffe040" : "#ff8040");

    if (this.banner) {
      const w = measure(this.banner.text) + 24;
      drawWindow(ctx, W / 2 - w / 2, 24, w, 16);
      drawText(ctx, this.banner.text, W / 2, 28, { color: this.banner.color, align: "center" });
    }
    if (this.chatter) {
      const lines = wrap(this.chatter.text, 220);
      const h = lines.length * 10 + 8;
      drawSystemWindow(ctx, W / 2 - 115, 44, 230, h, this.t);
      lines.forEach((l, i) => drawText(ctx, l, W / 2, 48 + i * 10, { color: "#c8fff0", align: "center" }));
    }

    // bottom windows
    const by = H - 62;
    drawWindow(ctx, 4, by, 128, 58);
    const counts = new Map<string, number>();
    for (const f of this.alive("enemy")) counts.set(f.foe!.name, (counts.get(f.foe!.name) ?? 0) + 1);
    [...counts.entries()].slice(0, 4).forEach(([n, c], i) => drawText(ctx, `${n.slice(0, 18)}${c > 1 ? ` ×${c}` : ""}`, 12, by + 7 + i * 12));

    drawWindow(ctx, 134, by, W - 138, 58);
    drawText(ctx, "NAME", 142, by + 5, { color: "#a8c8ff" });
    drawText(ctx, "HP", 248, by + 5, { color: "#a8c8ff", align: "right" });
    drawText(ctx, "MP", 292, by + 5, { color: "#a8c8ff", align: "right" });
    drawText(ctx, "TIME", 332, by + 5, { color: "#a8c8ff", align: "center" });
    this.party.forEach((f, i) => {
      const h = f.hero!;
      const st = this.statsOf(f);
      const y = by + 17 + i * 13;
      const active = this.cmd?.f === f;
      const col = h.hp <= 0 ? "#ff6060" : h.hp < st.maxHp * 0.25 ? "#ffe040" : active ? "#ffffff" : "#e0e4f8";
      drawText(ctx, h.name.slice(0, 13), 142, y, { color: col });
      drawText(ctx, `${h.hp}/${st.maxHp}`, 248, y, { color: col, align: "right" });
      drawText(ctx, `${h.mp}`, 292, y, { color: "#c0d8ff", align: "right" });
      drawBar(ctx, 306, y + 2, 52, 4, h.hp > 0 ? f.atb : 0, f.atb >= 1 ? "#ffe040" : "#e0e0f0");
      if (active) drawText(ctx, "→", 134, y, { color: "#ffe040" });
    });

    // command menu
    const c = this.cmd;
    if (c && this.state === "run") {
      const h = c.f.hero!;
      const rh = c.root.items.length * 11 + 10;
      const top = by - Math.max(0, rh - 58);
      drawWindow(ctx, 4, top, 128, Math.max(58, rh));
      drawWindow(ctx, 4, top - 15, Math.max(60, measure(h.name) + 14), 15);
      drawText(ctx, h.name, 11, top - 11, { color: "#ffe080" });
      c.root.draw(ctx, 6, top + 6, 120, this.t, c.stage === "root");
      if ((c.stage === "skill" || c.stage === "item" || (c.stage === "target" && c.prevStage !== "root")) && c.sub) {
        drawWindow(ctx, 112, by - 30, 168, 88);
        c.sub.draw(ctx, 114, by - 24, 158, this.t, c.stage !== "target");
        const cur = c.sub.current;
        if (cur) {
          const desc = c.stage === "item" || (c.stage === "target" && c.pending?.item) ? CONSUMABLES[cur.value as string]?.desc : getSkill(cur.value as string).desc;
          if (desc) {
            const lines = wrap(desc, 230);
            drawWindow(ctx, W / 2 - 124, 24, 248, lines.length * 10 + 8);
            lines.forEach((l, i) => drawText(ctx, l, W / 2, 28 + i * 10, { color: "#e0e8ff", align: "center" }));
          }
        }
      }
    }

    // results
    if (this.state === "victory" && this.results) {
      const lines = this.results.lines.flatMap((l) => wrap(l, 290));
      const h = lines.length * 11 + 30;
      const y = 30;
      drawWindow(ctx, W / 2 - 155, y, 310, h);
      drawTitle(ctx, "VICTORY!", W / 2, y + 2, 2, "#fff8c0", "#e0a030");
      lines.forEach((l, i) => drawText(ctx, l, W / 2 - 145, y + 24 + i * 11, { color: i === 0 ? "#ffe080" : "#ffffff" }));
      if (this.resultT > 0.8 && Math.floor(this.t * 2) % 2) drawText(ctx, "Z", W / 2 + 145, y + h - 12, { color: "#ffe040", align: "right" });
    }
    if (this.state === "defeat") {
      ctx.fillStyle = `rgba(60,0,10,${Math.min(0.6, this.resultT / 3)})`;
      ctx.fillRect(0, 0, W, H);
    }
  }
}

function pickFrom<T>(arr: T[], rnd: () => number): T {
  return arr[Math.floor(rnd() * arr.length)];
}

function sfxFor(fx: string): string {
  switch (fx) {
    case "slash":
    case "claw":
    case "bigslash":
      return "hit";
    case "fire":
    case "ice":
    case "bolt":
    case "holy":
    case "heal":
    case "poison":
      return fx;
    case "dark":
    case "debuff":
      return "magic";
    case "shield":
      return "defend";
    case "quake":
      return "crit";
    case "meteor":
      return "fire";
    case "steal":
      return "swing";
    case "smoke":
      return "miss";
    case "charge":
      return "magic";
    default:
      return "hit";
  }
}

