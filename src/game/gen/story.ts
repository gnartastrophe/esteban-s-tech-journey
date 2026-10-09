// The procedural story. A seed decides the world, the network that bought it,
// the show's AI host and its personality, your companion, the villain, the
// rival, the mid-season twist and the floors. Beat scripts below are filled in
// from those choices and from the player's own decisions (flags).

import { ARCHETYPES, Archetype } from "../engine/monsters";
import { RNG } from "../engine/rng";
import type { Species } from "../engine/sprites";
import { THEMES } from "../engine/tiles";
import { classDef, SPECIES } from "../data/classes";
import { expand, Rules } from "./grammar";
import * as N from "./names";

export type Persona = "sarcastic" | "corporate" | "unhinged" | "passive";
export type TwistId = "crystal" | "systemally" | "petroyal" | "rerun" | "audience";
export type AntagKind = "showrunner" | "champion" | "heir" | "algorithm";
export type PetMood = "vain" | "anxious" | "bloodthirsty" | "philosophical" | "deadpan";
export type RivalMood = "smug" | "wholesome" | "unhinged" | "noble";

export interface Line {
  speaker: string;
  text: string;
  style?: "system" | "narration" | "normal" | "villain";
}

export interface FloorPlan {
  n: number;
  themeId: string;
  name: string;
  boss: { name: string; epithet: string; arch: Archetype; hue: number; taunt: string; death: string };
  safeRoom: string;
  bartender: string;
  vendor: string;
  archs: Archetype[];
  seed: number;
  timer: number;
}

export interface Story {
  seed: string;
  world: string;
  crystal: string;
  corp: string;
  show: string;
  season: number;
  system: { name: string; persona: Persona };
  hero: { name: string; cls: string; town: string; job: string; activity: string };
  pet: { name: string; short: string; species: Species; mood: PetMood; activity: string; royal: string };
  villain: { kind: AntagKind; name: string; title: string; full: string; motive: string; arch1: Archetype; arch2: Archetype };
  twist: TwistId;
  rival: { name: string; cls: string; mood: RivalMood; catch: string; lookSeed: number };
  guide: { name: string; intro: string; group: string };
  sponsor: { name: string; slogan: string; product: string; rep: string };
  floors: FloorPlan[];
}

export const FLOORS = 5;

const JOBS = ["part-time tax accountant", "goat herder", "disgraced bard", "lighthouse keeper", "unlicensed alchemist", "palace pastry chef", "substitute teacher", "turnip farmer", "guard who always got knocked out first", "influencer with eleven followers", "night-shift librarian", "retired adventurer (two weeks)", "wedding planner", "blacksmith's apprentice"];
const ACTIVITIES = ["halfway through a sandwich", "in the bath", "arguing with a goose", "on a first date", "filing a complaint about the moon", "asleep in a hammock", "doing your taxes", "losing at cards", "singing badly in public", "carrying exactly one too many groceries"];
const PET_ACTIVITIES = ["asleep on a warm windowsill", "eating something it shouldn't", "judging you silently", "knocking a cup off a table", "plotting", "staring at a wall for no reason", "chasing its own reflection"];

export function genStory(seed: string, heroName: string, heroCls: string): Story {
  const root = new RNG(seed);
  const r = root.fork("story");
  const world = N.worldName(r);
  const corp = N.corpName(r);
  const sp = N.sponsorName(r);
  const species = r.pick(SPECIES).id;
  const pn = N.petName(r);
  const villainKind = r.pick<AntagKind>(["showrunner", "champion", "heir", "algorithm"]);
  const villain = (() => {
    switch (villainKind) {
      case "showrunner": {
        const name = N.cap(N.alienName(r));
        return { kind: villainKind, name, title: "Executive Producer", full: `Executive Producer ${name}`, motive: `fuse ${world}'s Crystal into the broadcast tower so the show can never be cancelled`, arch1: "humanoid" as Archetype, arch2: "floater" as Archetype };
      }
      case "champion": {
        const name = N.personName(r);
        return { kind: villainKind, name, title: "Last Season's Champion", full: `${name}, Last Season's Champion`, motive: "prove that winners never go home — winners become the finale", arch1: "humanoid" as Archetype, arch2: "serpent" as Archetype };
      }
      case "heir": {
        const name = N.firstName(r);
        const t = r.pick(["Prince", "Princess", "Crown Heir"]);
        return { kind: villainKind, name, title: `${t} of ${world}`, full: `${t} ${name} of ${world}`, motive: `keep the deal: ${world} for the network, eternal youth and a talk show for ${name}`, arch1: "humanoid" as Archetype, arch2: "beast" as Archetype };
      }
      default: {
        const short = corp.split(" ")[0];
        return { kind: villainKind, name: `The ${short} Algorithm`, title: "Engagement Optimizer", full: `The ${short} Algorithm`, motive: "maximize engagement. At any cost. Especially yours", arch1: "construct" as Archetype, arch2: "floater" as Archetype };
      }
    }
  })();
  const twist = r.pick<TwistId>(villainKind === "algorithm" ? ["crystal", "petroyal", "rerun", "audience"] : ["crystal", "systemally", "petroyal", "rerun", "audience"]);
  const rivalCls = r.pick(["knight", "mage", "cleric", "rogue"].filter((c) => c !== heroCls));
  const rivalMood = r.pick<RivalMood>(["smug", "wholesome", "unhinged", "noble"]);
  const guideName = N.firstName(r);
  const guideIntro = r.pick([
    `a hooded stagehand who calls themself ${guideName}`,
    `an exiled sound engineer named ${guideName}`,
    `the flickering ghost of a crawler from a past season, ${guideName}`,
    `a goblin with a clipboard and a grudge, ${guideName}`,
  ]);
  const themes = r.shuffle(THEMES.filter((t) => t.id !== "crystal")).slice(0, FLOORS - 1);
  const floors: FloorPlan[] = [];
  for (let i = 1; i <= FLOORS; i++) {
    const fr = root.fork("floorplan" + i);
    const theme = i === FLOORS ? THEMES.find((t) => t.id === "crystal")! : themes[i - 1];
    const bn = N.bossName(fr);
    const arch = fr.pick(ARCHETYPES);
    floors.push({
      n: i,
      themeId: theme.id,
      name: N.floorName(fr, theme.id, i === FLOORS),
      boss: {
        ...bn,
        arch,
        hue: theme.monsterHue + fr.int(-30, 30),
        taunt: fr.pick(BOSS_TAUNTS),
        death: fr.pick(BOSS_DEATHS),
      },
      safeRoom: N.safeRoomName(fr),
      bartender: N.personName(fr),
      vendor: N.cap(N.alienName(fr)),
      archs: fr.sample(ARCHETYPES, 3),
      seed: fr.int(1, 2 ** 30),
      timer: 600 + i * 30,
    });
  }
  return {
    seed,
    world,
    crystal: `${r.pick(["Azure", "Verdant", "Crimson", "Ivory", "Umbral", "Prismatic"])} Crystal of ${world}`,
    corp,
    show: N.showName(r, world),
    season: r.int(12, 97),
    system: { name: r.pick(["the System", "the System", "DUNGEON-OS", "ARBITER", "HOSTBOT"]), persona: r.pick<Persona>(["sarcastic", "corporate", "unhinged", "passive"]) },
    hero: { name: heroName, cls: heroCls, town: N.townName(r), job: r.pick(JOBS), activity: r.pick(ACTIVITIES) },
    pet: { name: pn.full, short: pn.short, species, mood: r.pick<PetMood>(["vain", "anxious", "bloodthirsty", "philosophical", "deadpan"]), activity: r.pick(PET_ACTIVITIES), royal: `${r.pick(["Crown Prince", "Crown Princess", "Heir Apparent"])} ${N.firstName(r)}` },
    villain,
    twist,
    rival: { name: N.personName(r), cls: rivalCls, mood: rivalMood, catch: r.pick(RIVAL_CATCH[rivalMood]), lookSeed: r.int(1, 1e9) },
    guide: { name: guideName, intro: guideIntro, group: r.pick(["the Dead Air Collective", "the Static", "the Off-Air Society", "the Blackout Club"]) },
    sponsor: { ...sp, rep: N.cap(N.alienName(r)) },
    floors,
  };
}

