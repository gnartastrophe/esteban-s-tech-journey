// Hand-placed pixel art for heroes, companions and props. Heroes are
// composed from a class head + a shared body, then palette-swapped, which is
// also how every NPC crawler in the dungeon gets a unique look.

import { flipCanvas, makeCanvas, spriteFrom } from "./gfx";
import { RNG } from "./rng";

export type Dir = "down" | "up" | "left" | "right";
export type HeadStyle = "knight" | "mage" | "cleric" | "rogue" | "hair" | "bald" | "crown";

type HeadSet = { down: string[]; up: string[]; side: string[] };

const E4 = ["................", "................", "................", "................"];

const HEADS: Record<HeadStyle, HeadSet> = {
  hair: {
    down: [...E4,
      ".....oooooo.....",
      "....ohhhhhho....",
      "...ohhhhhhhho...",
      "...ohhHhhHhho...",
      "...ohssssssho...",
      "...ohsessesho...",
      "...ohsessesho...",
      "....osssssso....",
      ".....oSSSSo.....",
    ],
    up: [...E4,
      ".....oooooo.....",
      "....ohhhhhho....",
      "...ohhhhhhhho...",
      "...ohhhhhhhho...",
      "...ohhhhhhhho...",
      "...ohHhhhhHho...",
      "...oHhhhhhhHo...",
      "....oHHHHHHo....",
      ".....oSSSSo.....",
    ],
    side: [...E4,
      ".....oooooo.....",
      "....ohhhhhho....",
      "...ohhhhhhhho...",
      "...ohhhhhhhho...",
      "...ohhhhsssso...",
      "...ohhhssseso...",
      "...ohHhsssseo...",
      "....oHssssso....",
      ".....oSSSo......",
    ],
  },
  bald: {
    down: [...E4,
      "................",
      ".....oooooo.....",
      "....osswssso....",
      "...osssssssso...",
      "...osssssssso...",
      "...osesssseso...",
      "...osesssseso...",
      "....osSSSSso....",
      ".....oSSSSo.....",
    ],
    up: [...E4,
      "................",
      ".....oooooo.....",
      "....osswssso....",
      "...osssssssso...",
      "...osssssssso...",
      "...osssssssso...",
      "...oSssssssSo...",
      "....oSSSSSSo....",
      ".....oSSSSo.....",
    ],
    side: [...E4,
      "................",
      ".....oooooo.....",
      "....osssswso....",
      "...osssssssso...",
      "...osssssssso...",
      "...osssssseso...",
      "...oSssssssso...",
      "....oSssssso....",
      ".....oSSSo......",
    ],
  },
  knight: {
    down: [
      "................",
      "................",
      ".......oo.......",
      "......oaao......",
      ".....oooooo.....",
      "....ommmmmmo....",
      "...ommwmmmmMo...",
      "...ommmmmmmMo...",
      "...oMMMMMMMMo...",
      "...omsessesmo...",
      "...omssssssmo...",
      "....oMssssMo....",
      ".....oMMMMo.....",
    ],
    up: [
      "................",
      "................",
      ".......oo.......",
      "......oaao......",
      ".....oooooo.....",
      "....ommmmmmo....",
      "...ommmmmmmmo...",
      "...ommmmmmmmo...",
      "...oMMMMMMMMo...",
      "...ommmmmmmmo...",
      "...oMmmmmmmMo...",
      "....oMMMMMMo....",
      ".....oSSSSo.....",
    ],
    side: [
      "................",
      "................",
      "......oo........",
      ".....oaao.......",
      ".....oooooo.....",
      "....ommmmmmo....",
      "...ommmmmwmmo...",
      "...ommmmmmmmo...",
      "...oMMMMMMMMo...",
      "...ommmssseso...",
      "...omMmssssso...",
      "....oMmsssso....",
      ".....oMMMo......",
    ],
  },
  mage: {
    down: [
      ".......oo.......",
      "......otTo......",
      ".....ottTTo.....",
      "....otttTTTo....",
      "....oaaaaaao....",
      ".ooTTTTTTTTTToo.",
      "..oooooooooooo..",
      "...ohSSSSSSho...",
      "...ohsessesho...",
      "...ohsessesho...",
      "....osssssso....",
      ".....oSSSSo.....",
      "................",
    ],
    up: [
      ".......oo.......",
      "......otTo......",
      ".....ottTTo.....",
      "....otttTTTo....",
      "....oaaaaaao....",
      ".ooTTTTTTTTTToo.",
      "..oooooooooooo..",
      "...ohhhhhhhho...",
      "...ohhhhhhhho...",
      "...oHhhhhhhHo...",
      "....oHHHHHHo....",
      ".....oSSSSo.....",
      "................",
    ],
    side: [
      "........oo......",
      ".......otTo.....",
      "......ottTTo....",
      ".....otttTTTo...",
      ".....oaaaaaao...",
      "..ooTTTTTTTTTTo.",
      "...ooooooooooo..",
      "...ohhhhSSSSo...",
      "...ohhhssseso...",
      "...ohHhsssseo...",
      "....oHssssso....",
      ".....oSSSo......",
      "................",
    ],
  },
  cleric: {
    down: [...E4.slice(0, 3),
      "......oooo......",
      "....oowwwwoo....",
      "...owwwwwwwwo...",
      "..owwwwwwwwwwo..",
      "..owwaaaaaawwo..",
      "..owoSSSSSSowo..",
      "..owosessesowo..",
      "..owosessesowo..",
      "..oWWossssoWWo..",
      "...oWWoSSoWWo...",
    ],
    up: [...E4.slice(0, 3),
      "......oooo......",
      "....oowwwwoo....",
      "...owwwwwwwwo...",
      "..owwwwwwwwwwo..",
      "..owwwwwwwwwwo..",
      "..owwwwwwwwwwo..",
      "..owwWwwwwWwwo..",
      "..owWwwwwwwWwo..",
      "..oWWWWWWWWWWo..",
      "...oWWWWWWWWo...",
    ],
    side: [...E4.slice(0, 3),
      "......oooo......",
      "....oowwwwoo....",
      "...owwwwwwwwo...",
      "..owwwwwwwwwwo..",
      "..owwwwwwwaaao..",
      "..owwwwwoSSSSo..",
      "..owwwwwosseso..",
      "..oWwwwwosssso..",
      "..oWWWWWoSSSo...",
      "...oWWWWWoo.....",
    ],
  },
  rogue: {
    down: [...E4,
      ".....oooooo.....",
      "....otttttto....",
      "...otttttttto...",
      "...oTTTTTTTTo...",
      "...ohssssssho...",
      "...ohsessesho...",
      "...ohCCCCCCho...",
      "....oCCCCCCo....",
      ".....oSSSSo.....",
    ],
    up: [...E4,
      ".....oooooo.....",
      "....otttttto....",
      "...otttttttto...",
      "...oTTTTTTTTo...",
      "...ohhhtThhho...",
      "...ohhhTthhho...",
      "...oHhhhhhhHo...",
      "....oHHHHHHo....",
      ".....oSSSSo.....",
    ],
    side: [...E4,
      ".....oooooo.....",
      "....otttttto....",
      "...otttttttto...",
      ".otoTTTTTTTTo...",
      ".ooohhhhsssso...",
      "...ohhhssseso...",
      "...ohHhsCCCCo...",
      "....oHCCCCCo....",
      ".....oSSSo......",
    ],
  },
  crown: {
    down: [...E4.slice(0, 2),
      "....o.o..o.o....",
      "....oyoyyoyo....",
      ".....oyyyyo.....",
      "....ohhhhhho....",
      "...ohhhhhhhho...",
      "...ohssssssho...",
      "...ohsessesho...",
      "...ohsessesho...",
      "....osssssso....",
      ".....oSSSSo.....",
      "................",
    ],
    up: [...E4.slice(0, 2),
      "....o.o..o.o....",
      "....oyoyyoyo....",
      ".....oyyyyo.....",
      "....ohhhhhho....",
      "...ohhhhhhhho...",
      "...ohhhhhhhho...",
      "...ohHhhhhHho...",
      "...oHhhhhhhHo...",
      "....oHHHHHHo....",
      ".....oSSSSo.....",
      "................",
    ],
    side: [...E4.slice(0, 2),
      ".....o.o.o......",
      ".....oyoyo......",
      ".....oyyyyo.....",
      "....ohhhhhho....",
      "...ohhhhhhhho...",
      "...ohhhhsssso...",
      "...ohhhssseso...",
      "...ohHhsssseo...",
      "....oHssssso....",
      ".....oSSSo......",
      "................",
    ],
  },
};

