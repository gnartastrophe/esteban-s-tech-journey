import { ARCHETYPES, Archetype, randomPalette } from "../engine/monsters";
import { RNG } from "../engine/rng";
import type { Element, EnemyInstance, Stats } from "../types";
import { uid } from "./items";

interface Family {
  names: string[];
  moves: string[];
  weak: Element[];
  resist: Element[];
  mult: Partial<Stats>;
  lore: string[];
}

export const FAMILIES: Record<Archetype, Family> = {
  beast: {
    names: ["Hound", "Ratling", "Boar", "Wolfkin", "Bugbear", "Weasel", "Badger", "Hyena", "Dire Possum"],
    moves: ["bite", "bite", "maul", "howl", "rabid"],
    weak: ["fire"],
    resist: [],
    mult: { maxHp: 1.0, atk: 1.1, spd: 1.1 },
    lore: ["used to be somebody's pet", "has rabies and a podcast", "was a perfectly normal farm animal until Tuesday"],
  },
  humanoid: {
    names: ["Goblin", "Ghoul", "Cultist", "Imp", "Bandit", "Hobgoblin", "Kobold", "Zealot", "Middle Manager", "Intern"],
    moves: ["slash", "shank", "rock", "curse", "mend"],
    weak: ["holy"],
    resist: [],
    mult: { maxHp: 0.95, atk: 1.0, mag: 1.0 },
    lore: ["signed a contract without reading it", "is three goblins in a trench coat", "has a mortgage and nothing to lose"],
  },
  floater: {
    names: ["Gazer", "Wisp", "Jelly", "Specter", "Drone", "Floating Eye", "Lantern", "Camera Drone"],
    moves: ["gaze", "zap", "siphon", "zap"],
    weak: ["bolt"],
    resist: ["poison"],
    mult: { maxHp: 0.8, mag: 1.25, def: 0.8, spd: 1.1 },
    lore: ["is technically a camera", "stares into your soul and finds it 'mid'", "files reports to management"],
  },
  blob: {
    names: ["Ooze", "Slime", "Pudding", "Gelatin", "Sludge", "Goo", "Aspic"],
    moves: ["engulf", "engulf", "acid", "jiggle"],
    weak: ["fire", "ice"],
    resist: ["phys", "poison"],
    mult: { maxHp: 1.25, def: 0.7, atk: 0.9, spd: 0.8 },
    lore: ["used to be a buffet", "absorbed a crawler and kept their sunglasses", "is 98% water and 2% spite"],
  },
  insect: {
    names: ["Mite", "Beetle", "Mantis", "Roach", "Wasp", "Tick", "Centipede"],
    moves: ["sting", "swarm", "chitter", "sting"],
    weak: ["fire", "ice"],
    resist: ["poison"],
    mult: { maxHp: 0.85, atk: 1.05, def: 1.15, spd: 1.2 },
    lore: ["survived three apocalypses already", "is the size of a sofa for legal reasons", "has 400 cousins nearby"],
  },
  serpent: {
    names: ["Wyrm", "Eel", "Naga", "Asp", "Worm", "Basilisk", "Python"],
    moves: ["constrict", "spit", "tailwhip", "bite"],
    weak: ["ice"],
    resist: ["poison"],
    mult: { maxHp: 1.1, atk: 1.05, mag: 1.0 },
    lore: ["is very long and very upset about it", "escaped from a pet store in the before-times", "can unhinge its jaw and its morals"],
  },
  plant: {
    names: ["Shrieker", "Bloom", "Thornling", "Mandrake", "Flytrap", "Spore Pod", "Ficus"],
    moves: ["vine", "spores", "shriek", "photo"],
    weak: ["fire"],
    resist: ["ice", "poison"],
    mult: { maxHp: 1.05, mag: 1.1, spd: 0.8 },
    lore: ["was an office plant nobody watered", "photosynthesizes hatred", "is in a rivalry with the floor's fungus"],
  },
  construct: {
    names: ["Golem", "Automaton", "Sentry", "Bot", "Totem", "Gargoyle", "Vending Machine"],
    moves: ["bash", "laser", "repair", "bash"],
    weak: ["bolt"],
    resist: ["poison", "phys"],
    mult: { maxHp: 1.15, def: 1.35, spd: 0.75, atk: 1.1 },
    lore: ["was assembled from discontinued merchandise", "has a warranty that expired", "runs on an obsolete operating system"],
  },
};