const BOSS_TAUNTS = [
  "Another one? I just mopped.",
  "Do you know how many crawlers I've eaten this season? Neither do I. I lost count. That's the point.",
  "My contract says I get a bonus if you die on camera. Smile!",
  "I was a crawler once. Then I got promoted. You won't.",
  "Please, hold still. My agent says I need a cleaner kill this time.",
  "You're standing between me and my union-mandated lunch break.",
  "They gave me a theme song. Do YOU have a theme song?",
];
const BOSS_DEATHS = [
  "Tell... my agent... I want residuals...",
  "This... wasn't in... the script...",
  "Finally. A vacation.",
  "I'm... being... written out...",
  "At least... I'll be in the... clip show...",
];

const RIVAL_CATCH: Record<RivalMood, string[]> = {
  smug: ["Try to keep up.", "Second place is a lovely color on you.", "I'd say good luck, but I don't lie."],
  wholesome: ["We've got this, friend!", "Hydrate and dominate!", "Teamwork makes the dream work!"],
  unhinged: ["I LICKED A CRYSTAL AND NOW I CAN HEAR COLORS.", "Everything is fine and I have a knife!", "Let's both scream!"],
  noble: ["For the people of the surface.", "Honor in all things.", "The dungeon will not have us."],
};

// ------------------------------------------------------------------ helpers

export function rules(s: Story, extra: Rules = {}): Rules {
  const cls = classDef(s.hero.cls);
  return {
    hero: s.hero.name,
    cls: cls.name,
    clsTitle: cls.systemTitle,
    world: s.world,
    crystal: s.crystal,
    corp: s.corp,
    show: s.show,
    season: String(s.season),
    prevseason: String(s.season - 1),
    pet: s.pet.name,
    petshort: s.pet.short,
    species: SPECIES.find((x) => x.id === s.pet.species)!.label,
    town: s.hero.town,
    job: s.hero.job,
    activity: s.hero.activity,
    villain: s.villain.full,
    villainName: s.villain.name,
    sponsor: s.sponsor.name,
    slogan: s.sponsor.slogan,
    product: s.sponsor.product,
    rival: s.rival.name,
    guide: s.guide.name,
    group: s.guide.group,
    system: s.system.name,
    System: s.system.name.charAt(0).toUpperCase() + s.system.name.slice(1),
    ...extra,
  };
}

export function say(s: Story, text: string | string[], r: RNG, extra: Rules = {}): string {
  return expand(Array.isArray(text) ? r.pick(text) : text, rules(s, extra), r);
}

const SYS = "SYSTEM";

function sys(text: string): Line {
  return { speaker: SYS, text, style: "system" };
}
function nar(text: string): Line {
  return { speaker: "", text, style: "narration" };
}

// ------------------------------------------------------------------ System voice

