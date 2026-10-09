// Floor generator: rooms + MST corridors with a few loops, then roles
// (start, safe room, boss room) assigned by walking distance, then entities.

import type { Archetype } from "../engine/monsters";
import { RNG } from "../engine/rng";
import { genEnemy } from "../data/enemies";
import type { EnemyInstance } from "../types";
import type { Story } from "./story";

export const T_WALL = 0;
export const T_FLOOR = 1;
export const T_SAFE = 2;
export const T_STAIRS = 3;

export interface Room {
  x: number;
  y: number;
  w: number;
  h: number;
  role: "start" | "safe" | "boss" | "normal" | "treasure";
  cx: number;
  cy: number;
}

export type EntityType =
  | "enemy"
  | "chest"
  | "npc"
  | "note"
  | "poster"
  | "trap"
  | "crystal"
  | "vendor"
  | "bartender"
  | "boss"
  | "barrel"
  | "bones"
  | "torch"
  | "rival"
  | "guide"
  | "oldtimer"
  | "questitem"
  | "sponsor"
  | "upstairs";

export interface Entity {
  id: string;
  type: EntityType;
  x: number;
  y: number;
  solid: boolean;
  data: {
    group?: EnemyInstance[];
    seed?: number;
    mimic?: boolean;
    text?: string;
    name?: string;
    quest?: boolean;
    level?: number;
    trapKind?: "spike" | "teleport" | "alarm" | "confetti";
    lookSeed?: number;
    wall?: boolean;
  };
}

export interface Floor {
  n: number;
  w: number;
  h: number;
  tiles: Uint8Array;
  rooms: Room[];
  entities: Entity[];
  start: { x: number; y: number };
  stairs: { x: number; y: number };
  bossRoom: Room;
  safeRoom: Room;
}

export function tileAt(f: Floor, x: number, y: number): number {
  if (x < 0 || y < 0 || x >= f.w || y >= f.h) return T_WALL;
  return f.tiles[y * f.w + x];
}

export function walkable(f: Floor, x: number, y: number): boolean {
  return tileAt(f, x, y) !== T_WALL;
}

export function inRoom(r: Room, x: number, y: number) {
  return x >= r.x && y >= r.y && x < r.x + r.w && y < r.y + r.h;
}

export function enemyLevel(n: number): number {
  return 1 + (n - 1) * 3;
}