// Bodies: 7 rows. "step" frames are mirrored for the other foot on down/up.
const BODY = {
  down: [
    "...occcaaccco...",
    "..oCccccccccCo..",
    "..osccccccccso..",
    "...oaaaaaaaao...",
    "....occoocco....",
    "...obbo..obbo...",
    "...oooo..oooo...",
  ],
  downStep: [
    "...occcaaccco...",
    "..oCccccccccCo..",
    "..osccccccccso..",
    "...oaaaaaaaao...",
    "....occoobbo....",
    "...obbo..oo.....",
    "...oooo.........",
  ],
  up: [
    "...occcccccco...",
    "..oCccccccccCo..",
    "..osCcccccCcso..",
    "...oaaaaaaaao...",
    "....occoocco....",
    "...obbo..obbo...",
    "...oooo..oooo...",
  ],
  upStep: [
    "...occcccccco...",
    "..oCccccccccCo..",
    "..osCcccccCcso..",
    "...oaaaaaaaao...",
    "....occoobbo....",
    "...obbo..oo.....",
    "...oooo.........",
  ],
  side: [
    "....occcccco....",
    "....oCccccco....",
    "....oCcccsso....",
    "....oaaaaaao....",
    ".....occco......",
    ".....obbbbo.....",
    ".....oooooo.....",
  ],
  sideStep: [
    "....occcccco....",
    "....oCccccco....",
    "....oCcccsso....",
    "....oaaaaaao....",
    "....occo.occo...",
    "...obbo...obbo..",
    "...oooo...oooo..",
  ],
};

