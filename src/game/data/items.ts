import { RNG } from "../engine/rng";
import type { BoxTier, Element, Gear, GearSlot, Stats } from "../types";

export interface Consumable {
  key: string;
  name: string;
  desc: string;
  price: number;
  target: "ally" | "allies" | "koally" | "enemies" | "none";
  battle: boolean;
  field: boolean;
}

export const CONSUMABLES: Record<string, Consumable> = {
  tonic: { key: "tonic", name: "Red Tonic", desc: "Restores 60 HP. Tastes like cough syrup and regret.", price: 30, target: "ally", battle: true, field: true },
  bigtonic: { key: "bigtonic", name: "Big Red Tonic", desc: "Restores 220 HP. Same regret, bigger bottle.", price: 120, target: "ally", battle: true, field: true },
  ether: { key: "ether", name: "Blue Tonic", desc: "Restores 25 MP. Blue raspberry flavor (no raspberries were harmed).", price: 80, target: "ally", battle: true, field: true },
  feather: { key: "feather", name: "Phoenix Pinion", desc: "Revives a fallen ally with 40% HP. The phoenix wants it back.", price: 220, target: "koally", battle: true, field: true },
  antidote: { key: "antidote", name: "Antivenom", desc: "Cures poison. Mostly.", price: 20, target: "ally", battle: true, field: true },
  smoke: { key: "smoke", name: "Smoke Pellet", desc: "Escape any non-boss fight. Coughing included.", price: 60, target: "none", battle: true, field: false },
  dynamite: { key: "dynamite", name: "Discount Dynamite", desc: "~100 fire damage to all enemies. Fuse length: optimistic.", price: 110, target: "enemies", battle: true, field: false },
  soda: { key: "soda", name: "Sponsor Soda", desc: "+40 Hype. Now with 30% more existential dread!", price: 90, target: "none", battle: true, field: false },
  elixir: { key: "elixir", name: "Mystery Meat Elixir", desc: "Fully restores HP and MP. Do not ask what meat.", price: 600, target: "ally", battle: true, field: true },
  tent: { key: "tent", name: "Pop-Up Tent", desc: "Field only: fully heals the party. Assembly instructions in Goblin.", price: 260, target: "none", battle: false, field: true },
};

export const SHOP_BASIC = ["tonic", "ether", "antidote", "smoke", "feather"];
export const SHOP_LATE = ["bigtonic", "dynamite", "soda", "tent", "elixir"];

export const RARITY = [
  { name: "Common", color: "#e8e8f0" },
  { name: "Uncommon", color: "#60e070" },
  { name: "Rare", color: "#60a8ff" },
  { name: "Epic", color: "#d070ff" },
  { name: "Legendary", color: "#ffa830" },
];

const BASES: Record<GearSlot, { name: string; stats: Partial<Stats>; tags?: string }[]> = {
  weapon: [
    { name: "Longsword", stats: { atk: 4 } },
    { name: "Greataxe", stats: { atk: 6, spd: -1 } },
    { name: "Dagger", stats: { atk: 3, spd: 1 } },
    { name: "Wand", stats: { atk: 1, mag: 4 } },
    { name: "Staff", stats: { atk: 2, mag: 3, maxMp: 3 } },
    { name: "Mace", stats: { atk: 4, mag: 1 } },
    { name: "Frying Pan", stats: { atk: 4, def: 1 } },
    { name: "Spatula", stats: { atk: 2, mag: 2, luck: 2 } },
    { name: "Umbrella", stats: { atk: 3, def: 1 } },
    { name: "Baguette", stats: { atk: 3, maxHp: 6 } },
    { name: "Folding Chair", stats: { atk: 5, luck: 1 } },
    { name: "Scepter", stats: { mag: 5 } },
    { name: "Microphone", stats: { atk: 2, mag: 3, luck: 1 } },
  ],
  armor: [
    { name: "Chainmail", stats: { def: 4, spd: -1 } },
    { name: "Robe", stats: { def: 2, mag: 2 } },
    { name: "Leather Vest", stats: { def: 3, spd: 1 } },
    { name: "Bathrobe", stats: { def: 2, maxHp: 8 } },
    { name: "Hoodie", stats: { def: 2, luck: 2 } },
    { name: "Cardigan", stats: { def: 2, maxMp: 4 } },
    { name: "Breastplate", stats: { def: 5, spd: -1 } },
    { name: "Tracksuit", stats: { def: 2, spd: 2 } },
    { name: "Tuxedo", stats: { def: 3, luck: 1 } },
  ],
  trinket: [
    { name: "Ring", stats: { luck: 2 } },
    { name: "Amulet", stats: { mag: 2 } },
    { name: "Fanny Pack", stats: { def: 1, luck: 2 } },
    { name: "Lanyard", stats: { maxMp: 4 } },
    { name: "Toe Ring", stats: { spd: 2 } },
    { name: "Friendship Bracelet", stats: { maxHp: 10 } },
    { name: "Sweatband", stats: { atk: 2 } },
    { name: "Monocle", stats: { mag: 1, luck: 2 } },
    { name: "Participation Medal", stats: { maxHp: 5, luck: 1 } },
  ],
};

