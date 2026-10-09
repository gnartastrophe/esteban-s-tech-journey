import { RNG } from "../engine/rng";

const W_START = ["Val", "Mor", "Thra", "Ul", "Is", "Bra", "Zyn", "Or", "Fen", "Gal", "Ri", "Sae", "Dra", "Quo", "Ny", "Tor", "El", "Ash", "Cor", "Lun", "Ves", "Kael", "Ar", "Oph", "Sil"];
const W_MID = ["ra", "li", "an", "or", "e", "ia", "u", "en", "ar", "is", "o", "ae", "y"];
const W_END = ["dor", "th", "n", "ra", "via", "mir", "gard", "os", "ia", "ell", "rak", "une", "ix", "heim", "wyn", "lore"];

export function worldName(r: RNG): string {
  return r.pick(W_START) + (r.chance(0.6) ? r.pick(W_MID) : "") + r.pick(W_END);
}

const FIRST = [
  "Bertram", "Ysolde", "Gwen", "Tobias", "Marisol", "Dorian", "Pip", "Agatha", "Rook", "Sable", "Fennick", "Imelda", "Corvin", "Lettie", "Oswin", "Juniper",
  "Hollis", "Brigid", "Caspian", "Wren", "Ezra", "Mabel", "Thaddeus", "Nim", "Rosalind", "Gus", "Odette", "Barnaby", "Kestrel", "Linnea", "Desmond", "Priya",
  "Mateo", "Sunny", "Ignatius", "Lorna", "Zeke", "Delphine", "Arlo", "Vera", "Esteban", "Kiko", "Ramona", "Hugo", "Tamsin", "Bo",
];
const SUR_A = ["Oak", "Thistle", "Bright", "Copper", "Fen", "Ash", "Marsh", "Quill", "Stone", "Ember", "Frost", "Bramble", "Kettle", "Mud", "Moth", "Hollow"];
const SUR_B = ["barrel", "down", "water", "wick", "worth", "field", "bottom", "whistle", "son", "hammer", "pot", "brook", "shade", "foot", "more", "gate"];

export function personName(r: RNG): string {
  return `${r.pick(FIRST)} ${r.pick(SUR_A)}${r.pick(SUR_B)}`;
}
export function firstName(r: RNG): string {
  return r.pick(FIRST);
}

const ALIEN_A = ["Gl", "Zz", "Vor", "Xy", "Kr", "Bl", "Qu", "Th", "Mm", "Sk", "Pl", "Yr", "Zhu", "Grz"];
const ALIEN_B = ["orp", "ix", "ath", "eeb", "ulk", "ax", "ool", "ek", "aar", "ub", "ozz", "ith", "anth"];

export function alienName(r: RNG): string {
  const a = r.pick(ALIEN_A) + r.pick(ALIEN_B);
  if (r.chance(0.35)) return a + "'" + r.pick(ALIEN_B);
  if (r.chance(0.3)) return a + "-" + r.pick(ALIEN_A) + r.pick(ALIEN_B);
  return a;
}