interface Prefix {
  name: string;
  mods: Partial<Stats>;
  moves?: string[];
  weak?: Element[];
  resist?: Element[];
  gold?: number;
  xp?: number;
  note: string;
  minFloor?: number;
}

export const PREFIXES: Prefix[] = [
  { name: "Feral", mods: { atk: 1.15 }, note: "It has abandoned all decorum." },
  { name: "Rabid", mods: { spd: 1.1 }, moves: ["rabid"], note: "Do not let it bite you. Or look at you." },
  { name: "Smoldering", mods: {}, moves: ["firebreath"], weak: ["ice"], resist: ["fire"], note: "It's on fire. It's fine. It's fine." },
  { name: "Frostbitten", mods: {}, moves: ["frostbreath"], weak: ["fire"], resist: ["ice"], note: "Cold-blooded, literally." },
  { name: "Crackling", mods: { spd: 1.1 }, moves: ["spark"], resist: ["bolt"], note: "Smells like a burnt-out arcade." },
  { name: "Unholy", mods: { mag: 1.15 }, moves: ["hex"], weak: ["holy"], resist: ["dark"], note: "Says grace backwards." },
  { name: "Sponsored", mods: { maxHp: 1.1 }, gold: 2, note: "Wearing a logo. Killing it voids its sponsorship." },
  { name: "Unionized", mods: { def: 1.2 }, moves: ["onbreak"], note: "Entitled to two 15-minute breaks per fight." },
  { name: "Tax-Exempt", mods: {}, gold: 1.8, note: "Somehow pays less tax than you." },
  { name: "Influencer", mods: { maxHp: 0.9 }, moves: ["selfie"], xp: 1.2, note: "Has 40K followers. Fewer soon." },
  { name: "Caffeinated", mods: { spd: 1.35 }, note: "Vibrating at an audible frequency." },
  { name: "Moist", mods: { maxHp: 1.15 }, resist: ["fire"], note: "We don't know why. We stopped asking." },
  { name: "Elite", mods: { maxHp: 1.3, atk: 1.15, def: 1.15 }, xp: 1.5, gold: 1.5, note: "Elite. It says so on its badge.", minFloor: 2 },
  { name: "Juvenile", mods: { maxHp: 0.7, atk: 0.85 }, xp: 0.8, note: "Aww. Still dangerous. Still aww." },
  { name: "Disgruntled", mods: { atk: 1.2, def: 0.85 }, note: "It has been passed over for promotion." },
  { name: "Radioactive", mods: { mag: 1.1 }, moves: ["acid"], resist: ["poison"], note: "Glows a little. Don't lick it." },
  { name: "Armored", mods: { def: 1.4, spd: 0.85 }, weak: ["bolt"], note: "Wearing a frankly unfair amount of plate." },
  { name: "Shiny", mods: { maxHp: 0.8, def: 1.5 }, xp: 3, gold: 3, note: "Rare variant! Viewers go feral for these.", minFloor: 2 },
];

const DESC_TPL = [
  "This is a {name}. It {lore}. {note}",
  "A level {level} {family}. It {lore}. {note} Weak to {weak}.",
  "{name}. The System's notes say it {lore}. {note}",
  "Ah, the {family}. This one {lore}. {note}",
];

const ELEMENT_NAMES: Record<Element, string> = { phys: "physical", fire: "fire", ice: "ice", bolt: "lightning", holy: "holy", dark: "dark", poison: "poison" };
export function elementName(e: Element) {
  return ELEMENT_NAMES[e];
}