const MATERIALS = [
  ["Rusty", "Wooden", "Cardboard", "Bent", "Soggy"],
  ["Iron", "Bronze", "Sturdy", "Polished", "Reinforced"],
  ["Steel", "Mithral", "Silvered", "Runed", "Blessed"],
  ["Adamant", "Crystal", "Dragonbone", "Starforged", "Haunted"],
  ["Mythic", "Celestial", "Primetime", "Showstopping", "Forbidden"],
];

const AFFIXES: { suffix: string; stats: Partial<Stats>; element?: Element }[] = [
  { suffix: "of the Bear", stats: { maxHp: 12, atk: 1 } },
  { suffix: "of the Owl", stats: { mag: 3 } },
  { suffix: "of the Fox", stats: { spd: 2, luck: 2 } },
  { suffix: "of the Turtle", stats: { def: 3 } },
  { suffix: "of Mild Discomfort", stats: { atk: 2, def: -1 } },
  { suffix: "of Ratings", stats: { luck: 4 } },
  { suffix: "of Tuesday", stats: { maxMp: 5, spd: 1 } },
  { suffix: "of Flame", stats: { atk: 1 }, element: "fire" },
  { suffix: "of Frost", stats: { atk: 1 }, element: "ice" },
  { suffix: "of Sparks", stats: { atk: 1 }, element: "bolt" },
  { suffix: "of the Sponsor", stats: { luck: 2, maxHp: 6 } },
  { suffix: "of Overtime", stats: { atk: 2, spd: 1 } },
  { suffix: "of the Understudy", stats: { mag: 2, maxMp: 3 } },
  { suffix: "of Questionable Origin", stats: { atk: 2, mag: 2, luck: -1 } },
];

const FLAVOR = [
  "Smells faintly of #smell#.",
  "Previous owner: deceased. Probably fine.",
  "The System rates this item 'technically equipment.'",
  "Comes with a coupon for #smell#-scented candles.",
  "A sponsor's logo has been badly scratched off.",
  "Certified pre-owned by a #creature#.",
  "Still warm. Don't think about it.",
  "Tagged: 'DO NOT LICK.' Someone licked it.",
  "Viewers voted this 'most likely to be cursed.' It isn't. Probably.",
  "Engraved: 'To my dearest #creature#.'",
];
const SMELLS = ["burnt toast", "wet dog", "ozone", "cinnamon", "goblin feet", "victory", "old pennies", "lavender", "despair", "fried onions"];
const CREATURES = ["goblin", "mimic", "slime", "former accountant", "very large rat", "minor deity", "disgraced bard", "lich"];

let uidCounter = 0;
export function uid(prefix = "u"): string {
  uidCounter++;
  return `${prefix}${Date.now().toString(36)}${uidCounter.toString(36)}${Math.floor(Math.random() * 1e4).toString(36)}`;
}

/** Procedurally generate a piece of gear for a given floor/level and rarity. */
export function genGear(r: RNG, level: number, rarity: number, slot?: GearSlot): Gear {
  const s: GearSlot = slot ?? r.pick<GearSlot>(["weapon", "weapon", "armor", "armor", "trinket"]);
  const base = r.pick(BASES[s]);
  const mat = r.pick(MATERIALS[Math.min(4, rarity)]);
  const scale = 1 + level * 0.32 + rarity * 0.55;
  const stats: Partial<Stats> = {};
  const add = (k: keyof Stats, v: number) => {
    stats[k] = (stats[k] ?? 0) + v;
  };
  for (const [k, v] of Object.entries(base.stats) as [keyof Stats, number][]) {
    const mult = k === "maxHp" || k === "maxMp" ? scale * 1.2 : v < 0 ? 1 : scale;
    add(k, Math.round(v * mult));
  }
  let name = `${mat} ${base.name}`;
  let element: Element | undefined;
  const affixes = rarity >= 3 ? 2 : rarity >= 1 ? 1 : 0;
  const chosen = r.sample(AFFIXES, affixes);
  chosen.forEach((a, i) => {
    for (const [k, v] of Object.entries(a.stats) as [keyof Stats, number][]) add(k, Math.round(v * (1 + level * 0.12)));
    if (a.element && s === "weapon") element = a.element;
    if (i === 0) name += " " + a.suffix;
  });
  if (rarity === 4) name = r.pick(["The ", "Ol' ", "Big ", "Lil' "]) + name;
  for (const k of Object.keys(stats) as (keyof Stats)[]) if (stats[k] === 0) delete stats[k];
  const flavor = r
    .pick(FLAVOR)
    .replace("#smell#", r.pick(SMELLS))
    .replace("#creature#", r.pick(CREATURES));
  const value = Math.round((12 + level * 8) * (1 + rarity * 1.6));
  return { uid: uid("g"), slot: s, name, rarity, stats, desc: flavor, value, element };
}