export interface Look {
  head: HeadStyle;
  pal: Record<string, string>;
}

export const SKINS: [string, string][] = [
  ["#f8d0a8", "#d8a080"],
  ["#e8b890", "#c08a64"],
  ["#c88c60", "#9c6440"],
  ["#946038", "#704224"],
  ["#6a4028", "#4c2a18"],
  ["#f0d8c8", "#c8a898"],
  ["#a8d890", "#78a860"], // the dungeon does things to people
];

export const HAIRS: [string, string][] = [
  ["#3a2a20", "#22160e"],
  ["#8a4a24", "#5c2e14"],
  ["#e8c870", "#b89040"],
  ["#d8d8e0", "#9898a8"],
  ["#c03a30", "#80201c"],
  ["#4a6ad8", "#2a3a90"],
  ["#d860b0", "#983880"],
  ["#202028", "#0c0c10"],
];

export const CLOTHS: [string, string][] = [
  ["#4060c0", "#283880"],
  ["#c04040", "#802424"],
  ["#40a060", "#246838"],
  ["#8050c0", "#503080"],
  ["#d09030", "#8a5a18"],
  ["#40a8b8", "#246878"],
  ["#707080", "#484858"],
  ["#e070a0", "#a04068"],
];

export function basePal(skin: [string, string], hair: [string, string], cloth: [string, string], accent: string, boots = "#5a3a28"): Record<string, string> {
  return {
    o: "#181420",
    s: skin[0],
    S: skin[1],
    h: hair[0],
    H: hair[1],
    e: "#181420",
    c: cloth[0],
    C: cloth[1],
    a: accent,
    b: boots,
    m: "#c8d0e0",
    M: "#7880a0",
    w: "#f4f4f8",
    W: "#b0b0c4",
    t: cloth[0],
    T: cloth[1],
    y: "#f0c840",
  };
}

