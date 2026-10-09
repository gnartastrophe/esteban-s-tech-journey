// Everything about the current playthrough: party, inventory, viewers, flags,
// achievements, and the per-floor state that has to survive a save/load.

import { RNG } from "./engine/rng";
import type { Species } from "./engine/sprites";
import { classLook } from "./engine/sprites";
import { achievement } from "./data/achievements";
import { classDef, speciesDef, statsAt, xpToNext } from "./data/classes";
import { CONSUMABLES, starterWeapon, uid } from "./data/items";
import { Floor, generateFloor } from "./gen/dungeon";
import { genStory, Story } from "./gen/story";
import type { BoxTier, Gear, GearSlot, Hero, Inventory, LootBox, Quest, RunStats, Stats } from "./types";

export interface FloorState {
  defeated: string[];
  opened: string[];
  talked: string[];
  sprung: string[];
  explored: string;
  bossDefeated: boolean;
  questTaken: boolean;
  firstVisitSafe: boolean;
}

export type Notice =
  | { kind: "achievement"; title: string; desc: string; reward: BoxTier }
  | { kind: "toast"; text: string; color?: string }
  | { kind: "viewers"; text: string };

export interface LevelUp {
  hero: Hero;
  level: number;
  learned: string[];
}

const VIEWER_MILESTONES = [10_000, 50_000, 100_000, 250_000, 500_000, 1_000_000, 2_500_000, 5_000_000, 10_000_000];

export class Run {
  seed: string;
  story: Story;
  party: Hero[] = [];
  inv: Inventory = { items: {}, gear: [] };
  gold = 50;
  viewers = 1200;
  hype = 0;
  boxes: LootBox[] = [];
  achievements: string[] = [];
  flags: Record<string, string | number | boolean> = {};
  quests: Quest[] = [];
  log: string[] = [];
  seen: string[] = [];
  stats: RunStats = { battles: 0, kills: 0, deaths: 0, crits: 0, boxesOpened: 0, peakViewers: 0, steps: 0, timePlayed: 0, fled: 0, gearFound: 0, spellsCast: 0, fireCast: 0, goldEarned: 0, npcsTalked: 0 };
  floorN = 1;
  floor!: Floor;
  fstate!: FloorState;
  timeLeft = 600;
  playerPos: { x: number; y: number } | null = null;
  notify: (n: Notice) => void = () => {};
  private milestoneIdx = 0;

  constructor(seed: string, story: Story) {
    this.seed = seed;
    this.story = story;
  }

  static create(seed: string, name: string, cls: string, skin: number, hair: number): Run {
    const story = genStory(seed, name, cls);
    const run = new Run(seed, story);
    const cd = classDef(cls);
    const hero: Hero = {
      id: "hero",
      name,
      kind: "hero",
      cls,
      level: 1,
      xp: 0,
      hp: 0,
      mp: 0,
      base: statsAt(cd.base, cd.growth, 1),
      equip: { weapon: starterWeapon(cd.startWeapon, cls) },
      skills: cd.learn.filter(([lv]) => lv <= 1).map(([, s]) => s),
      status: {},
      look: classLook(cls, skin, hair),
    };
    const sd = speciesDef(story.pet.species);
    const pet: Hero = {
      id: "pet",
      name: story.pet.short,
      kind: "pet",
      cls: sd.id,
      species: sd.id as Species,
      level: 1,
      xp: 0,
      hp: 0,
      mp: 0,
      base: statsAt(sd.base, sd.growth, 1),
      equip: {},
      skills: sd.learn.filter(([lv]) => lv <= 1).map(([, s]) => s),
      status: {},
    };
    run.party = [hero, pet];
    for (const h of run.party) {
      const st = run.statsOf(h);
      h.hp = st.maxHp;
      h.mp = st.maxMp;
    }
    run.inv.items = { tonic: 5, ether: 1, antidote: 1 };
    run.addLog(`Season ${story.season} of ${story.show} begins. ${name} the ${cd.name} enters the dungeon with ${story.pet.name}.`);
    run.enterFloor(1);
    return run;
  }

  // ------------------------------------------------------------- floors
  enterFloor(n: number) {
    this.floorN = n;
    this.floor = generateFloor(this.story, n);
    this.fstate = { defeated: [], opened: [], talked: [], sprung: [], explored: "", bossDefeated: false, questTaken: false, firstVisitSafe: false };
    this.timeLeft = this.story.floors[n - 1].timer;
    this.playerPos = null;
  }