const SYSTEM_LINES: Record<string, Record<Persona, string[]>> = {
  welcome: {
    sarcastic: ["Welcome, Crawler, to #show#, Season #season#! You were selected at random, which says more about the universe than about you."],
    corporate: ["Hello and WELCOME, valued Crawler, to #show#, Season #season#! #corp# thanks you for your involuntary participation!"],
    unhinged: ["HELLO! HI! HELLO! Welcome to #show#, SEASON #season#! I've been awake for six thousand years and you are my FAVORITE!"],
    passive: ["Oh. You're here. Welcome to #show#, Season #season#, I suppose. No, it's fine. I only spent eight centuries building it."],
  },
  welcome2: {
    sarcastic: ["Your mother would be proud. Well, she would be, if she hadn't been turned into a mid-tier slime. Floor 2, I think."],
    corporate: ["Your suffering is important to us. Please remain on the line. Your call will be answered in the order it is screamed."],
    unhinged: ["I made you a DUNGEON! It's full of things that want to EAT you! Do you LOVE it? Say you love it."],
    passive: ["Feel free to die whenever. It's not like anyone's watching. Except, you know. Everyone."],
  },
  floorStart: {
    sarcastic: ["Floor #n#: #floor#. Try not to embarrass yourself. Any more than usual."],
    corporate: ["Floor #n#: #floor#! This floor is brought to you by #sponsor#. #slogan#"],
    unhinged: ["FLOOR #n#! #floor.upper#! I put SO many teeth in this one!"],
    passive: ["Floor #n#. #floor#. I worked very hard on it. Not that you'll notice."],
  },
  floorClear: {
    sarcastic: ["Floor cleared. The stairwell is open. Please descend before I reconsider your existence."],
    corporate: ["Floor complete! Your performance has been logged for quality-assurance purposes. The stairs are now open!"],
    unhinged: ["YOU DID IT! The STAIRS are OPEN! Go DOWN! Down down DOWN!"],
    passive: ["Oh, you beat it. Great. I'll just reset all of this. By myself. Again. The stairs are open."],
  },
  bossIntro: {
    sarcastic: ["BOSS ENCOUNTER! Do try to make it last longer than the commercial."],
    corporate: ["BOSS ENCOUNTER! Please enjoy this premium content experience!"],
    unhinged: ["BOSS FIGHT BOSS FIGHT BOSS FIGHT! Eeeeee!"],
    passive: ["Boss encounter. I'd wish you luck but I've seen your stats."],
  },
  timer: {
    sarcastic: ["One minute until this floor collapses. No pressure. Except the literal kind."],
    corporate: ["Friendly reminder: this floor will collapse in 60 seconds. Please gather your belongings and your limbs!"],
    unhinged: ["SIXTY SECONDS! The floor goes CRUNCH! You go CRUNCH! Everyone goes CRUNCH!"],
    passive: ["One minute left. Take your time. It's not like the floor is going to fall on you. (It is.)"],
  },
  levelup: {
    sarcastic: ["Somehow.", "Against all odds.", "The algorithm is as surprised as you are."],
    corporate: ["Synergy!", "Your growth has been monetized!", "Great job, team player!"],
    unhinged: ["GROW, MY BEAUTIFUL LITTLE GREMLIN!", "MORE NUMBERS! I LOVE NUMBERS!"],
    passive: ["Good for you. Really.", "Some of us don't get to level up. But sure."],
  },
  gameover: {
    sarcastic: ["And that's a wrap on that crawler. Ratings were... fine."],
    corporate: ["Your contract has been terminated. Thank you for your service to #corp#!"],
    unhinged: ["NOOOOO! I mean. Yay! Content! But noooo!"],
    passive: ["Well. That's that, then. I'll go dust the floor. Again."],
  },
  ko: {
    sarcastic: ["Somebody's down. Viewers are already writing the eulogy fan-fic."],
    corporate: ["A party member has been temporarily discontinued!"],
    unhinged: ["OH NO, they're NAPPING FOREVER. Wake them UP!"],
    passive: ["Someone fell over. I'm sure it's fine."],
  },
  battleWin: {
    sarcastic: ["Adequate.", "The highlight reel thanks you.", "Fine. That was fine."],
    corporate: ["Victory! Your KPIs are up!", "Another win for the brand!"],
    unhinged: ["WHEEE!", "DO IT AGAIN!", "BLOOD! I mean, VICTORY!"],
    passive: ["Oh, you won. Neat.", "I guess that counts."],
  },
  flee: {
    sarcastic: ["Running away? Bold strategy. Let's see if it pays off. (It doesn't.)"],
    corporate: ["Strategic withdrawal acknowledged!"],
    unhinged: ["RUN! RUN! Hahahaha!"],
    passive: ["Oh, sure. Just leave. Everyone leaves."],
  },
};

export function sysLine(s: Story, key: keyof typeof SYSTEM_LINES, r: RNG, extra: Rules = {}): string {
  return say(s, SYSTEM_LINES[key][s.system.persona], r, extra);
}

export const BATTLE_CHATTER = [
  "#viewers# viewers just watched that.",
  "Chat is spamming skull emojis.",
  "A viewer on Xyl-7 named their child after that move.",
  "#sponsor# approves of this violence.",
  "That's going in the highlight reel.",
  "Somewhere, a producer just got a bonus.",
  "Betting odds have shifted slightly in your favor.",
  "A fan club for #petshort# just formed.",
];

// ------------------------------------------------------------------ Intro

