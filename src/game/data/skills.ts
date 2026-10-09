import type { Element, StatusKey } from "../types";

export type Target = "enemy" | "enemies" | "ally" | "allies" | "self" | "koally" | "randomEnemies";
export type SkillKind = "phys" | "magic" | "heal" | "buff" | "debuff" | "steal" | "escape" | "revive" | "special";

export interface Skill {
  id: string;
  name: string;
  mp: number;
  target: Target;
  kind: SkillKind;
  power: number;
  element?: Element;
  hits?: number;
  status?: { key: StatusKey; turns: number; chance: number };
  cure?: StatusKey[];
  crit?: number; // bonus crit chance
  steal?: boolean;
  drain?: number; // fraction of damage healed to user
  field?: boolean; // usable from the pause menu
  fx: string;
  desc: string;
  showstopper?: boolean;
}

const S = (s: Skill) => s;

export const SKILLS: Record<string, Skill> = {
  attack: S({ id: "attack", name: "Attack", mp: 0, target: "enemy", kind: "phys", power: 1, fx: "slash", desc: "Hit it with the pointy end." }),

  // ---------------------------------------------------------------- Knight
  cleave: S({ id: "cleave", name: "Cleave", mp: 4, target: "enemies", kind: "phys", power: 0.75, fx: "slash", desc: "A wide swing that hits every enemy." }),
  shieldwall: S({ id: "shieldwall", name: "Shield Wall", mp: 5, target: "allies", kind: "buff", power: 0, status: { key: "shield", turns: 3, chance: 1 }, fx: "shield", desc: "Party takes less damage for 3 turns." }),
  armorbreak: S({ id: "armorbreak", name: "Armor Break", mp: 4, target: "enemy", kind: "phys", power: 0.9, status: { key: "break", turns: 3, chance: 0.9 }, fx: "slash", desc: "Hit + lower the target's defense." }),
  valor: S({ id: "valor", name: "Valor Strike", mp: 8, target: "enemy", kind: "phys", power: 2.2, crit: 0.1, fx: "bigslash", desc: "A huge, slightly show-offy blow." }),
  secondwind: S({ id: "secondwind", name: "Second Wind", mp: 6, target: "self", kind: "heal", power: 0, fx: "heal", field: true, desc: "Recover 40% of your HP. Walk it off." }),
  slam: S({ id: "slam", name: "Gladiator Slam", mp: 0, target: "enemies", kind: "phys", power: 3, crit: 0.3, fx: "quake", showstopper: true, desc: "SHOWSTOPPER: The crowd chants your name." }),

  // ---------------------------------------------------------------- Hex Mage
  fire: S({ id: "fire", name: "Fire", mp: 4, target: "enemy", kind: "magic", power: 1.25, element: "fire", fx: "fire", desc: "Fire damage to one enemy." }),
  frost: S({ id: "frost", name: "Frost", mp: 4, target: "enemy", kind: "magic", power: 1.25, element: "ice", fx: "ice", desc: "Ice damage to one enemy." }),
  bolt: S({ id: "bolt", name: "Bolt", mp: 5, target: "enemy", kind: "magic", power: 1.3, element: "bolt", fx: "bolt", desc: "Lightning damage to one enemy." }),
  drain: S({ id: "drain", name: "Drain", mp: 6, target: "enemy", kind: "magic", power: 1.0, element: "dark", drain: 0.5, fx: "dark", desc: "Dark damage; heals you for half." }),
  inferno: S({ id: "inferno", name: "Inferno", mp: 10, target: "enemies", kind: "magic", power: 1.0, element: "fire", fx: "fire", desc: "Fire damage to all enemies." }),
  glacier: S({ id: "glacier", name: "Glacier", mp: 10, target: "enemies", kind: "magic", power: 1.0, element: "ice", fx: "ice", desc: "Ice damage to all enemies." }),
  storm: S({ id: "storm", name: "Thunderhead", mp: 12, target: "enemies", kind: "magic", power: 1.05, element: "bolt", fx: "bolt", desc: "Lightning damage to all enemies." }),
  meteor: S({ id: "meteor", name: "Pay-Per-View Meteor", mp: 0, target: "enemies", kind: "magic", power: 3.2, fx: "meteor", showstopper: true, desc: "SHOWSTOPPER: Non-elemental doom from above." }),

  // ---------------------------------------------------------------- Cleric
  cure: S({ id: "cure", name: "Cure", mp: 4, target: "ally", kind: "heal", power: 1.6, fx: "heal", field: true, desc: "Restore HP to one ally." }),
  smite: S({ id: "smite", name: "Smite", mp: 4, target: "enemy", kind: "magic", power: 1.2, element: "holy", fx: "holy", desc: "Holy damage to one enemy." }),
  purify: S({ id: "purify", name: "Purify", mp: 3, target: "ally", kind: "heal", power: 0, cure: ["poison", "stun", "weaken", "break"], fx: "heal", field: true, desc: "Remove ailments from one ally." }),
  barrier: S({ id: "barrier", name: "Barrier", mp: 6, target: "allies", kind: "buff", power: 0, status: { key: "shield", turns: 3, chance: 1 }, fx: "shield", desc: "Party takes less damage for 3 turns." }),
  masscure: S({ id: "masscure", name: "Mass Cure", mp: 9, target: "allies", kind: "heal", power: 1.1, fx: "heal", field: true, desc: "Restore HP to the whole party." }),
  revive: S({ id: "revive", name: "Revive", mp: 12, target: "koally", kind: "revive", power: 0.4, fx: "holy", field: true, desc: "Bring a fallen ally back at 40% HP." }),
  judgment: S({ id: "judgment", name: "Judgment", mp: 14, target: "enemies", kind: "magic", power: 1.3, element: "holy", fx: "holy", desc: "Holy damage to all enemies." }),
  miracle: S({ id: "miracle", name: "Prime-Time Miracle", mp: 0, target: "allies", kind: "special", power: 1, fx: "holy", showstopper: true, desc: "SHOWSTOPPER: Full heal + revive everyone." }),

  // ---------------------------------------------------------------- Rogue
  steal: S({ id: "steal", name: "Steal", mp: 0, target: "enemy", kind: "steal", power: 0, steal: true, fx: "steal", desc: "Lift an item. Finders keepers." }),
  backstab: S({ id: "backstab", name: "Backstab", mp: 4, target: "enemy", kind: "phys", power: 1.3, crit: 0.4, fx: "slash", desc: "High crit chance. Very rude." }),
  smokebomb: S({ id: "smokebomb", name: "Smoke Bomb", mp: 5, target: "self", kind: "escape", power: 0, fx: "smoke", desc: "Guaranteed escape (not from bosses)." }),
  venom: S({ id: "venom", name: "Venom Edge", mp: 5, target: "enemy", kind: "phys", power: 1.0, status: { key: "poison", turns: 4, chance: 0.85 }, fx: "poison", desc: "Hit + poison." }),
  mug: S({ id: "mug", name: "Mug", mp: 6, target: "enemy", kind: "phys", power: 1.2, steal: true, fx: "steal", desc: "Hit AND steal. Efficient." }),
  flurry: S({ id: "flurry", name: "Flurry", mp: 9, target: "randomEnemies", kind: "phys", power: 0.6, hits: 4, fx: "slash", desc: "Four quick hits on random enemies." }),
  heist: S({ id: "heist", name: "Heist of the Season", mp: 0, target: "enemies", kind: "phys", power: 2.4, steal: true, fx: "steal", showstopper: true, desc: "SHOWSTOPPER: Rob everyone. Hurt everyone." }),

  // ---------------------------------------------------------------- Pets
  claw: S({ id: "claw", name: "Claw Swipe", mp: 0, target: "enemy", kind: "phys", power: 1.15, fx: "claw", desc: "Rakes the target. Unapologetically." }),
  hiss: S({ id: "hiss", name: "Hiss", mp: 3, target: "enemies", kind: "debuff", power: 0, status: { key: "weaken", turns: 3, chance: 0.8 }, fx: "debuff", desc: "Lowers all enemies' attack." }),
  pounce: S({ id: "pounce", name: "Pounce", mp: 6, target: "enemy", kind: "phys", power: 1.9, crit: 0.15, fx: "claw", desc: "A leap of pure malice." }),
  ninelives: S({ id: "ninelives", name: "Nine Lives", mp: 0, target: "allies", kind: "special", power: 0.6, fx: "holy", showstopper: true, desc: "SHOWSTOPPER: Revive + heal 60% to all." }),

  bubble: S({ id: "bubble", name: "Bubble Jet", mp: 0, target: "enemy", kind: "magic", power: 1.0, element: "ice", fx: "ice", desc: "Pressurized bowl water. Cold." }),
  splash: S({ id: "splash", name: "Soothing Splash", mp: 6, target: "allies", kind: "heal", power: 0.8, fx: "heal", field: true, desc: "Heals the party a little." }),
  tidal: S({ id: "tidal", name: "Tidal Bowl", mp: 9, target: "enemies", kind: "magic", power: 1.0, element: "ice", fx: "ice", desc: "Ice damage to all enemies." }),
  flood: S({ id: "flood", name: "Flood the Studio", mp: 0, target: "enemies", kind: "magic", power: 2.8, element: "ice", fx: "ice", showstopper: true, desc: "SHOWSTOPPER: Water damage. Everywhere." }),

  snort: S({ id: "snort", name: "Snort", mp: 0, target: "enemy", kind: "debuff", power: 0, status: { key: "weaken", turns: 3, chance: 0.9 }, fx: "debuff", desc: "Disgusting. Lowers the target's attack." }),
  bellyflop: S({ id: "bellyflop", name: "Belly Flop", mp: 4, target: "enemy", kind: "phys", power: 1.4, status: { key: "stun", turns: 1, chance: 0.25 }, fx: "quake", desc: "Heavy hit. May stun." }),
  goodboy: S({ id: "goodboy", name: "Good Boy Aura", mp: 7, target: "allies", kind: "buff", power: 0, status: { key: "regen", turns: 4, chance: 1 }, fx: "heal", desc: "Party regenerates HP for 4 turns." }),
  puppyeyes: S({ id: "puppyeyes", name: "Puppy Eyes", mp: 0, target: "enemies", kind: "debuff", power: 0, status: { key: "stun", turns: 2, chance: 1 }, fx: "holy", showstopper: true, desc: "SHOWSTOPPER: Enemies are too moved to act." }),

  pinch: S({ id: "pinch", name: "Pinch", mp: 0, target: "enemy", kind: "phys", power: 1.0, status: { key: "break", turns: 2, chance: 0.5 }, fx: "claw", desc: "May lower the target's defense." }),
  shellup: S({ id: "shellup", name: "Shell Up", mp: 4, target: "allies", kind: "buff", power: 0, status: { key: "shield", turns: 3, chance: 1 }, fx: "shield", desc: "Party takes less damage for 3 turns." }),
  shuffle: S({ id: "shuffle", name: "Sideways Shuffle", mp: 6, target: "enemies", kind: "phys", power: 0.85, fx: "claw", desc: "Hits all enemies. Somehow." }),
  crabnado: S({ id: "crabnado", name: "Crabnado", mp: 0, target: "enemies", kind: "phys", power: 2.6, fx: "quake", showstopper: true, desc: "SHOWSTOPPER: It's exactly what it sounds like." }),

  peck: S({ id: "peck", name: "Peck", mp: 0, target: "randomEnemies", kind: "phys", power: 0.5, hits: 3, fx: "claw", desc: "Three pecks at random." }),
  eggtoss: S({ id: "eggtoss", name: "Egg Toss", mp: 4, target: "enemy", kind: "magic", power: 1.3, fx: "egg", desc: "A random element. Even the chicken doesn't know." }),
  flap: S({ id: "flap", name: "Flap of Doom", mp: 7, target: "enemies", kind: "debuff", power: 0, status: { key: "stun", turns: 1, chance: 0.45 }, fx: "smoke", desc: "May stun all enemies." }),
  roostercall: S({ id: "roostercall", name: "Rooster Call", mp: 0, target: "allies", kind: "special", power: 1, status: { key: "haste", turns: 4, chance: 1 }, fx: "holy", showstopper: true, desc: "SHOWSTOPPER: Party hasted + full MP." }),

  // ---------------------------------------------------------------- Enemies
  bite: S({ id: "bite", name: "Bite", mp: 0, target: "enemy", kind: "phys", power: 1.0, fx: "claw", desc: "" }),
  maul: S({ id: "maul", name: "Maul", mp: 0, target: "enemy", kind: "phys", power: 1.4, fx: "claw", desc: "" }),
  howl: S({ id: "howl", name: "Howl", mp: 0, target: "self", kind: "buff", power: 0, status: { key: "haste", turns: 3, chance: 1 }, fx: "debuff", desc: "" }),
  rabid: S({ id: "rabid", name: "Rabid Bite", mp: 0, target: "enemy", kind: "phys", power: 0.9, status: { key: "poison", turns: 3, chance: 0.6 }, fx: "poison", desc: "" }),
  slash: S({ id: "slash", name: "Slash", mp: 0, target: "enemy", kind: "phys", power: 1.0, fx: "slash", desc: "" }),
  shank: S({ id: "shank", name: "Shank", mp: 0, target: "enemy", kind: "phys", power: 1.15, crit: 0.2, fx: "slash", desc: "" }),
  rock: S({ id: "rock", name: "Throw Rock", mp: 0, target: "enemy", kind: "phys", power: 0.9, fx: "quake", desc: "" }),
  curse: S({ id: "curse", name: "Curse", mp: 0, target: "enemy", kind: "debuff", power: 0, status: { key: "weaken", turns: 3, chance: 0.75 }, fx: "dark", desc: "" }),
  mend: S({ id: "mend", name: "Mend", mp: 0, target: "self", kind: "heal", power: 1.2, fx: "heal", desc: "" }),
  complaint: S({ id: "complaint", name: "File a Complaint", mp: 0, target: "enemy", kind: "debuff", power: 0, status: { key: "stun", turns: 1, chance: 0.6 }, fx: "debuff", desc: "" }),
  gaze: S({ id: "gaze", name: "Gaze", mp: 0, target: "enemy", kind: "debuff", power: 0, status: { key: "stun", turns: 1, chance: 0.5 }, fx: "dark", desc: "" }),
  zap: S({ id: "zap", name: "Zap", mp: 0, target: "enemy", kind: "magic", power: 1.0, element: "bolt", fx: "bolt", desc: "" }),
  siphon: S({ id: "siphon", name: "Siphon", mp: 0, target: "enemy", kind: "magic", power: 0.9, element: "dark", drain: 0.5, fx: "dark", desc: "" }),
  engulf: S({ id: "engulf", name: "Engulf", mp: 0, target: "enemy", kind: "phys", power: 1.1, fx: "quake", desc: "" }),
  acid: S({ id: "acid", name: "Acid Splash", mp: 0, target: "enemies", kind: "magic", power: 0.6, element: "poison", status: { key: "poison", turns: 3, chance: 0.35 }, fx: "poison", desc: "" }),
  jiggle: S({ id: "jiggle", name: "Jiggle", mp: 0, target: "self", kind: "buff", power: 0, status: { key: "shield", turns: 3, chance: 1 }, fx: "shield", desc: "" }),
  sting: S({ id: "sting", name: "Sting", mp: 0, target: "enemy", kind: "phys", power: 0.9, status: { key: "poison", turns: 3, chance: 0.7 }, fx: "poison", desc: "" }),
  swarm: S({ id: "swarm", name: "Swarm", mp: 0, target: "randomEnemies", kind: "phys", power: 0.45, hits: 3, fx: "claw", desc: "" }),
  chitter: S({ id: "chitter", name: "Chitter", mp: 0, target: "enemy", kind: "debuff", power: 0, status: { key: "break", turns: 3, chance: 0.75 }, fx: "debuff", desc: "" }),
  constrict: S({ id: "constrict", name: "Constrict", mp: 0, target: "enemy", kind: "phys", power: 1.2, status: { key: "stun", turns: 1, chance: 0.3 }, fx: "quake", desc: "" }),
  spit: S({ id: "spit", name: "Venom Spit", mp: 0, target: "enemy", kind: "magic", power: 0.8, element: "poison", status: { key: "poison", turns: 4, chance: 0.8 }, fx: "poison", desc: "" }),
  tailwhip: S({ id: "tailwhip", name: "Tail Whip", mp: 0, target: "enemies", kind: "phys", power: 0.7, fx: "slash", desc: "" }),
  vine: S({ id: "vine", name: "Vine Lash", mp: 0, target: "enemy", kind: "phys", power: 1.1, fx: "slash", desc: "" }),
  spores: S({ id: "spores", name: "Spore Cloud", mp: 0, target: "enemies", kind: "debuff", power: 0, status: { key: "poison", turns: 3, chance: 0.55 }, fx: "poison", desc: "" }),
  shriek: S({ id: "shriek", name: "Shriek", mp: 0, target: "enemies", kind: "debuff", power: 0, status: { key: "stun", turns: 1, chance: 0.3 }, fx: "debuff", desc: "" }),
  photo: S({ id: "photo", name: "Photosynthesize", mp: 0, target: "self", kind: "heal", power: 1.0, fx: "heal", desc: "" }),
  bash: S({ id: "bash", name: "Slam", mp: 0, target: "enemy", kind: "phys", power: 1.3, fx: "quake", desc: "" }),
  laser: S({ id: "laser", name: "Laser", mp: 0, target: "enemy", kind: "magic", power: 1.1, element: "bolt", fx: "bolt", desc: "" }),
  repair: S({ id: "repair", name: "Self-Repair", mp: 0, target: "self", kind: "heal", power: 1.0, fx: "heal", desc: "" }),
  firebreath: S({ id: "firebreath", name: "Fire Breath", mp: 0, target: "enemies", kind: "magic", power: 0.75, element: "fire", fx: "fire", desc: "" }),
  frostbreath: S({ id: "frostbreath", name: "Frost Breath", mp: 0, target: "enemies", kind: "magic", power: 0.75, element: "ice", fx: "ice", desc: "" }),
  spark: S({ id: "spark", name: "Static Discharge", mp: 0, target: "enemies", kind: "magic", power: 0.75, element: "bolt", fx: "bolt", desc: "" }),
  hex: S({ id: "hex", name: "Unholy Hex", mp: 0, target: "enemy", kind: "magic", power: 1.1, element: "dark", fx: "dark", desc: "" }),
  selfie: S({ id: "selfie", name: "Take a Selfie", mp: 0, target: "self", kind: "buff", power: 0, status: { key: "shield", turns: 2, chance: 1 }, fx: "flash", desc: "" }),
  onbreak: S({ id: "onbreak", name: "Take Union Break", mp: 0, target: "self", kind: "heal", power: 0.6, fx: "heal", desc: "" }),

  // boss specials
  charge: S({ id: "charge", name: "Charging Up", mp: 0, target: "self", kind: "buff", power: 0, status: { key: "charge", turns: 2, chance: 1 }, fx: "charge", desc: "" }),
  devastate: S({ id: "devastate", name: "Devastate", mp: 0, target: "enemies", kind: "phys", power: 1.6, fx: "quake", desc: "" }),
  commercial: S({ id: "commercial", name: "Commercial Break", mp: 0, target: "self", kind: "heal", power: 2.2, fx: "heal", desc: "" }),
  wrath: S({ id: "wrath", name: "Ratings Wrath", mp: 0, target: "enemies", kind: "magic", power: 1.0, element: "dark", fx: "dark", desc: "" }),
  finale: S({ id: "finale", name: "Season Finale", mp: 0, target: "enemies", kind: "magic", power: 1.9, fx: "meteor", desc: "" }),
  cancel: S({ id: "cancel", name: "Cancellation", mp: 0, target: "enemy", kind: "magic", power: 2.0, element: "dark", fx: "dark", desc: "" }),
  prism: S({ id: "prism", name: "Prism Beam", mp: 0, target: "randomEnemies", kind: "magic", power: 0.8, hits: 3, element: "holy", fx: "holy", desc: "" }),
};

export function skill(id: string): Skill {
  return SKILLS[id] ?? SKILLS.attack;
}
