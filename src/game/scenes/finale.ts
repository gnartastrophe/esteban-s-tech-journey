// The season finale: confrontation, two-phase final battle, ending.

import { finalBoss } from "../encounters";
import type { Game } from "../Game";
import { endingScript, finalConfrontScript, finalPhase2Script } from "../gen/story";
import { CutsceneScene, EndingScene } from "./cutscene";
import type { ExploreScene } from "./explore";

export async function finalSequence(game: Game, ex: ExploreScene) {
  const run = game.run!;
  const s = run.story;
  await game.dialog(finalConfrontScript(s, run.flags));
  const r1 = await ex.battle([finalBoss(run, 1)], { boss: true, music: "boss", canFlee: false, noResults: true });
  if (r1 !== "win") return;
  await game.dialog(finalPhase2Script(s));
  // the Crystal steadies the party between phases (fully, if the System is on your side)
  for (const h of run.party) {
    const st = run.statsOf(h);
    const k = s.twist === "systemally" ? 1 : 0.5;
    h.hp = Math.max(h.hp, Math.round(st.maxHp * k));
    h.mp = Math.max(h.mp, Math.round(st.maxMp * k));
    h.status = {};
  }
  const r2 = await ex.battle([finalBoss(run, 2)], { boss: true, music: "final", canFlee: false });
  if (r2 !== "win") return;
  run.fstate.bossDefeated = true;
  run.unlock("finale");
  const end = endingScript(s, run.flags);
  run.addLog(`ENDING: ${end.title}`);
  ex.setBusy(true);
  await game.goto(new CutsceneScene(game, end.lines, "ending", () => game.goto(new EndingScene(game, end.title))));
}