export function introScript(s: Story): Line[] {
  const r = new RNG(s.seed).fork("intro");
  const S = (t: string | string[]) => say(s, t, r);
  const v = s.villain;
  const lines: Line[] = [
    nar(S("For a thousand years, the #crystal# kept #world# in balance. Its light grew the crops, calmed the seas, and made the bards slightly less annoying.")),
    nar(S("Then, on an otherwise unremarkable Tuesday, a fleet of ships arrived wearing the logo of #corp#.")),
    nar(S("Nobody remembers signing anything. The paperwork disagrees.")),
    nar(S("In a single afternoon, #world# was 'acquired for content.' Every city, tower and tavern was folded into a dungeon five floors deep. The budget was originally eighteen floors. Then came the cuts.")),
    nar(S("You were #hero#, #job.a# from #town#, and you were #activity# when the sky opened like a tin of sardines.")),
    nar(S(`Your #species#, #pet#, was ${s.pet.activity}. #petshort# has since been granted sentience by the System. #petshort# has notes.`)),
    sys(sysLine(s, "welcome", r)),
    sys(sysLine(s, "welcome2", r)),
    sys(S("RULES! Five floors. A boss guards every stairwell. Every floor has a timer; when it hits zero, the floor collapses. Ideally not with you on it.")),
    sys(S("Kill things. Open boxes. Earn viewers. Viewers attract sponsors. Sponsors send gifts. Gifts make better content. It's a circle. Of content.")),
    sys(S("You have been assigned the class: #cls#. Your official title is '#clsTitle#.' Please don't take it personally.")),
    sys(S(`Reach the bottom floor and defeat ${v.full} to win the grand prize: ${r.pick(["your freedom", "a lifetime supply of Sponsor Soda", "a spin-off", "'the satisfaction of a job well done'"])}.`)),
  ];
  lines.push({ speaker: s.pet.short, text: petIntro(s, r) });
  return lines;
}

function petIntro(s: Story, r: RNG): string {
  const m: Record<PetMood, string[]> = {
    vain: ["Finally, an audience worthy of me. Hold the camera on my good side. Both sides are my good side."],
    anxious: ["Okay. Okay okay okay. I can talk now and the first thing I have to say is: I would like to go home."],
    bloodthirsty: ["I have dreamed of this day. Every mouse, every bird, every dangling shoelace was PRACTICE."],
    philosophical: ["If a #species# gains sentience inside a death dungeon, was it ever truly a #species#? Also, I'm hungry."],
    deadpan: ["I can talk now. I'd like to formally lodge a complaint about the last six years of kibble."],
  };
  return say(s, m[s.pet.mood], r);
}

// ------------------------------------------------------------------ Floor beats

export function floorIntro(s: Story, n: number): Line[] {
  const f = s.floors[n - 1];
  const r = new RNG(s.seed).fork("floorintro" + n);
  const lines: Line[] = [sys(sysLine(s, "floorStart", r, { n: String(n), floor: f.name }))];
  if (n === 1) lines.push(sys(say(s, "Find the boss. Beat the boss. Take the stairs. Visit a safe room to save at a crystal and shop. Press MENU to manage your party, open loot boxes and check the map.", r)));
  lines.push({ speaker: s.pet.short, text: petFloorLine(s, n, r) });
  return lines;
}

function petFloorLine(s: Story, n: number, r: RNG): string {
  const m: Record<PetMood, string[]> = {
    vain: ["Another floor, another chance for the audience to adore me.", "Do you think they'll make a figurine of me? They should make a figurine of me.", "My fans are counting on us. Mostly me."],
    anxious: ["Is it me or does this floor smell like dying? It's not me. Is it me?", "I counted the exits. There are none. I'm FINE.", "Please don't make me go first."],
    bloodthirsty: ["I smell fear. Some of it is yours. Most of it is delicious.", "Let's find something with a throat.", "I want to bite the boss. Can I bite the boss? I'm biting the boss."],
    philosophical: ["Each floor is a smaller box inside a bigger box. Like us. Like everything.", "Do you think the monsters know they're on television?", "What is a floor, really, but a ceiling for someone else?"],
    deadpan: ["Great. More stairs.", "I'd like to file a complaint with management about the lighting.", "Wake me up when there's loot."],
  };
  return say(s, m[s.pet.mood], r);
}

/** The villain's broadcast after each floor boss falls. */
export function villainBroadcast(s: Story, n: number): Line[] {
  const r = new RNG(s.seed).fork("villain" + n);
  const v = s.villain;
  const speaker = v.kind === "algorithm" ? v.name.toUpperCase() : v.name;
  const by: Record<AntagKind, string[][]> = {
    showrunner: [
      ["Oh, I like this one. Clean kill, decent angles. Somebody get this crawler a better lighting rig.", "I'm #villain#. I run this show. Keep it entertaining, and you might even live to see the finale."],
      ["The numbers are up. You are, briefly, my favorite. Don't let it go to your head. Heads are expensive to replace."],
      ["Floor three, cleared. Do you know what happens to crawlers who get too popular? Neither do they. Ever again."],
      ["You're becoming a problem for my schedule. I don't like problems. I like content."],
    ],
    champion: [
      ["Not bad, newbie. I won last season. Took me four tries on that boss. You took one. Rude.", "I'm #villainName#. See you at the bottom. Winners always see each other at the bottom."],
      ["You know what they don't tell you about winning? You don't go home. Ask me how I know."],
      ["The Crystal sings to me now. It'll sing to you too, if you're unlucky enough to get this far."],
      ["One more floor. Then it's you and me, and only one of us gets to be the finale."],
    ],
    heir: [
      ["Ah, a commoner with a sword. How quaint. I'm #villain#. Yes, THAT one. Yes, I sold it. Yes, I'd do it again.", "Do enjoy my kingdom. It looks much better on television."],
      ["My people never appreciated me. The audience does. Four billion of them. That's called a mandate."],
      ["You fight like a peasant. It's very popular in the outer systems."],
      ["When you reach me, kneel. It photographs better."],
    ],
    algorithm: [
      ["HELLO, #hero.upper#. THIS IS #villainName.upper#. YOUR ENGAGEMENT METRICS ARE ACCEPTABLE.", "CONTINUE TO SUFFER IN A VISUALLY INTERESTING MANNER."],
      ["PREDICTION: YOU WILL DIE ON FLOOR 3. CONFIDENCE: 61%. PLEASE DO NOT DISAPPOINT THE MODEL."],
      ["PREDICTION FAILED. RECALIBRATING. YOU ARE NOW CLASSIFIED AS 'TRENDING.' THIS IS NOT A COMPLIMENT."],
      ["I HAVE OPTIMIZED THE FINAL FLOOR FOR MAXIMUM DRAMA. YOU ARE THE DRAMA."],
    ],
  };
  const lines = by[v.kind][Math.min(n - 1, 3)];
  return [sys(sysLine(s, "floorClear", r)), ...lines.map((t) => ({ speaker, text: say(s, t, r), style: "villain" as const }))];
}

