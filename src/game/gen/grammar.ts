import { RNG } from "../engine/rng";

export type Rules = Record<string, string[] | string>;

/**
 * Tracery-style expansion: `#key#` picks a random option for `key`, recursively.
 * Modifiers: .cap (capitalize), .upper, .lower, .a (a/an article).
 */
export function expand(text: string, rules: Rules, r: RNG, depth = 0): string {
  if (depth > 12) return text;
  return text.replace(/#([A-Za-z0-9_]+)((?:\.[a-z]+)*)#/g, (whole, key: string, mods: string) => {
    const opt = rules[key];
    if (opt === undefined) return whole;
    let s = expand(Array.isArray(opt) ? r.pick(opt) : opt, rules, r, depth + 1);
    for (const m of mods.split(".").filter(Boolean)) {
      if (m === "cap") s = s.charAt(0).toUpperCase() + s.slice(1);
      else if (m === "upper") s = s.toUpperCase();
      else if (m === "lower") s = s.toLowerCase();
      else if (m === "a") s = (/^[aeiou]/i.test(s) ? "an " : "a ") + s;
    }
    return s;
  });
}