export function generateFloor(story: Story, n: number): Floor {
  const plan = story.floors[n - 1];
  const r = new RNG(plan.seed);
  const W = 44 + n * 4;
  const H = 32 + n * 2;
  const tiles = new Uint8Array(W * H);
  const set = (x: number, y: number, v: number) => {
    if (x > 0 && y > 1 && x < W - 1 && y < H - 1) tiles[y * W + x] = v;
  };

  // ---- rooms
  const rooms: Room[] = [];
  const target = 10 + n;
  for (let tries = 0; tries < 400 && rooms.length < target; tries++) {
    const w = r.int(5, 10);
    const h = r.int(4, 7);
    const x = r.int(2, W - w - 2);
    const y = r.int(3, H - h - 2);
    const overlap = rooms.some((o) => x < o.x + o.w + 3 && x + w + 3 > o.x && y < o.y + o.h + 3 && y + h + 3 > o.y);
    if (overlap) continue;
    rooms.push({ x, y, w, h, role: "normal", cx: Math.floor(x + w / 2), cy: Math.floor(y + h / 2) });
  }
  for (const rm of rooms) for (let y = rm.y; y < rm.y + rm.h; y++) for (let x = rm.x; x < rm.x + rm.w; x++) set(x, y, T_FLOOR);

  // ---- corridors: Prim's MST + a few extra loops
  const carve = (a: Room, b: Room) => {
    let x = a.cx;
    let y = a.cy;
    const horizFirst = r.chance(0.5);
    const wide = r.chance(0.25);
    const step = (tx: number, ty: number) => {
      while (x !== tx) {
        x += Math.sign(tx - x);
        set(x, y, T_FLOOR);
        if (wide) set(x, y + 1, T_FLOOR);
      }
      while (y !== ty) {
        y += Math.sign(ty - y);
        set(x, y, T_FLOOR);
        if (wide) set(x + 1, y, T_FLOOR);
      }
    };
    if (horizFirst) {
      step(b.cx, y);
      step(x, b.cy);
    } else {
      step(x, b.cy);
      step(b.cx, y);
    }
  };
  const dist = (a: Room, b: Room) => Math.abs(a.cx - b.cx) + Math.abs(a.cy - b.cy);
  const inTree = new Set<number>([0]);
  const edges: [number, number][] = [];
  while (inTree.size < rooms.length) {
    let best: [number, number] | null = null;
    let bd = Infinity;
    for (const i of inTree)
      for (let j = 0; j < rooms.length; j++) {
        if (inTree.has(j)) continue;
        const d = dist(rooms[i], rooms[j]);
        if (d < bd) {
          bd = d;
          best = [i, j];
        }
      }
    if (!best) break;
    inTree.add(best[1]);
    edges.push(best);
  }
  const extra = r.int(2, 4);
  for (let k = 0; k < extra; k++) {
    const a = r.int(0, rooms.length - 1);
    let b = -1;
    let bd = Infinity;
    for (let j = 0; j < rooms.length; j++) {
      if (j === a || edges.some(([p, q]) => (p === a && q === j) || (p === j && q === a))) continue;
      const d = dist(rooms[a], rooms[j]);
      if (d < bd) {
        bd = d;
        b = j;
      }
    }
    if (b >= 0) edges.push([a, b]);
  }
  for (const [a, b] of edges) carve(rooms[a], rooms[b]);

  // ---- roles via BFS distance from a start room
  const startRoom = rooms.reduce((best, rm) => (rm.cx + rm.cy < best.cx + best.cy ? rm : best), rooms[r.int(0, rooms.length - 1)]);
  startRoom.role = "start";
  const bfs = bfsFrom(tiles, W, H, startRoom.cx, startRoom.cy);
  const dOf = (rm: Room) => bfs[rm.cy * W + rm.cx];
  const candidates = rooms.filter((rm) => rm !== startRoom);
  const bossRoom = candidates.filter((rm) => rm.w >= 6 && rm.h >= 5).sort((a, b) => dOf(b) - dOf(a))[0] ?? candidates.sort((a, b) => dOf(b) - dOf(a))[0];
  bossRoom.role = "boss";
  const maxD = dOf(bossRoom);
  const safeRoom = candidates
    .filter((rm) => rm !== bossRoom && rm.w >= 6 && rm.h >= 5)
    .sort((a, b) => Math.abs(dOf(a) / maxD - 0.55) - Math.abs(dOf(b) / maxD - 0.55))[0] ?? candidates.find((rm) => rm !== bossRoom)!;
  safeRoom.role = "safe";
  for (let y = safeRoom.y; y < safeRoom.y + safeRoom.h; y++) for (let x = safeRoom.x; x < safeRoom.x + safeRoom.w; x++) tiles[y * W + x] = T_SAFE;
  const normals = rooms.filter((rm) => rm.role === "normal");
  r.sample(normals, Math.min(2, normals.length)).forEach((rm) => (rm.role = "treasure"));

  // stairs on the wall side of the boss room farthest from the room's entrance
  const topRow = Array.from({ length: bossRoom.w - 2 }, (_, i) => bossRoom.x + 1 + i).sort((a, b) => Math.abs(a - bossRoom.cx) - Math.abs(b - bossRoom.cx));
  const sx = topRow.find((x) => tiles[(bossRoom.y - 1) * W + x] === T_WALL) ?? bossRoom.cx;
  const stairs = { x: sx, y: bossRoom.y };
  tiles[stairs.y * W + stairs.x] = T_STAIRS;

  const entities: Entity[] = [];
  const occupied = new Set<number>();
  const key = (x: number, y: number) => y * W + x;
  occupied.add(key(startRoom.cx, startRoom.cy));
  occupied.add(key(stairs.x, stairs.y));
  let eid = 0;
  const add = (type: EntityType, x: number, y: number, solid: boolean, data: Entity["data"] = {}) => {
    const e: Entity = { id: `f${n}-${type}-${eid++}`, type, x, y, solid, data };
    entities.push(e);
    if (solid) occupied.add(key(x, y));
    return e;
  };
  const freeSpot = (rm: Room, margin = 1): { x: number; y: number } | null => {
    for (let t = 0; t < 40; t++) {
      const x = r.int(rm.x + margin, rm.x + rm.w - 1 - margin);
      const y = r.int(rm.y + margin, rm.y + rm.h - 1 - margin);
      if (!occupied.has(key(x, y)) && tiles[key(x, y)] !== T_WALL && tiles[key(x, y)] !== T_STAIRS) return { x, y };
    }
    return null;
  };

  // ---- start
  add("upstairs", startRoom.cx, startRoom.y, false);

  // ---- boss
  add("boss", stairs.x, bossRoom.y + 2, true, { level: enemyLevel(n) + 2 });
  // keep the approach clear
  occupied.add(key(stairs.x, bossRoom.y + 1));

  // ---- safe room furniture
  const sr = safeRoom;
  add("crystal", sr.cx, sr.cy, true);
  add("vendor", sr.x + 1, sr.y + 1, true, { name: story.floors[n - 1].vendor });
  add("bartender", sr.x + sr.w - 2, sr.y + 1, true, { name: story.floors[n - 1].bartender, lookSeed: plan.seed + 3 });

  // ---- story NPCs
  const midRooms = [...normals].sort((a, b) => dOf(a) - dOf(b));
  const pickRoom = (frac: number) => midRooms[Math.min(midRooms.length - 1, Math.floor(midRooms.length * frac))];
  const placeIn = (rm: Room | undefined, type: EntityType, data: Entity["data"] = {}) => {
    const p = rm ? freeSpot(rm) : null;
    if (p) add(type, p.x, p.y, true, data);
    else {
      const q = freeSpot(sr);
      if (q) add(type, q.x, q.y, true, data);
    }
  };
  if (n === 1) placeIn(pickRoom(0), "oldtimer", { lookSeed: plan.seed + 11 });
  if (n === 2) {
    placeIn(pickRoom(0.3), "rival", { lookSeed: story.rival.lookSeed });
    placeIn(pickRoom(0.7), "guide", { lookSeed: plan.seed + 12 });
  }
  if (n === 3) {
    placeIn(sr, "sponsor", { lookSeed: plan.seed + 13 });
    placeIn(pickRoom(0.6), "rival", { lookSeed: story.rival.lookSeed });
  }
  if (n === 4) {
    placeIn(sr, "guide", { lookSeed: plan.seed + 12 });
    // rival waits just outside the boss room
    const near = midRooms[midRooms.length - 1];
    placeIn(near, "rival", { lookSeed: story.rival.lookSeed });
  }

  // ---- crawler NPCs, one with a quest
  const npcCount = n === 5 ? 1 : 2 + (r.chance(0.5) ? 1 : 0);
  for (let i = 0; i < npcCount; i++) placeIn(r.pick(normals), "npc", { lookSeed: plan.seed + 100 + i, quest: i === 0 && n < 5 });

  // ---- chests (one may be a mimic)
  const treasure = rooms.filter((rm) => rm.role === "treasure");
  const chestCount = 4 + Math.floor(n / 2);
  const mimicIdx = n >= 2 && r.chance(0.6) ? r.int(0, chestCount - 1) : -1;
  for (let i = 0; i < chestCount; i++) {
    const rm = i < treasure.length * 2 && treasure.length ? treasure[i % treasure.length] : r.pick(normals);
    const p = freeSpot(rm);
    if (p) add("chest", p.x, p.y, true, { seed: r.int(1, 1e9), mimic: i === mimicIdx, level: enemyLevel(n) });
  }

  // ---- enemies (each is a wandering encounter group)
  const level = enemyLevel(n);
  const enemyCount = 7 + n * 2;
  const enemyRooms = rooms.filter((rm) => rm.role === "normal" || rm.role === "treasure");
  for (let i = 0; i < enemyCount; i++) {
    const rm = r.pick(enemyRooms);
    const p = freeSpot(rm, 0);
    if (!p) continue;
    const gr = r.fork(`group${n}-${i}`);
    const size = gr.weighted([1, 2, 3], (k) => (k === 1 ? 4 : k === 2 ? 4 : n >= 2 ? 3 : 0));
    const group: EnemyInstance[] = [];
    const arch: Archetype = gr.pick(plan.archs);
    for (let k = 0; k < size; k++) {
      const lv = level + (n === 1 ? 0 : gr.int(0, 1)) + (k === 0 ? 0 : -gr.int(0, 1));
      group.push(genEnemy(gr, Math.max(1, lv), n, { arch: k === 0 || gr.chance(0.5) ? arch : gr.pick(plan.archs), hue: plan.boss.hue }));
    }
    add("enemy", p.x, p.y, true, { group });
  }

  // ---- quest item placeholder (activated if the quest NPC hands out a fetch quest)
  const qr = r.pick(normals.filter((rm) => dOf(rm) > maxD * 0.3));
  const qp = qr ? freeSpot(qr) : null;
  if (qp) add("questitem", qp.x, qp.y, false, { name: r.pick(["lucky spoon", "dentures", "wedding ring", "diary", "favorite rock", "toupee", "lunchbox"]) });

  // ---- notes, decor, traps
  for (let i = 0; i < 2; i++) {
    const p = freeSpot(r.pick(normals));
    if (p) add("note", p.x, p.y, false, { seed: r.int(1, 1e9) });
  }
  for (const rm of rooms) {
    if (rm.role === "boss" || rm.role === "safe") continue;
    const decor = r.int(0, 2);
    for (let i = 0; i < decor; i++) {
      const edge = r.chance(0.5);
      const x = edge ? (r.chance(0.5) ? rm.x : rm.x + rm.w - 1) : r.int(rm.x, rm.x + rm.w - 1);
      const y = edge ? r.int(rm.y, rm.y + rm.h - 1) : rm.y;
      if (occupied.has(key(x, y))) continue;
      // don't block corridors
      const nb = [tiles[key(x - 1, y)], tiles[key(x + 1, y)], tiles[key(x, y - 1)], tiles[key(x, y + 1)]].filter((t) => t === T_WALL).length;
      if (nb === 0) continue;
      add(r.chance(0.6) ? "barrel" : "bones", x, y, r.chance(0.6));
    }
  }
  const trapCount = 3 + n;
  for (let i = 0; i < trapCount; i++) {
    const rm = r.pick(enemyRooms);
    const p = freeSpot(rm, 0);
    if (p) add("trap", p.x, p.y, false, { trapKind: r.weighted(["spike", "teleport", "alarm", "confetti"] as const, (k) => (k === "spike" ? 4 : k === "confetti" ? 1 : 2)) });
  }

  // ---- wall decorations: torches and posters on wall faces
  for (let y = 1; y < H - 1; y++)
    for (let x = 1; x < W - 1; x++) {
      if (tiles[key(x, y)] !== T_WALL || tiles[key(x, y + 1)] === T_WALL) continue;
      if (r.chance(0.07)) add("torch", x, y, false, { wall: true });
      else if (r.chance(0.015)) add("poster", x, y, false, { wall: true, seed: r.int(1, 1e9) });
    }
  // guaranteed lighting in the special rooms
  for (const rm of [safeRoom, bossRoom, startRoom]) {
    for (const x of [rm.x + 1, rm.x + rm.w - 2]) if (tiles[key(x, rm.y - 1)] === T_WALL) add("torch", x, rm.y - 1, false, { wall: true });
  }

  return { n, w: W, h: H, tiles, rooms, entities, start: { x: startRoom.cx, y: startRoom.cy }, stairs, bossRoom, safeRoom };
}

export function bfsFrom(tiles: Uint8Array, W: number, H: number, sx: number, sy: number): Int32Array {
  const d = new Int32Array(W * H).fill(-1);
  const q: number[] = [sy * W + sx];
  d[sy * W + sx] = 0;
  for (let i = 0; i < q.length; i++) {
    const c = q[i];
    const x = c % W;
    const y = (c / W) | 0;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = x + dx;
      const ny = y + dy;
      if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue;
      const k = ny * W + nx;
      if (d[k] >= 0 || tiles[k] === T_WALL) continue;
      d[k] = d[c] + 1;
      q.push(k);
    }
  }
  return d;
}