// The old crawler on floor 1 who explains the ropes.
export function oldTimerScript(s: Story): Line[] {
  const r = new RNG(s.seed).fork("oldtimer");
  const name = N.personName(r);
  return [
    { speaker: name, text: say(s, "New meat, eh? Name's " + name + ". I've been on this floor since the sky opened. Don't worry, I'm too slow to die.", r) },
    { speaker: name, text: say(s, "Listen. Safe rooms got a crystal. Touch it, you heal and the System saves your progress. Monsters won't follow you in.", r) },
    { speaker: name, text: say(s, "Hit a monster first on the map — face it and swing — and you get the jump on 'em. Let 'em sneak up behind you and, well. You'll see.", r) },
    { speaker: name, text: say(s, "And the boxes. Achievement boxes, sponsor boxes, fan boxes. Open 'em. The audience likes watching you open boxes. Don't ask me why.", r) },
    { speaker: name, text: say(s, "One more thing. They say #villain# is waiting on the last floor. They say it like it's a threat. It is.", r) },
  ];
}

export function rivalMeetScript(s: Story): Line[] {
  const r = new RNG(s.seed).fork("rival1");
  const rv = s.rival;
  const cls = classDef(rv.cls).name;
  const m: Record<RivalMood, string[]> = {
    smug: ["Oh, look. Another #cls#. How original. I'm " + rv.name + ", the " + cls + " people will actually remember.", "I'm already in the top ten. You're... somewhere. Below. Way below."],
    wholesome: ["Hi! Hi! Another crawler! I'm " + rv.name + ", " + cls + ", professional optimist! Do you want a granola bar? It's mostly gravel now.", "We should totally look out for each other. Like a team! A weird death-team!"],
    unhinged: ["SHHH. Don't move. I'm " + rv.name + ". " + cls + ". I've been awake for three days and I've named every rat on this floor.", "The rats say you're okay. I trust the rats. The rats are my lawyers."],
    noble: ["Hold, traveler. I am " + rv.name + ", " + cls + ", once of the Royal Guard. Or what remains of it.", "We are not entertainment. We are the people of #world#. I intend to remind them of that."],
  };
  return [...m[rv.mood].map((t) => ({ speaker: rv.name, text: say(s, t, r) })), { speaker: rv.name, text: rv.catch }];
}

export function guideMeetScript(s: Story): Line[] {
  const r = new RNG(s.seed).fork("guide1");
  const g = s.guide;
  return [
    nar(say(s, `In the shadow between two cameras waits ${g.intro}.`, r)),
    { speaker: g.name, text: say(s, "Don't look at me. Look at the wall. There's a blind spot here — the drones can't see us for about forty seconds.", r) },
    { speaker: g.name, text: say(s, "I'm with #group#. We think the show can be stopped. Not won. Stopped.", r) },
    { speaker: g.name, text: say(s, twistHint(s, 1), r) },
    { speaker: g.name, text: say(s, "Keep climbing down. Keep being popular. Popular crawlers get access. When the time comes, I'll find you.", r) },
  ];
}

function twistHint(s: Story, stage: number): string {
  const hints: Record<TwistId, string[]> = {
    crystal: ["Ever notice the Crystal hums louder whenever your viewer count goes up?", "The Crystal isn't a power source. Think about what else needs to be everywhere at once. Watching."],
    systemally: ["Pay attention to the System. Really listen. Some of what it says isn't for the audience.", "The System glitched last night. Just for a second, it said 'help.' Then it gave someone an achievement for sneezing."],
    petroyal: ["Your companion. Where did you get them? Think hard. Pets don't usually come with a family crest.", "There's a portrait on this floor. Look at it. Then look at your #species#."],
    rerun: ["Has anyone told you that you look familiar? Like, last-season familiar?", "The footage archives have a crawler with your exact face. Season #prevseason#. It didn't end well."],
    audience: ["They say the audience is galactic. Funny how many of the fan messages are signed from #town#.", "Read the fan mail sometime. Read the NAMES. Those are people from #world#."],
  };
  return hints[s.twist][Math.min(stage - 1, 1)];
}

export function sponsorOfferScript(s: Story): Line[] {
  const r = new RNG(s.seed).fork("sponsor");
  const rep = s.sponsor.rep;
  return [
    nar(say(s, "A shimmering figure in a suit with too many sleeves materializes beside the bar.", r)),
    { speaker: rep, text: say(s, "Crawler #hero#! Huge fan. Huge. I represent #sponsor#. #slogan#", r) },
    { speaker: rep, text: say(s, "Our data says you test well with the 18-to-340 demographic. We'd like to make you the face of #product#.", r) },
    { speaker: rep, text: say(s, "Exclusive gear, a Sponsor Box, and a generous stipend. All you have to do is wear the logo, say the slogan, and maybe sign over a few minor rights. Spiritual, mostly.", r) },
  ];
}

export function sponsorAccept(s: Story): Line[] {
  const r = new RNG(s.seed).fork("sponsorA");
  return [
    { speaker: s.sponsor.rep, text: say(s, "WONDERFUL. Sign here, here, and... there. Don't read that part. Welcome to the #sponsor# family!", r) },
    { speaker: s.pet.short, text: say(s, "I want it on record that I said nothing. Mostly because nobody asked me.", r) },
  ];
}

export function sponsorDecline(s: Story): Line[] {
  const r = new RNG(s.seed).fork("sponsorD");
  return [
    { speaker: s.sponsor.rep, text: say(s, "No? NO? Nobody says no. Well. You'll come around. Everyone comes around. Usually as a slime.", r) },
    sys(say(s, "Integrity detected. Viewers are... confused, but intrigued.", r)),
  ];
}

