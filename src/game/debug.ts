// Dev-only helpers, exposed as window.__dbg when running `npm run dev`.
// Lets you warp floors, start specific fights and stand next to story NPCs.

import { finalBoss, floorBoss, mimic, rivalBoss } from "./encounters";
import type { Game } from "./Game";
import type { EntityType } from "./gen/dungeon";
import { BattleScene } from "./scenes/battle";
import { beginFloor } from "./scenes/flow";
import { ExploreScene } from "./scenes/explore";
import { themeById } from "./engine/tiles";

export function install(game: Game) {
  const dbg = {
    warp(n: number) {
      const run = game.run!;
      run.enterFloor(n);
      beginFloor(game, true);
    },
    near(type: EntityType) {
      const run = game.run!;
      const e = run.floor.entities.find((x) => x.type === type);
      if (!e) return "none";
      for (const [dx, dy] of [[0, 1], [0, -1], [1, 0], [-1, 0]]) {
        const x = e.x + dx;
        const y = e.y + dy;
        if (run.floor.tiles[y * run.floor.w + x] !== 0 && !run.floor.entities.some((o) => o.x === x && o.y === y && o.solid)) {
          run.playerPos = { x, y };
          const ex = new ExploreScene(game);
          (ex as unknown as { dir: string }).dir = dx === 1 ? "left" : dx === -1 ? "right" : dy === 1 ? "up" : "down";
          game.goto(ex);
          return { x, y };
        }
      }
      return "blocked";
    },
    fight(kind: "boss" | "final1" | "final2" | "rival" | "mimic") {
      const run = game.run!;
      const e = kind === "boss" ? floorBoss(run, run.floorN) : kind === "rival" ? rivalBoss(run) : kind === "mimic" ? mimic(3, 7) : finalBoss(run, kind === "final1" ? 1 : 2);
      const bs: BattleScene = new BattleScene(game, [e], {
        mode: "normal",
        canFlee: true,
        music: "boss",
        theme: themeById(run.story.floors[run.floorN - 1].themeId),
        onEnd: () => game.pop(bs),
      });
      game.push(bs);
    },
    strong(level = 12) {
      const run = game.run!;
      while (run.party.some((h) => h.level < level)) run.gainXp(25);
      run.healAll();
      run.hype = 100;
      run.addItem("elixir", 3);
      run.addItem("dynamite", 2);
      run.addBox("Gold", "Debug");
      run.addBox("Legendary", "Debug");
    },
    nuke() {
      const bs = game.stack.find((s) => s instanceof BattleScene) as unknown as { foes: { foe: { hp: number } }[] } | undefined;
      bs?.foes.forEach((f) => (f.foe.hp = 1));
    },
    state() {
      const run = game.run!;
      return { floor: run.floorN, flags: run.flags, pos: run.playerPos, stack: game.stack.map((s) => s.constructor.name), twist: run.story.twist, villain: run.story.villain.full };
    },
  };
  (window as unknown as { __dbg: typeof dbg }).__dbg = dbg;
}