export function classLook(cls: string, skinIdx: number, hairIdx: number): Look {
  const skin = SKINS[skinIdx % SKINS.length];
  const hair = HAIRS[hairIdx % HAIRS.length];
  switch (cls) {
    case "knight":
      return { head: "knight", pal: { ...basePal(skin, hair, ["#3c5cc8", "#24387c"], "#e03838", "#4a3020") } };
    case "mage":
      return { head: "mage", pal: { ...basePal(skin, hair, ["#5a3aa8", "#34206a"], "#e8c040"), t: "#4a3090", T: "#2c1a5c" } };
    case "cleric":
      return { head: "cleric", pal: { ...basePal(skin, hair, ["#ececf4", "#a8a8c0"], "#d03040", "#8a5a38") } };
    case "rogue":
    default:
      return { head: "rogue", pal: { ...basePal(skin, hair, ["#4a7a3c", "#2c4a24"], "#8a5a30", "#3a2a1c"), t: "#3a9a4a", T: "#226030", C: "#2a3a2a" } };
  }
}

/** A random look for NPC crawlers. */
export function randomLook(r: RNG): Look {
  const head = r.pick<HeadStyle>(["hair", "hair", "hair", "bald", "knight", "mage", "cleric", "rogue"]);
  const cloth = r.pick(CLOTHS);
  const pal = basePal(r.pick(SKINS), r.pick(HAIRS), cloth, r.pick(["#e0c040", "#e03838", "#40c0e0", "#f0f0f0", "#202020"]));
  if (head === "mage" || head === "rogue") {
    const hat = r.pick(CLOTHS);
    pal.t = hat[0];
    pal.T = hat[1];
  }
  return { head, pal };
}

const heroCache = new Map<string, HTMLCanvasElement[]>();

/** Returns [stand, step] frames for a direction (left is mirrored right). Sprites are 16x20. */
export function heroFrames(look: Look, dir: Dir): HTMLCanvasElement[] {
  const key = look.head + JSON.stringify(look.pal) + dir;
  const hit = heroCache.get(key);
  if (hit) return hit;
  const head = HEADS[look.head];
  const side = dir === "left" || dir === "right";
  const headRows = side ? head.side : dir === "up" ? head.up : head.down;
  const body = side ? [BODY.side, BODY.sideStep] : dir === "up" ? [BODY.up, BODY.upStep] : [BODY.down, BODY.downStep];
  const frames = body.map((b) => spriteFrom([...headRows, ...b], look.pal));
  let out = frames;
  if (side) {
    out = dir === "left" ? frames.map(flipCanvas) : frames;
  } else {
    // stand, stepL, stand, stepR
    out = [frames[0], frames[1], frames[0], flipCanvas(frames[1])];
  }
  heroCache.set(key, out);
  return out;
}

// ---------------------------------------------------------------- companions

export type Species = "cat" | "goldfish" | "pug" | "crab" | "chicken";