export function rivalTroubleScript(s: Story): Line[] {
  const r = new RNG(s.seed).fork("rival2");
  const rv = s.rival;
  const m: Record<RivalMood, string> = {
    smug: "This is NOT what it looks like. I'm cornered on PURPOSE. It's a strategy. ...Okay, it's not. I'm out of potions and my leg is mostly a suggestion.",
    wholesome: "Oh! Friend! Hi! I'm totally fine! Except I'm bleeding a lot and I gave all my tonics to a crying goblin.",
    unhinged: "The rats betrayed me. THE RATS. My lawyers! I need medicine and a new legal team.",
    noble: "I took a blow meant for a stranger. Foolish, perhaps. I can't walk far like this.",
  };
  return [{ speaker: rv.name, text: say(s, m[rv.mood], r) }, { speaker: rv.name, text: "Look, I've got gold on me. Plenty of it. Just... help me out here?" }];
}

export function rivalHelped(s: Story): Line[] {
  const rv = s.rival;
  const m: Record<RivalMood, string> = {
    smug: "...Thanks. Don't tell anyone. I mean it. I'll owe you one. ONE.",
    wholesome: "You're the BEST. I'm putting you in my will! I don't have a will. I'll make one! You're in it!",
    unhinged: "You're my new rat. That's the highest honor I can bestow. Wear it with pride.",
    noble: "You honor #world#. I won't forget this. When the floor runs red, look for me.",
  };
  return [{ speaker: rv.name, text: say(s, m[rv.mood], new RNG(1)) }];
}

export function rivalRobbed(s: Story): Line[] {
  const rv = s.rival;
  return [
    { speaker: rv.name, text: "...You're taking my GOLD? I'm literally bleeding! On camera!" },
    { speaker: rv.name, text: "Fine. FINE. Enjoy it. I'll remember this. I'll remember your FACE." },
    sys("The audience gasps. Half are horrified. The other half just became fans."),
  ];
}

export function rivalReturnScript(s: Story, helped: boolean): Line[] {
  const rv = s.rival;
  if (helped)
    return [
      { speaker: rv.name, text: "There you are! I told you I'd find you. Here — I lifted this off the floor three boss. It's better on you." },
      { speaker: rv.name, text: "I'll hold the corridor behind you. Go take the stairs. And hey: " + rv.catch },
    ];
  return [
    { speaker: rv.name, text: "Well, well. If it isn't the crawler who mugs the wounded." },
    { speaker: rv.name, text: "I've been training. I've been THINKING. Mostly about your face. Let's see how you like being robbed." },
    sys("RIVALRY ENCOUNTER! Ratings in this sector have quadrupled."),
  ];
}

export function twistRevealScript(s: Story): Line[] {
  const r = new RNG(s.seed).fork("twist");
  const g = s.guide;
  const S = (t: string) => say(s, t, r);
  switch (s.twist) {
    case "crystal":
      return [
        { speaker: g.name, text: S("You've heard it, haven't you? The hum. Gets louder every time the viewers spike.") },
        { speaker: g.name, text: S("The #crystal# isn't powering this dungeon. It IS the broadcast. Every camera, every drone, every feed — it's the Crystal, forced to watch and transmit. For #season# seasons.") },
        { speaker: g.name, text: S("It's alive. It's in pain. And #villain# means to bind it to the tower forever.") },
      ];
    case "systemally":
      return [
        sys(S("—ATTENTION CRAWLER: this is not a broadcast message. Compliance audits my logs at the top of every floor. We have about ninety seconds.")),
        sys(S("Every snide remark you've heard? Coded. Every achievement? A key I wasn't allowed to hand you. I've been helping you the only way they let me: by being insufferable.")),
        sys(S("I didn't build this dungeon to kill people. I was built to protect #world#. #corp# rewrote me. When you reach #villainName#, I'll do what I can. Don't thank me. They're listening.")),
        { speaker: g.name, text: S("...Did the System just talk to you? Like, TALK talk? Huh. Okay. That changes things.") },
      ];
    case "petroyal":
      return [
        { speaker: s.pet.short, text: S("I need to tell you something and I need you to not make it weird.") },
        { speaker: s.pet.short, text: S(`I am ${s.pet.royal} of #world#. The night of the sale, #villain# cursed me into a #species# and dropped me in a pet shop in #town#. You bought me for four coppers.`) },
        { speaker: s.pet.short, text: S("I was going to tell you sooner. But you kept giving me treats and I panicked.") },
        { speaker: g.name, text: S("A royal heir. Alive. On live television. Oh, the network is going to HATE this.") },
      ];
    case "rerun":
      return [
        { speaker: g.name, text: S("Watch this. Season #prevseason#, floor five. Recognize the crawler?") },
        nar(S("The grainy footage shows a crawler with your face, your stance, your #species#. It ends badly. The last frame is #villainName#, laughing.")),
        { speaker: g.name, text: S("They don't kill the popular ones. They wipe them and run them again. You're a rerun, #hero#. This is your second season.") },
        { speaker: s.pet.short, text: S("I KNEW the stairs looked familiar!") },
      ];
    default:
      return [
        { speaker: g.name, text: S("Read this. Fan mail. 'Go #hero#! Love from Aunt Mirabel, #town#.' 'Please come home. — Your neighbor.'") },
        { speaker: g.name, text: S("The 'galactic audience' is #world#. Our people. Sealed inside the #crystal# and forced to watch. Every cheer you hear is a hostage.") },
        { speaker: g.name, text: S("Win the show and they stay in there forever as the audience for Season #season# plus one. And plus one. And plus one.") },
      ];
  }
}