  // ------------------------------------------------------------- stats
  statsOf(h: Hero): Stats {
    const s: Stats = { ...h.base };
    for (const g of Object.values(h.equip)) {
      if (!g) continue;
      for (const [k, v] of Object.entries(g.stats) as [keyof Stats, number][]) s[k] += v;
    }
    if (h.status.weaken) s.atk = Math.round(s.atk * 0.7);
    if (h.status.break) s.def = Math.round(s.def * 0.6);
    if (h.status.haste) s.spd = Math.round(s.spd * 1.5);
    for (const k of Object.keys(s) as (keyof Stats)[]) s[k] = Math.max(k === "maxHp" ? 1 : 0, s[k]);
    return s;
  }

  alive(): Hero[] {
    return this.party.filter((h) => h.hp > 0);
  }

  get hero(): Hero {
    return this.party[0];
  }
  get pet(): Hero {
    return this.party[1];
  }

  healAll() {
    for (const h of this.party) {
      const st = this.statsOf(h);
      h.hp = st.maxHp;
      h.mp = st.maxMp;
      h.status = {};
    }
  }

  gainXp(amount: number): LevelUp[] {
    const ups: LevelUp[] = [];
    for (const h of this.party) {
      if (h.hp <= 0) continue;
      h.xp += amount;
      while (h.xp >= xpToNext(h.level)) {
        h.xp -= xpToNext(h.level);
        h.level++;
        const learned = this.applyLevel(h);
        ups.push({ hero: h, level: h.level, learned });
        if (h.kind === "hero" && h.level >= 5) this.unlock("lv5");
        if (h.kind === "hero" && h.level >= 10) this.unlock("lv10");
      }
    }
    return ups;
  }

  private applyLevel(h: Hero): string[] {
    let learn: [number, string][];
    if (h.kind === "pet") {
      const sd = speciesDef(h.cls);
      h.base = statsAt(sd.base, sd.growth, h.level);
      learn = sd.learn;
    } else {
      const cd = classDef(h.cls);
      h.base = statsAt(cd.base, cd.growth, h.level);
      learn = cd.learn;
    }
    // leveling up on live TV comes with a full heal (the producers insist)
    const after = this.statsOf(h);
    h.hp = after.maxHp;
    h.mp = after.maxMp;
    const learned: string[] = [];
    for (const [lv, sk] of learn) if (lv <= h.level && !h.skills.includes(sk)) {
      h.skills.push(sk);
      learned.push(sk);
    }
    return learned;
  }

  showstopperOf(h: Hero): string {
    return h.kind === "pet" ? speciesDef(h.cls).showstopper : classDef(h.cls).showstopper;
  }

  // ------------------------------------------------------------- inventory
  addItem(key: string, n = 1) {
    this.inv.items[key] = (this.inv.items[key] ?? 0) + n;
    if (this.itemCount() >= 25) this.unlock("hoarder");
  }
  removeItem(key: string, n = 1) {
    this.inv.items[key] = Math.max(0, (this.inv.items[key] ?? 0) - n);
    if (this.inv.items[key] === 0) delete this.inv.items[key];
  }
  itemCount() {
    return Object.values(this.inv.items).reduce((a, b) => a + b, 0) + this.inv.gear.length;
  }
  addGear(g: Gear) {
    this.inv.gear.push(g);
    this.stats.gearFound++;
  }
  equip(h: Hero, g: Gear) {
    const slot: GearSlot = g.slot;
    const before = this.statsOf(h);
    const old = h.equip[slot];
    this.inv.gear = this.inv.gear.filter((x) => x.uid !== g.uid);
    if (old) this.inv.gear.push(old);
    h.equip[slot] = g;
    const after = this.statsOf(h);
    h.hp = Math.max(1, Math.min(after.maxHp, h.hp + Math.max(0, after.maxHp - before.maxHp)));
    h.mp = Math.min(after.maxMp, h.mp);
    this.unlock("equip");
  }
  unequip(h: Hero, slot: GearSlot) {
    const old = h.equip[slot];
    if (!old) return;
    delete h.equip[slot];
    this.inv.gear.push(old);
    const st = this.statsOf(h);
    h.hp = Math.min(h.hp, st.maxHp);
    h.mp = Math.min(h.mp, st.maxMp);
  }
  addGold(n: number) {
    this.gold += n;
    if (n > 0) this.stats.goldEarned += n;
  }
  addBox(tier: BoxTier, source: string) {
    this.boxes.push({ uid: uid("b"), tier, source });
  }

