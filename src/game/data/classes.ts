import type { Species } from "../engine/sprites";
import type { Stats } from "../types";

export interface ClassDef {
  id: string;
  name: string;
  systemTitle: string;
  blurb: string;
  base: Stats;
  growth: Stats;
  learn: [number, string][];
  showstopper: string;
  startWeapon: string;
  traits: string;
}

export const CLASSES: ClassDef[] = [
  {
    id: "knight",
    name: "Knight",
    systemTitle: "Professional Meat Shield",
    blurb: "Big sword, bigger HP. The System notes your helmet makes you look 'approachable for the 18-34 demographic.'",
    base: { maxHp: 64, maxMp: 8, atk: 13, def: 10, mag: 3, spd: 7, luck: 5 },
    growth: { maxHp: 12, maxMp: 1.5, atk: 2.5, def: 2.1, mag: 0.6, spd: 0.8, luck: 0.5 },
    learn: [[1, "cleave"], [3, "shieldwall"], [5, "armorbreak"], [8, "valor"], [11, "secondwind"]],
    showstopper: "slam",
    startWeapon: "Rusty Longsword",
    traits: "High HP/DEF. Protects the party.",
  },
  {
    id: "mage",
    name: "Hex Mage",
    systemTitle: "Walking Pyrotechnics Budget",
    blurb: "Fire, ice, lightning. Fragile as a soufflé. Viewers adore explosions; try not to be one.",
    base: { maxHp: 40, maxMp: 26, atk: 5, def: 5, mag: 14, spd: 9, luck: 6 },
    growth: { maxHp: 6.5, maxMp: 4.2, atk: 0.9, def: 1.1, mag: 2.7, spd: 1.1, luck: 0.6 },
    learn: [[1, "fire"], [2, "frost"], [3, "bolt"], [5, "drain"], [6, "inferno"], [8, "glacier"], [10, "storm"]],
    showstopper: "meteor",
    startWeapon: "Splintered Wand",
    traits: "Elemental magic. Exploit weaknesses.",
  },
  {
    id: "cleric",
    name: "Cleric",
    systemTitle: "Unlicensed Medical Provider",
    blurb: "Heals, shields and the occasional holy smiting. Has absolutely no medical degree. Insurance not accepted.",
    base: { maxHp: 46, maxMp: 22, atk: 7, def: 7, mag: 12, spd: 8, luck: 7 },
    growth: { maxHp: 8, maxMp: 3.6, atk: 1.3, def: 1.5, mag: 2.2, spd: 1, luck: 0.7 },
    learn: [[1, "cure"], [2, "smite"], [3, "purify"], [4, "barrier"], [6, "masscure"], [7, "revive"], [10, "judgment"]],
    showstopper: "miracle",
    startWeapon: "Dented Censer",
    traits: "Healing & support. Hard to kill.",
  },
  {
    id: "rogue",
    name: "Rogue",
    systemTitle: "Kleptomaniac (Licensed)",
    blurb: "Fast, stabby and spots traps before they spot you. Steals from monsters, which the System calls 'redistribution.'",
    base: { maxHp: 48, maxMp: 12, atk: 11, def: 6, mag: 5, spd: 13, luck: 10 },
    growth: { maxHp: 8, maxMp: 2, atk: 2.2, def: 1.3, mag: 0.9, spd: 1.6, luck: 1 },
    learn: [[1, "steal"], [2, "backstab"], [4, "smokebomb"], [5, "venom"], [7, "mug"], [9, "flurry"]],
    showstopper: "heist",
    startWeapon: "Bent Shiv",
    traits: "Speed, crits, stealing. Sees traps.",
  },
];

export function classDef(id: string): ClassDef {
  return CLASSES.find((c) => c.id === id) ?? CLASSES[0];
}

export interface SpeciesDef {
  id: Species;
  label: string;
  role: string;
  base: Stats;
  growth: Stats;
  learn: [number, string][];
  showstopper: string;
}

export const SPECIES: SpeciesDef[] = [
  {
    id: "cat",
    label: "house cat",
    role: "Striker",
    base: { maxHp: 42, maxMp: 10, atk: 11, def: 6, mag: 6, spd: 14, luck: 12 },
    growth: { maxHp: 7.5, maxMp: 1.6, atk: 2.1, def: 1.2, mag: 1, spd: 1.6, luck: 1.2 },
    learn: [[1, "claw"], [3, "hiss"], [6, "pounce"]],
    showstopper: "ninelives",
  },
  {
    id: "goldfish",
    label: "goldfish",
    role: "Mystic",
    base: { maxHp: 36, maxMp: 22, atk: 4, def: 6, mag: 12, spd: 10, luck: 8 },
    growth: { maxHp: 6.5, maxMp: 3.6, atk: 0.7, def: 1.2, mag: 2.3, spd: 1.1, luck: 0.8 },
    learn: [[1, "bubble"], [3, "splash"], [6, "tidal"]],
    showstopper: "flood",
  },
  {
    id: "pug",
    label: "pug",
    role: "Bruiser",
    base: { maxHp: 56, maxMp: 12, atk: 10, def: 9, mag: 4, spd: 7, luck: 9 },
    growth: { maxHp: 10, maxMp: 1.8, atk: 2, def: 1.8, mag: 0.6, spd: 0.8, luck: 0.8 },
    learn: [[1, "snort"], [3, "bellyflop"], [6, "goodboy"]],
    showstopper: "puppyeyes",
  },
  {
    id: "crab",
    label: "hermit crab",
    role: "Defender",
    base: { maxHp: 52, maxMp: 10, atk: 10, def: 12, mag: 4, spd: 6, luck: 7 },
    growth: { maxHp: 9, maxMp: 1.6, atk: 1.9, def: 2.2, mag: 0.6, spd: 0.7, luck: 0.6 },
    learn: [[1, "pinch"], [3, "shellup"], [6, "shuffle"]],
    showstopper: "crabnado",
  },
  {
    id: "chicken",
    label: "chicken",
    role: "Chaos Agent",
    base: { maxHp: 40, maxMp: 16, atk: 9, def: 6, mag: 9, spd: 12, luck: 14 },
    growth: { maxHp: 7, maxMp: 2.6, atk: 1.7, def: 1.1, mag: 1.7, spd: 1.4, luck: 1.4 },
    learn: [[1, "peck"], [3, "eggtoss"], [6, "flap"]],
    showstopper: "roostercall",
  },
];

export function speciesDef(id: string): SpeciesDef {
  return SPECIES.find((s) => s.id === id) ?? SPECIES[0];
}

export function statsAt(base: Stats, growth: Stats, level: number): Stats {
  const l = level - 1;
  return {
    maxHp: Math.round(base.maxHp + growth.maxHp * l),
    maxMp: Math.round(base.maxMp + growth.maxMp * l),
    atk: Math.round(base.atk + growth.atk * l),
    def: Math.round(base.def + growth.def * l),
    mag: Math.round(base.mag + growth.mag * l),
    spd: Math.round(base.spd + growth.spd * l),
    luck: Math.round(base.luck + growth.luck * l),
  };
}

export function xpToNext(level: number): number {
  return Math.round(16 * Math.pow(level, 1.75) + 8);
}