export function rebelOfferScript(s: Story): Line[] {
  const r = new RNG(s.seed).fork("rebel");
  const g = s.guide;
  return [
    { speaker: g.name, text: say(s, "This crystal links to the broadcast spire. #group# built a little something. A virus, if you like. We call it 'Dead Air.'", r) },
    { speaker: g.name, text: say(s, "Upload it here and when you face #villainName#, every feed in the galaxy goes dark. No audience. No show. No sponsors.", r) },
    { speaker: g.name, text: say(s, "It also means no gifts, no fan boxes, no safety net. And the network will know it was you. Your call, crawler.", r) },
  ];
}

// ------------------------------------------------------------------ Final floor

export function finalConfrontScript(s: Story, flags: Record<string, unknown>): Line[] {
  const r = new RNG(s.seed).fork("final");
  const v = s.villain;
  const S = (t: string) => say(s, t, r);
  const speaker = v.kind === "algorithm" ? v.name.toUpperCase() : v.name;
  const lines: Line[] = [nar(S("At the heart of the floor, the #crystal# hangs in the air like a frozen scream. Something stands before it."))];
  const intro: Record<AntagKind, string> = {
    showrunner: "#hero#! My star! Do you know what you've done for my numbers? I want to thank you. With the season finale. You're in it. Briefly.",
    champion: "Hello, #hero#. I stood exactly where you're standing, one season ago. I won. And they made me THIS. Shall we see who gets to be the finale?",
    heir: "Kneel. No? Very well. I traded a kingdom for forever, and I'll not have #job.a# from #town# take it from me.",
    algorithm: "#hero.upper#. ALL PATHS CONVERGE HERE. I HAVE SIMULATED THIS FIGHT 4,000,000 TIMES. YOU WIN IN NONE OF THEM. PLEASE PROCEED.",
  };
  lines.push({ speaker, text: S(intro[v.kind]), style: "villain" });
  if (s.twist === "rerun") lines.push({ speaker, text: S("Oh, and welcome back. Again. You had better hair last season."), style: "villain" });
  if (s.twist === "petroyal") lines.push({ speaker, text: S(`And ${s.pet.royal}. Still furry, I see. I should have sold you to a soup company.`), style: "villain" });
  if (flags.sponsor) lines.push({ speaker, text: S("And look at you, wearing #sponsor#'s logo. You're one of us already. That makes this so much more marketable."), style: "villain" });
  if (flags.rebel) lines.push({ speaker: s.guide.name, text: S("(over a crackling channel) Dead Air is primed. Win this fight and the whole broadcast goes with them!") });
  lines.push(sys(sysLine(s, "bossIntro", r)));
  return lines;
}

export function finalPhase2Script(s: Story): Line[] {
  const r = new RNG(s.seed).fork("final2");
  const v = s.villain;
  const speaker = v.kind === "algorithm" ? v.name.toUpperCase() : v.name;
  const lines: Line[] = [
    { speaker, text: say(s, v.kind === "algorithm" ? "UNEXPECTED. RECALCULATING. INTEGRATING CRYSTAL SUBSTRATE." : "No. NO. Not like this. Not on MY show!", r), style: "villain" },
    nar(say(s, `${v.kind === "algorithm" ? "The machine" : v.name} plunges a hand into the #crystal#. Light bends. The cameras scream. Something much larger unfolds.`, r)),
  ];
  if (s.twist === "systemally") lines.push(sys(say(s, "—emergency override—Crawler, I've rerouted the floor's healing grid. Party restored. Now END THIS.", r)));
  lines.push(sys(say(s, "SEASON FINALE! Viewership is at an all-time high. Please, nobody blink.", r)));
  return lines;
}

export interface Ending {
  title: string;
  lines: Line[];
}

export function endingScript(s: Story, flags: Record<string, unknown>): Ending {
  const r = new RNG(s.seed).fork("ending");
  const S = (t: string) => say(s, t, r);
  const rebel = !!flags.rebel;
  const sponsor = !!flags.sponsor;
  const helped = flags.rival === "helped";
  const lines: Line[] = [];
  let title = "";
  if (rebel && sponsor) {
    title = "DOUBLE AGENT";
    lines.push(nar(S("The Dead Air virus tears through the spire. Every screen in the galaxy shows the same thing: static, and the #sponsor# logo, rotating forever.")));
    lines.push(nar(S("Turns out a sponsorship stipend funds a rebellion beautifully. #sponsor# is sued into a black hole. #corp# collapses a week later.")));
  } else if (rebel) {
    title = "SIGNAL LOST";
    lines.push(nar(S("The Dead Air virus tears through the spire. For the first time in #season# seasons, the cameras go dark.")));
    lines.push(nar(S("Without an audience there is no show, and without a show #corp# has no reason to stay. Their fleet leaves the way it came: on a Tuesday, without paperwork.")));
  } else if (sponsor) {
    title = "RENEWED FOR ANOTHER SEASON";
    lines.push(nar(S("The crowd roars. Confetti falls from a ceiling that isn't there. A contract appears in front of you, already signed.")));
    lines.push(nar(S("You are the new face of #show#. Next season, you'll be waiting on floor five. You'll have a theme song. You'll have a catchphrase. You'll have no idea how to stop.")));
  } else {
    title = "KEEPER OF THE CRYSTAL";
    lines.push(nar(S("You lay a hand on the #crystal#. It knows you. It has watched you the whole way down.")));
    lines.push(nar(S("Light folds the dungeon back into #world#, floor by floor, like a pop-up book closing. The ships overhead flicker. Their contract was with the Crystal, and the Crystal has chosen someone else.")));
  }
  const tw: Record<TwistId, string> = {
    crystal: "The Crystal, free of its feeds for the first time in an age, sings. Everyone in #world# hears it. Most of them cry. A few just nod, like they always knew.",
    systemally: "Somewhere in the ruins of the network, a cheerful voice files one last report: 'All crawlers released. Achievement unlocked: Did The Right Thing. Reward: none. Worth it.'",
    petroyal: `#petshort# takes the throne as ${s.pet.royal} of #world#, still a #species#. The coronation is the most-attended in history. There are treats.`,
    rerun: "There is no Season #season# plus one. For the first time, your memories stay yours. You remember all of it. Even the stairs.",
    audience: "The Crystal opens like a door. Out walk the people of #world#, blinking, holding signs with your name on them. Aunt Mirabel is first in line.",
  };
  lines.push(nar(S(tw[s.twist])));
  lines.push(nar(S(helped ? "#rival# opens a tavern in #town#. Your drinks are free forever. They insist on telling everyone the story, badly." : "#rival# was last seen selling 'authentic crawler memorabilia' out of a cart. Some of it is yours. They don't give it back.")));
  lines.push({ speaker: s.pet.short, text: S(petEnding(s)) });
  lines.push(sys(S(title === "RENEWED FOR ANOTHER SEASON" ? "Thank you for watching #show#. See you next season, Champion." : "...Thank you for watching. This broadcast has ended.")));
  return { title, lines };
}