  // ------------------------------------------------------------- show mechanics
  unlock(id: string) {
    if (this.achievements.includes(id)) return;
    const a = achievement(id);
    if (!a) return;
    this.achievements.push(id);
    this.addBox(a.reward, a.name);
    this.notify({ kind: "achievement", title: a.name, desc: a.desc, reward: a.reward });
    if (a.viewers) this.addViewers(a.viewers);
    this.addHype(10);
  }

  addViewers(n: number) {
    if (this.flags.rebel && this.floorN >= 5) n = Math.round(n * 0.5);
    this.viewers = Math.max(0, Math.round(this.viewers + n));
    this.stats.peakViewers = Math.max(this.stats.peakViewers, this.viewers);
    while (this.milestoneIdx < VIEWER_MILESTONES.length && this.viewers >= VIEWER_MILESTONES[this.milestoneIdx]) {
      const m = VIEWER_MILESTONES[this.milestoneIdx];
      this.milestoneIdx++;
      this.addBox("Fan", `${m.toLocaleString("en-US")} viewers`);
      this.notify({ kind: "viewers", text: `${m >= 1e6 ? m / 1e6 + "M" : m / 1e3 + "K"} VIEWERS! The fans sent you a Fan Box.` });
      if (m >= 100_000) this.unlock("viewers100k");
      if (m >= 1_000_000) this.unlock("viewers1m");
    }
  }

  addHype(n: number) {
    this.hype = Math.max(0, Math.min(100, this.hype + n));
  }

  addLog(text: string) {
    this.log.push(`F${this.floorN ?? 1}: ${text}`);
  }

  quest(): Quest | undefined {
    return this.quests.find((q) => q.floor === this.floorN);
  }

  rng(label: string): RNG {
    return new RNG(this.seed).fork(label);
  }

  // ------------------------------------------------------------- save / load
  toJSON() {
    return {
      v: 1,
      seed: this.seed,
      heroName: this.story.hero.name,
      heroCls: this.story.hero.cls,
      party: this.party,
      inv: this.inv,
      gold: this.gold,
      viewers: this.viewers,
      hype: this.hype,
      boxes: this.boxes,
      achievements: this.achievements,
      flags: this.flags,
      quests: this.quests,
      log: this.log,
      seen: this.seen,
      stats: this.stats,
      floorN: this.floorN,
      fstate: this.fstate,
      timeLeft: this.timeLeft,
      playerPos: this.playerPos,
      milestoneIdx: this.milestoneIdx,
    };
  }

  static fromJSON(d: ReturnType<Run["toJSON"]>): Run {
    const story = genStory(d.seed, d.heroName, d.heroCls);
    const run = new Run(d.seed, story);
    run.party = d.party;
    run.inv = d.inv;
    run.gold = d.gold;
    run.viewers = d.viewers;
    run.hype = d.hype;
    run.boxes = d.boxes;
    run.achievements = d.achievements;
    run.flags = d.flags;
    run.quests = d.quests;
    run.log = d.log;
    run.seen = d.seen ?? [];
    run.stats = d.stats;
    run.floorN = d.floorN;
    run.floor = generateFloor(story, d.floorN);
    run.fstate = d.fstate;
    run.timeLeft = d.timeLeft;
    run.playerPos = d.playerPos;
    run.milestoneIdx = d.milestoneIdx ?? 0;
    return run;
  }
}

const SAVE_KEY = "finalfloor.save.v1";

export function saveRun(run: Run): boolean {
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(run.toJSON()));
    return true;
  } catch {
    return false;
  }
}

export function loadRun(): Run | null {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return null;
    return Run.fromJSON(JSON.parse(raw));
  } catch {
    return null;
  }
}

export function hasSave(): boolean {
  try {
    return !!localStorage.getItem(SAVE_KEY);
  } catch {
    return false;
  }
}

export function deleteSave() {
  try {
    localStorage.removeItem(SAVE_KEY);
  } catch {
    /* ignore */
  }
}

export function consumableName(key: string) {
  return CONSUMABLES[key]?.name ?? key;
}