const PETS: Record<Species, { frames: string[][]; pal: Record<string, string> }> = {
  cat: {
    pal: { o: "#181420", k: "#e8a050", K: "#b06a28", e: "#20c060", p: "#f080a0" },
    frames: [
      [
        "..........o...o.",
        ".........oko.oko",
        ".........okkokko",
        ".o.......okkkkko",
        "oko......okekeko",
        "oko.....ookkpkko",
        ".o.oooooookkkko.",
        "..okkkkkkkkkoo..",
        "..okkkKkkkkko...",
        "..okKkkkkKkko...",
        "..okko..okko....",
        "..ooo...ooo.....",
      ],
      [
        "..........o...o.",
        ".........oko.oko",
        ".........okkokko",
        "o........okkkkko",
        "ok.......okekeko",
        "oko.....ookkpkko",
        ".oooooooookkkko.",
        "..okkkkkkkkkoo..",
        "..okkkKkkkkko...",
        "..okKkkkkKkko...",
        "...okko.okko....",
        "...ooo..ooo.....",
      ],
    ],
  },
  goldfish: {
    pal: { o: "#181420", w: "#e8f4ff", b: "#78b8f0", B: "#4880c0", f: "#f08830", F: "#c05818", e: "#181420", s: "#ffffff" },
    frames: [
      [
        ".....oooooo.....",
        "....owwwwwwo....",
        "...obsbbbbbbo...",
        "..obsbbbbbbbbo..",
        "..obbbbffffbbo..",
        "..obbbffFfefbo..",
        "..obbbbffffbbo..",
        "..obbbbbFbbbbo..",
        "..obbbbbbbbbbo..",
        "...oBBBBBBBBo...",
        "....oooooooo....",
        "................",
      ],
      [
        ".....oooooo.....",
        "....owwwwwwo....",
        "...obsbbbbbbo...",
        "..obsbbbbbbbbo..",
        "..obbbffffbbbo..",
        "..obbffFfefbbo..",
        "..obbbffffbbbo..",
        "..obbbbFbbbbbo..",
        "..obbbbbbbbbbo..",
        "...oBBBBBBBBo...",
        "....oooooooo....",
        "................",
      ],
    ],
  },
  pug: {
    pal: { o: "#181420", k: "#e0c8a0", K: "#b89c70", D: "#3a2c24", e: "#181420", n: "#181420" },
    frames: [
      [
        "..........oo.oo.",
        ".........oDkkkDo",
        "........okkkkkko",
        "........okekekko",
        ".o......okDDDDko",
        "oko.....ookDnDo.",
        ".oooooooookkkko.",
        "..okkkkkkkkkko..",
        "..okKkkkkkKkko..",
        "..okkkkkkkkkko..",
        "..okko...okko...",
        "..ooo....ooo....",
      ],
      [
        "..........oo.oo.",
        ".........oDkkkDo",
        "........okkkkkko",
        "........okekekko",
        "o.......okDDDDko",
        "oko.....ookDnDo.",
        ".oooooooookkkko.",
        "..okkkkkkkkkko..",
        "..okKkkkkkKkko..",
        "..okkkkkkkkkko..",
        "...okko..okko...",
        "...ooo...ooo....",
      ],
    ],
  },
  crab: {
    pal: { o: "#181420", r: "#e04838", R: "#a02818", e: "#181420", w: "#ffffff" },
    frames: [
      [
        "..oo........oo..",
        ".orro......orro.",
        ".orrro....orrro.",
        "..oorro..orroo..",
        "....owo..owo....",
        "....oeo..oeo....",
        "...orrrrrrrrro..",
        "..orrrrrrrrrrro.",
        "..orRrrrrrrrRro.",
        "...oRRRRRRRRo...",
        "..o.o.o..o.o.o..",
        "................",
      ],
      [
        ".oo..........oo.",
        "orro........orro",
        ".orrro....orrro.",
        "..oorro..orroo..",
        "....owo..owo....",
        "....oeo..oeo....",
        "...orrrrrrrrro..",
        "..orrrrrrrrrrro.",
        "..orRrrrrrrrRro.",
        "...oRRRRRRRRo...",
        "...o.o.oo.o.o...",
        "................",
      ],
    ],
  },
  chicken: {
    pal: { o: "#181420", w: "#f8f8f0", W: "#c8c8c0", R: "#e03030", y: "#f0b020", e: "#181420" },
    frames: [
      [
        "..........oo....",
        ".........oRRo...",
        "........owwwwo..",
        "........owewwyo.",
        "........owwwwyyo",
        ".oo....owwwwwoo.",
        "owwo..owwwwwwo..",
        "owwwoowwwwwwwo..",
        ".owwwwwwWwwwwo..",
        "..owwwwWwwwwo...",
        "...oowwwwwoo....",
        ".....oy..oy.....",
      ],
      [
        "..........oo....",
        ".........oRRo...",
        "........owwwwo..",
        "........owewwyo.",
        "........owwwwyyo",
        ".oo....owwwwwoo.",
        "owwo..owwwwwwo..",
        "owwwoowwwwwwwo..",
        ".owwwwwwWwwwwo..",
        "..owwwwWwwwwo...",
        "...oowwwwwoo....",
        "......oy.oy.....",
      ],
    ],
  },
};

const petCache = new Map<string, HTMLCanvasElement[]>();

