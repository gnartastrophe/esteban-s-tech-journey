# Final Floor: A Crawl Fantasy

A 16-bit style JRPG/ARPG hybrid playable at `/game`. A seed phrase generates the whole season: the world, the alien network that bought it, the dungeon AI's personality, your talking pet, the villain, your rival, a mid-season twist, five dungeon floors and every monster in them.

It is a crossover in spirit only: Final Fantasy-style ATB battles, crystals, jobs and summon-like limit breaks meet a Dungeon Crawler Carl-style death-game reality show with a snarky System, achievements, loot boxes, viewers and sponsors. All names, characters, art, music and text are original.

## How it plays

- **Explore**: grid movement with visible monsters that wander and chase. Face a monster and press confirm to get a **First Strike**. Get caught from behind and you're **Ambushed**.
- **Battle**: side-view ATB. Gauges fill by speed, and Wait mode pauses time while you choose. Exploit elemental weaknesses, defend against telegraphed boss attacks, and spend a full **Hype** bar on your Showstopper.
- **The show**: achievements award loot boxes; viewers grow with style and send Fan Boxes at milestones; a sponsor wants to buy you; the floor timer collapses the floor if you dawdle.
- **Story**: floor 1 tutorial NPC, a rival (help them or rob them), a resistance contact, a sponsorship offer, one of five twists revealed on floor 4, a choice to upload the "Dead Air" virus, and a two-phase finale. Four endings depend on your choices.

Controls: arrows/WASD move, Z/Space/Enter confirm and attack, X back, Esc/C menu, M map, Shift run. On touch devices an on-screen pad appears.

## Code map

| Path | What it does |
| --- | --- |
| `engine/` | Seeded RNG, bitmap font, window and bar drawing, input, WebAudio chiptune synth and composer, sprites, procedural monster generator, themed tiles |
| `data/` | Classes, pet species, skills, items and loot tables, enemy families and prefixes, achievements |
| `gen/` | Name generators, Tracery-style grammar, story generator and beat scripts, dungeon floor generator |
| `scenes/` | Title, character creation, cutscenes, exploration, battle and effects, pause menu, shop, loot box, finale, game over and ending |
| `Game.ts` | Main loop, scene stack, async dialogue and choice helpers, achievement banners, fades |
| `run.ts` | Party, inventory, viewers, hype, flags, achievements, and save/load (localStorage) |
| `encounters.ts` | Deterministic bosses, rival, mimic and finale fights |
| `debug.ts` | Dev-only `window.__dbg` helpers (warp floors, start fights); never bundled in production |

Everything renders to a 384×216 canvas scaled up with nearest-neighbour filtering. There are no image or audio assets: every sprite, tile, monster and song is drawn or composed in code.