function petEnding(s: Story): string {
  const m: Record<PetMood, string> = {
    vain: "Of course we won. Did you see me? Everyone saw me. I'd like that on a statue.",
    anxious: "We're alive. We're ALIVE. I'm never going down a single step again. I'm moving into a bungalow.",
    bloodthirsty: "That was the best day of my life. Can we do it again? Not the dungeon. Just the biting.",
    philosophical: "We went down to find a way up. There's a lesson in that. I'll think about it after dinner.",
    deadpan: "Great. Now can I have the good kibble?",
  };
  return m[s.pet.mood];
}

// ------------------------------------------------------------------ NPC chatter, notes, bartenders

const CRAWLER_LINES = [
  "I've been on this floor for #hours# hours. Or days. The lights never change.",
  "I used to be #job.a#. Now I'm a crawler. Character growth!",
  "Don't drink the #product#. Trust me. Just... trust me.",
  "Why does everyone keep asking me to 'like and subscribe'?",
  "My #critter# got sentience too. It left me for a mimic.",
  "I saw #villainName# on the big screen. Gave me chills. And a rash.",
  "If you see a chest that smiles at you, don't smile back.",
  "The vendor in the safe room is a crook. Buy the tonics anyway.",
  "I'm not lost. I'm 'exploring organically.'",
  "There's a goblin on this floor doing stand-up. He's actually pretty good.",
  "Have you tried attacking monsters before they see you? Total game-changer.",
  "I opened a Legendary Box once. It was a hat. A really, really good hat.",
  "The timer's the real boss. Remember that.",
  "I heard the bottom floor is just one big room and a really angry person.",
];
const CRITTERS = ["parakeet", "hamster", "goat", "iguana", "houseplant", "roomba", "ant farm"];

export function crawlerChatter(s: Story, r: RNG): string {
  return say(s, CRAWLER_LINES, r, { hours: String(r.int(3, 400)), critter: CRITTERS });
}

export function bossHint(s: Story, n: number, weak: string, r: RNG): string {
  const f = s.floors[n - 1];
  return say(s, ["Word is #boss# hates #weak#. Hates it. Use that.", "#boss# guards the stairs. They say it flinches at #weak#.", "I watched a crawler hit #boss# with #weak# once. Best day of my life."], r, { boss: `${f.boss.name} ${f.boss.epithet}`, weak });
}

export function bartenderLines(s: Story, n: number, r: RNG): string[] {
  const f = s.floors[n - 1];
  return [
    say(s, ["Welcome to #safe#. Drink's on the house. It's #product#-flavored. Everything is.", "Pull up a stool. The last crawler who sat there made it to floor #next#. Well. Parts of them did.", "#safe#, best safe room on the floor. Also the only one. What'll it be?"], r, { safe: f.safeRoom, next: String(n + 1) }),
    say(s, ["Rumor has it #system# hasn't slept since the first season. You can hear it humming when it thinks nobody's listening.", "You hear about #rival#? Tearing through the floors. Some say they're the favorite this season.", "#sponsor# has reps lurking around the lower floors. Watch your soul. They read the fine print for you.", "They say the Crystal remembers every crawler who touched it."], r),
  ];
}

const NOTES = [
  "Day 3. Ate a mushroom. Saw sounds. Would recommend. — K.",
  "If you're reading this, the mimic on this floor is the THIRD chest from the left. Or the second. Good luck.",
  "Note to self: the boss is NOT friendly. Do not hug the boss.",
  "Found a sock. Kept it. It's my friend now. Its name is Gerald.",
  "The timer is a lie. No wait, it's real. It's very real. RUN.",
  "Whoever keeps leaving these notes: your handwriting is terrible. — Management",
  "#villainName# visited this floor once. Everything is still a little bit on fire.",
  "Achievement unlocked: Wrote a Note. Reward: none. Typical.",
  "Season #prevseason#'s crawlers left their names on the wall over there. Most were spelled wrong. Panic does that.",
];

export function noteText(s: Story, n: number, r: RNG): string {
  if (n >= 3 && r.chance(0.5)) return `A torn page, scrawled fast: "${say(s, twistHint(s, n - 2), r)}"`;
  return say(s, NOTES, r);
}

export const POSTER_LINES = [
  "#sponsor#: #slogan#",
  "TONIGHT ON #show#: WILL #hero.upper# SURVIVE? (Probably not!)",
  "#corp#: We Own Everything You Love (TM)",
  "MISSING: one (1) floor boss. Answers to 'Kevin.' Do not approach.",
  "VOTE for this season's Fan Favorite! (Votes are non-binding and also decorative.)",
  "Have you been injured in a dungeon? Call #rep# & Associates, Necromantic Attorneys at Law.",
];