export function starterWeapon(name: string, cls: string): Gear {
  const stats: Partial<Stats> = cls === "mage" ? { atk: 1, mag: 3 } : cls === "cleric" ? { atk: 2, mag: 2 } : cls === "rogue" ? { atk: 3, spd: 1 } : { atk: 4 };
  return { uid: uid("g"), slot: "weapon", name, rarity: 0, stats, desc: "Standard-issue crawler equipment. The System spent $4 on it.", value: 5 };
}

export function statLine(stats: Partial<Stats>): string {
  const names: Record<keyof Stats, string> = { maxHp: "HP", maxMp: "MP", atk: "ATK", def: "DEF", mag: "MAG", spd: "SPD", luck: "LCK" };
  return (Object.entries(stats) as [keyof Stats, number][])
    .map(([k, v]) => `${v > 0 ? "+" : ""}${v} ${names[k]}`)
    .join("  ");
}

export interface BoxReward {
  gold: number;
  items: Record<string, number>;
  gear: Gear[];
  joke?: string;
}

export const BOX_INFO: Record<BoxTier, { color: string; dark: string; label: string }> = {
  Bronze: { color: "#d08848", dark: "#6a3a18", label: "Bronze Box" },
  Silver: { color: "#c8d0e0", dark: "#5a6070", label: "Silver Box" },
  Gold: { color: "#f8d048", dark: "#8a6010", label: "Gold Box" },
  Legendary: { color: "#ff8030", dark: "#7a1808", label: "Legendary Box" },
  Fan: { color: "#ff70c0", dark: "#7a1050", label: "Fan Box" },
  Boss: { color: "#c040ff", dark: "#40107a", label: "Boss Box" },
  Sponsor: { color: "#40e0b0", dark: "#0a5a48", label: "Sponsor Box" },
};

const JOKES = [
  "a single left sock (+1 Hope)",
  "a coupon for 5% off your own funeral",
  "an autographed photo of the System",
  "a participation ribbon that says 'TRIED'",
  "a jar of artisanal dungeon air",
  "a strongly worded letter from a goblin's mother",
  "a VIP pass to a show that was cancelled",
  "one (1) emotional support pebble",
];

export function rollBox(r: RNG, tier: BoxTier, level: number): BoxReward {
  const reward: BoxReward = { gold: 0, items: {}, gear: [] };
  const addItem = (k: string, n = 1) => (reward.items[k] = (reward.items[k] ?? 0) + n);
  const lowItems = ["tonic", "tonic", "ether", "antidote", "smoke"];
  const highItems = ["bigtonic", "ether", "feather", "dynamite", "soda", "elixir"];
  switch (tier) {
    case "Bronze":
      reward.gold = r.int(15, 40) + level * 6;
      addItem(r.pick(lowItems), r.int(1, 2));
      if (r.chance(0.3)) reward.gear.push(genGear(r, level, r.chance(0.8) ? 0 : 1));
      if (r.chance(0.2)) reward.joke = r.pick(JOKES);
      break;
    case "Silver":
      reward.gold = r.int(50, 90) + level * 10;
      addItem(r.pick(lowItems), 2);
      addItem(r.pick(highItems), 1);
      reward.gear.push(genGear(r, level, r.chance(0.6) ? 1 : 2));
      break;
    case "Gold":
      reward.gold = r.int(120, 200) + level * 16;
      addItem(r.pick(highItems), 2);
      reward.gear.push(genGear(r, level, r.chance(0.65) ? 2 : 3));
      if (r.chance(0.5)) reward.gear.push(genGear(r, level, 1));
      break;
    case "Legendary":
      reward.gold = r.int(400, 700) + level * 30;
      addItem("elixir", 2);
      addItem("feather", 1);
      reward.gear.push(genGear(r, level + 2, 4));
      reward.gear.push(genGear(r, level, 3));
      break;
    case "Fan":
      reward.gold = r.int(40, 120) + level * 8;
      addItem(r.pick(["soda", "tonic", "ether", "bigtonic"]), r.int(1, 3));
      if (r.chance(0.5)) reward.gear.push(genGear(r, level, r.int(1, 3)));
      reward.joke = r.chance(0.5) ? r.pick(JOKES) : undefined;
      break;
    case "Boss":
      reward.gold = r.int(150, 250) + level * 20;
      addItem(r.pick(highItems), 1);
      addItem("tonic", 2);
      reward.gear.push(genGear(r, level + 1, r.chance(0.5) ? 2 : 3));
      break;
    case "Sponsor":
      reward.gold = r.int(250, 400) + level * 20;
      addItem("soda", 2);
      reward.gear.push(genGear(r, level + 1, 3));
      break;
  }
  return reward;
}