/** [frameA, frameB] facing the given horizontal direction. Sprites are 16x16. */
export function petFrames(species: Species, faceLeft: boolean): HTMLCanvasElement[] {
  const key = species + faceLeft;
  const hit = petCache.get(key);
  if (hit) return hit;
  const def = PETS[species];
  const pad = ["................", "................", "................", "................"];
  const frames = def.frames.map((f) => spriteFrom([...pad, ...f], def.pal, faceLeft));
  petCache.set(key, frames);
  return frames;
}

// ---------------------------------------------------------------- props

const CHEST_CLOSED = [
  "................",
  "................",
  "................",
  "..oooooooooooo..",
  ".oLLLLLLLLLLLLo.",
  ".oLllllllllllLo.",
  ".oDDDDDDDDDDDDo.",
  ".ooooooyyoooooo.",
  ".oDddddyYddddDo.",
  ".oDddddooddddDo.",
  ".oDddddddddddDo.",
  ".oDddddddddddDo.",
  ".oDDDDDDDDDDDDo.",
  "..oooooooooooo..",
  "................",
  "................",
];
const CHEST_OPEN = [
  "..oooooooooooo..",
  ".oDDDDDDDDDDDDo.",
  ".oLllllllllllLo.",
  ".oLllllllllllLo.",
  ".oLLLLLLLLLLLLo.",
  ".oooooooooooooo.",
  ".o############o.",
  ".o#yy###y#####o.",
  ".oDddddddddddDo.",
  ".oDddddddddddDo.",
  ".oDddddddddddDo.",
  ".oDddddddddddDo.",
  ".oDDDDDDDDDDDDo.",
  "..oooooooooooo..",
  "................",
  "................",
];
const CHEST_PAL = { o: "#181018", L: "#d89850", l: "#b07030", D: "#6a3c1c", d: "#9a5a28", y: "#f8d048", Y: "#b08820", "#": "#100808" };

const BARREL = [
  "................",
  "................",
  "....oooooooo....",
  "...odddddddDo...",
  "...oLLLLLLLLo...",
  "...oddddddDDo...",
  "...odddddddDo...",
  "...oMMMMMMMMo...",
  "...odddddddDo...",
  "...odddddddDo...",
  "...oddddddDDo...",
  "...oMMMMMMMMo...",
  "...odddddddDo...",
  "....oooooooo....",
  "................",
  "................",
];
const BARREL_PAL = { o: "#181018", d: "#8a5a30", D: "#5a3818", L: "#b07848", M: "#707888" };

const BONES = [
  "................",
  "................",
  "................",
  "................",
  "................",
  "................",
  "................",
  "....ooo.........",
  "...owwwo....oo..",
  "...owewo...owwo.",
  "....owo.oo.owwo.",
  "........owwwwo..",
  "..oo...owoo.....",
  ".owwooowo.......",
  "..owwwwo........",
  "...oooo.........",
];
const BONES_PAL = { o: "#282028", w: "#e0dcc8", e: "#282028" };

const NOTE = [
  "................",
  "................",
  "................",
  "................",
  "................",
  "................",
  "................",
  "....oooooooo....",
  "...owwwwwwwwo...",
  "...owggggggwo...",
  "...owwwwwwwwo...",
  "...owgggggwwo...",
  "...owwwwwwwwo...",
  "...owggggwwwo...",
  "....oooooooo....",
  "................",
];
const NOTE_PAL = { o: "#4a3a28", w: "#f0e4c0", g: "#8a7a60" };

const SPIKES = [
  "................",
  "................",
  "................",
  "................",
  "................",
  "................",
  "...o...o...o....",
  "..owo.owo.owo...",
  "..owo.owo.owo...",
  ".owwgowwgowwgo..",
  ".owwgowwgowwgo..",
  "................",
  "......o...o.....",
  ".....owo.owo....",
  "....owwgowwgo...",
  "................",
];
const SPIKES_PAL = { o: "#202028", w: "#c8c8d8", g: "#787888" };

const propCache = new Map<string, HTMLCanvasElement>();
function prop(key: string, rows: string[], pal: Record<string, string>) {
  let c = propCache.get(key);
  if (!c) {
    c = spriteFrom(rows, pal);
    propCache.set(key, c);
  }
  return c;
}