export function cap(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

const CORP_TAIL = ["Media Group", "Broadcasting", "Entertainment Holdings", "Galactic", "Infotainment Syndicate", "Content Conglomerate", "Streaming Concern", "Network & Sons"];
export function corpName(r: RNG): string {
  return `${cap(alienName(r))} ${r.pick(CORP_TAIL)}`;
}

export function showName(r: RNG, world: string): string {
  const a = ["CRYSTAL", "DUNGEON", "TOWER", "DEATH", "LOOT", "FLOOR"];
  const b = ["CRAWL", "PLUNGE", "DIVE", "BRAWL", "DELVE", "DROP"];
  const c = ["LIVE!", "EXTREME", "TONIGHT", "DELUXE", "ULTRA", "FOREVER", "XXL"];
  return r.pick([
    () => `${r.pick(a)} ${r.pick(b)} ${r.pick(c)}`,
    () => `${world.toUpperCase()}'S GOT CARNAGE`,
    () => "WHO WANTS TO SURVIVE FOREVER?",
    () => "FLOORS OF FORTUNE",
    () => "SO YOU THINK YOU CAN DUNGEON",
    () => `KEEPING UP WITH THE CRAWLERS`,
    () => `${r.pick(a)} ${r.pick(b)}: ${world.toUpperCase()}`,
  ])();
}

const PET_TITLE = ["Sir", "Lady", "Captain", "Professor", "Duchess", "Lord", "Admiral", "Doctor", "Baron", "Princess", "Count", "Madame"];
const PET_NAME = ["Whiskers", "Bubbles", "Biscuit", "Pickles", "Noodle", "Mittens", "Pudding", "Waffles", "Snickerdoodle", "Beans", "Meatball", "Crumpet", "Nugget", "Toast", "Gravy", "Pancake", "Muffin", "Turnip"];
const PET_SUFFIX = ["the Third", "Esq.", "the Magnificent", "von Fluff", "Jr.", "", "", "", "the Bold"];
export function petName(r: RNG): { full: string; short: string } {
  const short = r.pick(PET_NAME);
  const title = r.pick(PET_TITLE);
  const suf = r.pick(PET_SUFFIX);
  return { full: `${title} ${short}${suf ? " " + suf : ""}`, short };
}

const PRODUCTS = ["Discount Organs", "Energy Sludge", "Pre-Chewed Snacks", "Teleporter Insurance", "Hair Tonic", "Moon Timeshares", "Ethically-Sourced Crystal Shards", "Soul Futures", "Cloning Vats", "Sentient Soda", "Bone Broth", "Memory Foam Coffins"];
const SLOGANS = [
  "Because you only live once. Usually.",
  "Ask your necromancer if it's right for you!",
  "Now legal in four galaxies!",
  "You'll scream. With JOY.",
  "It's what's for dinner. Probably you.",
  "Side effects include winning.",
  "Ethically questionable since forever.",
];
export function sponsorName(r: RNG): { name: string; slogan: string; product: string } {
  const product = r.pick(PRODUCTS);
  const who = cap(alienName(r));
  const name = r.pick([`${who}'s ${product}`, `${who}co ${product}`, `Mother ${who}'s ${product}`, `${who} & ${cap(alienName(r))} ${product}`]);
  return { name, slogan: r.pick(SLOGANS), product };
}

const TOWNS_A = ["Moss", "Brindle", "Hearth", "Gull", "Mill", "Thorn", "Lantern", "Pebble", "Cinder", "Honey", "Fog", "Kettle"];
const TOWNS_B = ["bridge", "wick", "ford", "haven", "dale", "brook", "hollow", "stead", "mouth", "cross"];
export function townName(r: RNG): string {
  return r.pick(TOWNS_A) + r.pick(TOWNS_B);
}

const SAFE_ADJ = ["Sticky", "Rusty", "Weeping", "Laughing", "Drunken", "Gilded", "Soggy", "Broken", "Wobbly", "Lucky", "Haunted", "Greasy"];
const SAFE_NOUN = ["Goblet", "Mimic", "Minotaur", "Lantern", "Ogre", "Flagon", "Kraken", "Crown", "Toad", "Cauldron", "Anvil", "Gremlin"];
const SAFE_KIND = ["Tavern", "Saloon", "Lounge", "Diner", "Inn", "Rest Stop", "Bar & Grill", "Pub"];
export function safeRoomName(r: RNG): string {
  return `The ${r.pick(SAFE_ADJ)} ${r.pick(SAFE_NOUN)} ${r.pick(SAFE_KIND)}`;
}

const BOSS_SYL_A = ["Grub", "Vex", "Mor", "Skal", "Quee", "Bor", "Zel", "Hag", "Drom", "Ulg", "Fes", "Narg", "Ozz", "Pell", "Krim"];
const BOSS_SYL_B = ["nak", "illa", "gath", "dred", "ox", "ula", "mungus", "ra", "beth", "thor", "imir", "wick", "zor"];
const BOSS_EPITHET = [
  "the Unpaid Intern", "the Eternally Disappointed", "Collector of Teeth", "the Moist", "Regional Manager of Pain", "the Twice-Divorced", "Head of Human Resources",
  "the Gelatinous", "Litigator of the Deep", "the Hungering", "Accountant of Bones", "the Middle Child", "Who Was Promised a Raise", "the Unsubscribed",
  "Keeper of the Lost & Found", "the Reasonably Priced", "the Spoiler of Endings", "Queen of the Food Court", "the Unskippable Ad",
];
export function bossName(r: RNG): { name: string; epithet: string } {
  const name = r.chance(0.25) ? `${r.pick(["Mother", "Old", "Lord", "Big", "Auntie", "Baron"])} ${r.pick(BOSS_SYL_A)}${r.pick(BOSS_SYL_B)}` : `${r.pick(BOSS_SYL_A)}${r.pick(BOSS_SYL_B)}`;
  return { name, epithet: r.pick(BOSS_EPITHET) };
}

const PLACES: Record<string, string[]> = {
  crypt: ["Catacombs", "Ossuary", "Undercroft", "Crypts", "Bone Cellar"],
  fungal: ["Mushroom Maze", "Spore Gardens", "Fungal Warrens", "Mycelium Mile"],
  frost: ["Freezer Aisle", "Ice Vaults", "Frostbite Galleria", "Cold Storage"],
  inferno: ["Boiler Rooms", "Magma Works", "Furnace Floor", "Slag Pits"],
  studio: ["Soundstage", "Backlot", "Green Room", "Studio B"],
  sewer: ["Royal Sewers", "Drainage Gallery", "Effluent Halls", "Pipe Labyrinth"],
  palace: ["Drowned Throne Halls", "Gilded Galleries", "Queen's Wing", "Sunken Ballroom"],
  mall: ["Food Court", "Dead Mall", "Clearance Aisles", "Parking Structure"],
  crystal: ["Crystal Sanctum", "Prism Throne", "Broadcast Spire", "Heart of the Crystal"],
};
const PLACE_ADJ = ["Moist", "Forgotten", "Screaming", "Overpriced", "Sticky", "Haunted", "Damp", "Infinite", "Very Bad", "Dreaded", "Lesser", "Unlicensed"];
export function floorName(r: RNG, themeId: string, final: boolean): string {
  const place = r.pick(PLACES[themeId] ?? PLACES.crypt);
  if (final) return `The ${place}`;
  return `The ${r.pick(PLACE_ADJ)} ${place}`;
}
