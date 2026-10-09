// Glue between scenes: starting runs, floor transitions, game over, endings.

import { RNG } from "../engine/rng";
import { classLook, heroFrames, petFrames, randomLook } from "../engine/sprites";
import type { Game } from "../Game";
import { floorIntro, introScript } from "../gen/story";
import { Run, saveRun } from "../run";
import { CutsceneScene, FloorTitleScene } from "./cutscene";
import { ExploreScene } from "./explore";

export function wireRun(game: Game, run: Run) {
  game.run = run;
  run.notify = (n) => game.notify(n);
  game.portraits.clear();
  const s = run.story;
  if (run.hero.look) game.portraits.set(run.hero.name, heroFrames(run.hero.look, "down")[0]);
  game.portraits.set(run.pet.name, petFrames(run.pet.species!, false)[0]);
  game.portraits.set(s.rival.name, heroFrames(classLook(s.rival.cls, s.rival.lookSeed % 5, s.rival.lookSeed % 7), "down")[0]);
  const gl = randomLook(new RNG(s.seed).fork("guide-look"));
  gl.head = "mage";
  gl.pal.t = gl.pal.c = "#2a2a3a";
  gl.pal.T = gl.pal.C = "#16161e";
  gl.pal.a = "#606070";
  game.portraits.set(s.guide.name, heroFrames(gl, "down")[0]);
  if (s.villain.kind !== "algorithm") {
    const vl = randomLook(new RNG(s.seed).fork("villain-look"));
    vl.head = s.villain.kind === "heir" ? "crown" : s.villain.kind === "champion" ? "knight" : "bald";
    vl.pal.c = "#8a1030";
    vl.pal.C = "#4a0818";
    game.portraits.set(s.villain.name, heroFrames(vl, "down")[0]);
  }
}

export function introThenFloor(game: Game) {
  const run = game.run!;
  game.goto(
    new CutsceneScene(game, introScript(run.story), "intro", () => {
      beginFloor(game, true);
    }),
  );
}

/** Show the floor title card, then drop into exploration. */
export function beginFloor(game: Game, fresh: boolean) {
  const run = game.run!;
  if (fresh) saveRun(run);
  game.goto(
    new FloorTitleScene(game, run.floorN, () => {
      const ex = new ExploreScene(game);
      game.goto(ex).then(async () => {
        if (fresh) {
          ex.busy = true;
          await game.dialog(floorIntro(run.story, run.floorN));
          if (run.floorN === 1) run.unlock("enter");
          ex.busy = false;
        }
      });
    }),
  );
}

export function descend(game: Game) {
  const run = game.run!;
  run.enterFloor(run.floorN + 1);
  run.addLog(`Descended to floor ${run.floorN}: ${run.story.floors[run.floorN - 1].name}.`);
  beginFloor(game, true);
}