export function baseEnemyStats(level: number): Stats {
  return {
    maxHp: Math.round(20 + level * 12 + level * level * 0.7),
    maxMp: 0,
    atk: Math.round(6 + level * 2.4),
    def: Math.round(3 + level * 1.7),
    mag: Math.round(6 + level * 2.4),
    spd: Math.round(5 + level * 0.85),
    luck: Math.round(4 + level * 0.5),
  };
}

export function genEnemy(r: RNG, level: number, floor: number, opts: { arch?: Archetype; hue?: number; allowPrefix?: boolean } = {}): EnemyInstance {
  const arch = opts.arch ?? r.pick(ARCHETYPES);
  const fam = FAMILIES[arch];
  const family = r.pick(fam.names);
  const prefixes = PREFIXES.filter((p) => (p.minFloor ?? 1) <= floor);
  const prefix = opts.allowPrefix === false ? undefined : r.chance(0.55 + floor * 0.06) ? r.pick(prefixes) : undefined;
  const st = baseEnemyStats(level);
  for (const [k, v] of Object.entries(fam.mult) as [keyof Stats, number][]) st[k] = Math.round(st[k] * v);
  if (prefix) for (const [k, v] of Object.entries(prefix.mods) as [keyof Stats, number][]) st[k] = Math.round(st[k] * v);
  const weak = [...new Set([...(prefix?.weak ?? []), ...fam.weak])].filter((e) => !(prefix?.resist ?? []).includes(e)).slice(0, 2);
  const resist = [...new Set([...(prefix?.resist ?? []), ...fam.resist])].filter((e) => !weak.includes(e));
  const moves = ["attack", ...fam.moves, ...(prefix?.moves ?? []), ...(prefix?.moves ?? [])];
  const name = prefix ? `${prefix.name} ${family}` : family;
  const lore = r.pick(fam.lore);
  const desc = r
    .pick(DESC_TPL)
    .replace("{name}", name)
    .replace("{family}", family)
    .replace("{level}", String(level))
    .replace("{lore}", lore)
    .replace("{note}", prefix?.note ?? "Otherwise unremarkable.")
    .replace("{weak}", weak.map(elementName).join(" & ") || "nothing in particular");
  const pal = randomPalette(r, opts.hue !== undefined && r.chance(0.5) ? opts.hue : undefined);
  if (prefix?.name === "Shiny") {
    pal.sat = 90;
    pal.hue = 48;
  }
  return {
    uid: uid("e"),
    name,
    family,
    arch,
    level,
    stats: st,
    hp: st.maxHp,
    mp: 0,
    weak,
    resist,
    moves,
    xp: Math.round((6 + level * 5.5) * (prefix?.xp ?? 1)),
    gold: Math.round((4 + level * 3.5) * (prefix?.gold ?? 1) * r.float(0.8, 1.2)),
    spriteSeed: r.int(1, 2 ** 30),
    pal,
    size: 32,
    desc,
    status: {},
    stealable: r.pick(["tonic", "tonic", "ether", "antidote", "smoke", "bigtonic", "dynamite"]),
    prefix: prefix?.name,
  };
}

/** Upgrade a generated enemy into a floor boss. */
export function makeBoss(e: EnemyInstance, name: string, level: number, kind: EnemyInstance["bossKind"], hpMult = 5.5): EnemyInstance {
  const st = baseEnemyStats(level);
  e.stats = {
    maxHp: Math.round(st.maxHp * hpMult),
    maxMp: 0,
    atk: Math.round(st.atk * 1.18),
    def: Math.round(st.def * 1.2),
    mag: Math.round(st.mag * 1.2),
    spd: Math.round(st.spd * 1.05),
    luck: st.luck,
  };
  e.hp = e.stats.maxHp;
  e.name = name;
  e.level = level;
  e.boss = true;
  e.bossKind = kind;
  e.size = 48;
  e.xp = Math.round(e.xp * 6);
  e.gold = Math.round(e.gold * 6);
  e.moves = [...new Set(e.moves.filter((m) => m !== "mend" && m !== "photo" && m !== "repair" && m !== "onbreak"))];
  e.moves.push("charge", "wrath");
  if (level >= 6) e.moves.push("commercial");
  e.stealable = "bigtonic";
  return e;
}
