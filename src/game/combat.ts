// Damage and healing formulas, kept pure so they're easy to reason about.

import type { Skill } from "./data/skills";
import type { Element, Stats, StatusMap } from "./types";

export interface Hit {
  miss: boolean;
  amount: number;
  crit: boolean;
  weak: boolean;
  resist: boolean;
}

export interface Defender {
  stats: Stats;
  status: StatusMap;
  weak: Element[];
  resist: Element[];
}

export function rollHit(att: Stats, def: Defender, sk: Skill, element: Element | undefined, rnd: () => number, power = sk.power): Hit {
  const magic = sk.kind === "magic";
  const physLike = !magic;
  if (physLike && rnd() < 0.04 + Math.max(0, (def.stats.spd - att.spd) * 0.004)) return { miss: true, amount: 0, crit: false, weak: false, resist: false };
  let base: number;
  if (magic) {
    base = att.mag * 1.9 - (def.stats.def * 0.35 + def.stats.mag * 0.3);
    base = Math.max(att.mag * 0.35, base);
  } else {
    base = att.atk * 1.7 - def.stats.def * 0.85;
    base = Math.max(att.atk * 0.2, base);
  }
  let dmg = base * power * (0.88 + rnd() * 0.24);
  const critChance = physLike ? 0.05 + att.luck * 0.004 + (sk.crit ?? 0) : 0.02 + (sk.crit ?? 0);
  const crit = rnd() < critChance;
  if (crit) dmg *= 1.75;
  const elementForCheck: Element | undefined = magic ? element : element ?? "phys";
  const weak = !!elementForCheck && def.weak.includes(elementForCheck);
  const resist = !!elementForCheck && def.resist.includes(elementForCheck);
  if (weak) dmg *= 1.6;
  if (resist) dmg *= 0.5;
  if (def.status.defend) dmg *= 0.5;
  if (def.status.shield) dmg *= 0.6;
  return { miss: false, amount: Math.max(1, Math.round(dmg)), crit, weak, resist };
}

export function healAmount(att: Stats, power: number, rnd: () => number): number {
  return Math.max(1, Math.round((att.mag * 1.5 + 14) * power * (0.95 + rnd() * 0.1)));
}

export function fleeChance(partySpd: number, enemySpd: number): number {
  return Math.max(0.25, Math.min(0.9, 0.55 + (partySpd - enemySpd) * 0.03));
}