export const props = {
  chest: (open: boolean) => prop("chest" + open, open ? CHEST_OPEN : CHEST_CLOSED, CHEST_PAL),
  barrel: () => prop("barrel", BARREL, BARREL_PAL),
  bones: () => prop("bones", BONES, BONES_PAL),
  note: () => prop("note", NOTE, NOTE_PAL),
  spikes: () => prop("spikes", SPIKES, SPIKES_PAL),
};

/** A floating save crystal, drawn procedurally (12x22). */
export function drawCrystal(ctx: CanvasRenderingContext2D, x: number, y: number, t: number, hue = 190) {
  const h = 20;
  const bob = Math.round(Math.sin(t * 2) * 2);
  const cx = Math.round(x);
  const top = Math.round(y + bob);
  // glow
  ctx.fillStyle = `hsla(${hue},90%,70%,${0.12 + 0.06 * Math.sin(t * 3)})`;
  ctx.beginPath();
  ctx.ellipse(cx, top + h / 2, 12, 14, 0, 0, Math.PI * 2);
  ctx.fill();
  for (let i = 0; i < h; i++) {
    const half = i < 7 ? Math.round((i / 7) * 6) : Math.round(((h - 1 - i) / (h - 8)) * 6);
    if (half <= 0) {
      ctx.fillStyle = "#181420";
      ctx.fillRect(cx - 1, top + i, 2, 1);
      continue;
    }
    const shimmer = Math.sin(t * 3 + i * 0.4) * 8;
    ctx.fillStyle = "#181420";
    ctx.fillRect(cx - half - 1, top + i, half * 2 + 2, 1);
    ctx.fillStyle = `hsl(${hue},85%,${78 + shimmer}%)`;
    ctx.fillRect(cx - half, top + i, half, 1);
    ctx.fillStyle = `hsl(${hue + 20},75%,${52 + shimmer}%)`;
    ctx.fillRect(cx, top + i, half, 1);
  }
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(cx - 3, top + 5, 1, 3);
  ctx.fillRect(cx - 2, top + 4, 1, 1);
  // shadow on the ground
  ctx.fillStyle = "rgba(0,0,0,0.35)";
  ctx.fillRect(cx - 5, Math.round(y) + h + 6, 10, 2);
}

/** Small wall torch with animated flame (8x14). */
export function drawTorch(ctx: CanvasRenderingContext2D, x: number, y: number, t: number) {
  ctx.fillStyle = "#3a2a1c";
  ctx.fillRect(x + 3, y + 8, 2, 6);
  ctx.fillStyle = "#6a6a78";
  ctx.fillRect(x + 1, y + 7, 6, 2);
  const f = Math.floor(t * 10) % 3;
  const flame = [
    ["..y...", ".yYy..", ".yRYy.", "yRRRy.", ".yRy.."],
    ["...y..", "..yYy.", ".yYRy.", ".yRRRy", "..yRy."],
    ["..y...", "..yy..", ".yYYy.", ".yRRy.", "..yy.."],
  ][f];
  flame.forEach((row, i) => {
    for (let j = 0; j < row.length; j++) {
      const k = row[j];
      if (k === ".") continue;
      ctx.fillStyle = k === "y" ? "#f8c030" : k === "Y" ? "#fff4b0" : "#f05020";
      ctx.fillRect(x + 1 + j, y + 2 + i, 1, 1);
    }
  });
}

/** Ground shadow under actors. */
export function drawShadow(ctx: CanvasRenderingContext2D, cx: number, by: number, w = 10) {
  ctx.fillStyle = "rgba(0,0,0,0.35)";
  ctx.fillRect(Math.round(cx - w / 2) + 1, Math.round(by) - 2, w - 2, 1);
  ctx.fillRect(Math.round(cx - w / 2), Math.round(by) - 1, w, 2);
}

export function makeIcon(rows: string[], pal: Record<string, string>) {
  return spriteFrom(rows, pal);
}

export { makeCanvas };
