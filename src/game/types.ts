import type { Archetype, MonsterPalette } from "./engine/monsters";
import type { Look, Species } from "./engine/sprites";

export type Element = "phys" | "fire" | "ice" | "bolt" | "holy" | "dark" | "poison";

export interface Stats {
  maxHp: number;
  maxMp: number;
  atk: number;
  def: number;
  mag: number;
  spd: number;
  luck: number;
}

export type StatusKey = "poison" | "stun" | "shield" | "weaken" | "break" | "regen" | "haste" | "defend" | "charge";
export type StatusMap = Partial<Record<StatusKey, number>>;

export type GearSlot = "weapon" | "armor" | "trinket";

export interface Gear {
  uid: string;
  slot: GearSlot;
  name: string;
  rarity: number; // 0 common .. 4 legendary
  stats: Partial<Stats>;
  desc: string;
  value: number;
  element?: Element;
}

export interface Hero {
  id: string;
  name: string;
  kind: "hero" | "pet" | "guest";
  cls: string; // class id, or species id for pets
  level: number;
  xp: number;
  hp: number;
  mp: number;
  base: Stats;
  equip: Partial<Record<GearSlot, Gear>>;
  skills: string[];
  status: StatusMap;
  look?: Look;
  species?: Species;
}

export interface EnemyInstance {
  uid: string;
  name: string;
  arch: Archetype;
  level: number;
  stats: Stats;
  hp: number;
  mp: number;
  weak: Element[];
  resist: Element[];
  moves: string[];
  xp: number;
  gold: number;
  spriteSeed: number;
  pal: MonsterPalette;
  size: number;
  boss?: boolean;
  bossKind?: "floor" | "rival" | "final1" | "final2";
  desc: string;
  status: StatusMap;
  stealable?: string; // consumable key
  prefix?: string;
  family: string;
  special?: "mimic" | "person";
}

export type BoxTier = "Bronze" | "Silver" | "Gold" | "Legendary" | "Fan" | "Boss" | "Sponsor";

export interface LootBox {
  uid: string;
  tier: BoxTier;
  source: string;
}

export interface Inventory {
  items: Record<string, number>;
  gear: Gear[];
}

export interface Quest {
  id: string;
  giver: string;
  text: string;
  kind: "kill" | "fetch";
  target: string; // archetype for kill, item name for fetch
  need: number;
  have: number;
  done: boolean;
  rewarded: boolean;
  floor: number;
}

export interface Settings {
  music: number;
  sfx: number;
  battleMode: "wait" | "active";
  battleSpeed: number; // 1..3
  windowTheme: number;
  textSpeed: number; // 1..3
}

export interface RunStats {
  battles: number;
  kills: number;
  deaths: number;
  crits: number;
  boxesOpened: number;
  peakViewers: number;
  steps: number;
  timePlayed: number;
  fled: number;
  gearFound: number;
  spellsCast: number;
  fireCast: number;
  goldEarned: number;
  npcsTalked: number;
}
