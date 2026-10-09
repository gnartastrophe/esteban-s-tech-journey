// Deterministic special encounters: floor bosses, the rival, mimics, the finale.

import { RNG } from "./engine/rng";
import { genEnemy, makeBoss } from "./data/enemies";
import { classDef } from "./data/classes";
import { enemyLevel } from "./gen/dungeon";
import type { Run } from "./run";
import type { EnemyInstance } from "./types";

export function floorBoss(run: Run, n: number): EnemyInstance {
  const plan = run.story.floors[n - 1];
  const r = run.rng("boss" + n);
  const e = genEnemy(r, enemyLevel(n) + 2, n, { arch: plan.boss.arch, hue: plan.boss.hue, allowPrefix: false });
  makeBoss(e, plan.boss.name, enemyLevel(n) + 2, "floor", 4.2 + n * 0.5);
  e.size = 56;
  if (!e.weak.length) e.weak = [r.pick(["fire", "ice", "bolt", "holy"] as const)];
  e.desc = `${plan.boss.name} ${plan.boss.epithet}. Floor ${n} boss. Weak to ${e.weak.join(" & ")}. Telegraphs big attacks; DEFEND when it charges.`;
  return e;
}

export function rivalBoss(run: Run): EnemyInstance {
  const r = run.rng("rivalboss");
  const e = genEnemy(r, enemyLevel(4) + 1, 4, { arch: "humanoid", allowPrefix: false });
  makeBoss(e, run.story.rival.name, enemyLevel(4) + 1, "rival", 3.2);
  e.desc = `${run.story.rival.name}, ${classDef(run.story.rival.cls).name}. Your rival. Holds a grudge and a weapon.`;
  e.moves = ["attack", "shank", "slash", "curse", "charge", "mend"];
  e.weak = [];
  e.resist = [];
  e.special = "person";
  e.size = 60;
  return e;
}

export function mimic(level: number, seed: number): EnemyInstance {
  const e = genEnemy(new RNG(seed), level + 1, 1, { arch: "construct", allowPrefix: false });
  e.name = "Mimic";
  e.family = "Mimic";
  e.special = "mimic";
  e.stats.maxHp = Math.round(e.stats.maxHp * 1.6);
  e.hp = e.stats.maxHp;
  e.stats.atk = Math.round(e.stats.atk * 1.2);
  e.xp *= 3;
  e.gold *= 4;
  e.moves = ["attack", "bite", "maul", "engulf"];
  e.weak = ["bolt"];
  e.resist = ["phys"];
  e.desc = "A MIMIC! It's a box that eats people who like boxes. You, specifically.";
  e.stealable = "elixir";
  return e;
}

export function finalBoss(run: Run, phase: 1 | 2): EnemyInstance {
  const v = run.story.villain;
  const r = run.rng("final" + phase);
  const lv = enemyLevel(5) + (phase === 1 ? 3 : 4);
  const e = genEnemy(r, lv, 5, { arch: phase === 1 ? v.arch1 : v.arch2, hue: phase === 1 ? 340 : 270, allowPrefix: false });
  makeBoss(e, phase === 1 ? v.name : `${v.kind === "algorithm" ? "Algorithm" : v.name}, Ascended`, lv, phase === 1 ? "final1" : "final2", phase === 1 ? 5.5 : 7.5);
  e.size = phase === 1 ? 56 : 72;
  e.weak = phase === 1 ? ["holy"] : [];
  e.resist = phase === 2 ? ["dark", "poison"] : ["dark"];
  e.moves = phase === 1 ? ["attack", "slash", "shank", "curse", "wrath", "cancel", "charge"] : ["attack", "prism", "wrath", "cancel", "finale", "charge"];
  e.desc = phase === 1 ? `${v.full}. Wants to ${v.motive}.` : "The villain, fused with the Crystal. The broadcast is coming from INSIDE the boss.";
  e.stealable = "elixir";
  e.pal = { hue: phase === 1 ? 340 : 275, sat: 70, hue2: phase === 1 ? 45 : 190, eye: phase === 1 ? "#ffe040" : "#ffffff" };
  if (phase === 1 && v.kind !== "algorithm") {
    e.special = "person";
    e.size = 60;
  }
  return e;
}
