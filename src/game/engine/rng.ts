// Seeded, forkable random number generator. Every procedural system in the
// game draws from a fork of the run seed, so a seed phrase always rebuilds the
// same story, floors and monsters no matter what order things happen in.

export function hashString(str: string): number {
  let h = 1779033703 ^ str.length;
  for (let i = 0; i < str.length; i++) {
    h = Math.imul(h ^ str.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  h = Math.imul(h ^ (h >>> 16), 2246822507);
  h = Math.imul(h ^ (h >>> 13), 3266489909);
  return (h ^= h >>> 16) >>> 0;
}

export class RNG {
  private state: number;
  readonly base: number;

  constructor(seed: number | string) {
    this.base = typeof seed === "string" ? hashString(seed) : seed >>> 0;
    this.state = this.base;
  }

  /** mulberry32 */
  next(): number {
    let t = (this.state = (this.state + 0x6d2b79f5) | 0);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  /** Independent stream derived from the base seed and a label. */
  fork(label: string | number): RNG {
    return new RNG(hashString(`${this.base}|${label}`));
  }

  int(min: number, max: number): number {
    return min + Math.floor(this.next() * (max - min + 1));
  }

  float(min: number, max: number): number {
    return min + this.next() * (max - min);
  }

  chance(p: number): boolean {
    return this.next() < p;
  }

  pick<T>(arr: readonly T[]): T {
    return arr[Math.floor(this.next() * arr.length)];
  }

  /** Pick n distinct elements. */
  sample<T>(arr: readonly T[], n: number): T[] {
    return this.shuffle(arr).slice(0, n);
  }

  weighted<T>(items: readonly T[], weight: (t: T) => number): T {
    let total = 0;
    for (const it of items) total += weight(it);
    let r = this.next() * total;
    for (const it of items) {
      r -= weight(it);
      if (r <= 0) return it;
    }
    return items[items.length - 1];
  }

  shuffle<T>(arr: readonly T[]): T[] {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(this.next() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }
}

const SEED_A = ["MOIST", "FERAL", "CURSED", "SHINY", "SOGGY", "ANGRY", "TINY", "HOLY", "SPICY", "GILDED", "HAUNTED", "SNEAKY", "RUSTY", "COSMIC", "LOUD", "CRISPY"];
const SEED_B = ["GOBLIN", "CRYSTAL", "MIMIC", "WYRM", "GOOSE", "SLIME", "LICH", "BARD", "TOAD", "BADGER", "GOLEM", "KNIGHT", "POSSUM", "GHOUL", "PIGEON", "TROLL"];

export function randomSeedPhrase(): string {
  const r = new RNG((Math.random() * 2 ** 32) >>> 0);
  return `${r.pick(SEED_A)}-${r.pick(SEED_B)}-${r.int(10, 99)}`;
}
