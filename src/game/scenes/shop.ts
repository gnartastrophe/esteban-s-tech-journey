// The safe-room vendor. Buy consumables and a few procedurally generated
// pieces of gear; sell back whatever you've been hoarding.

import { audio } from "../engine/audio";
import { drawText, wrap } from "../engine/font";
import { Ctx, drawWindow, H, W } from "../engine/gfx";
import { CONSUMABLES, genGear, RARITY, SHOP_BASIC, SHOP_LATE, statLine } from "../data/items";
import { Game, Scene } from "../Game";
import type { Gear } from "../types";
import { ListMenu, MenuItem } from "./widgets";

const PITCHES = [
  "Welcome, welcome! Everything must go! Including, statistically, you.",
  "Prices are final. So is death. Browse at your leisure.",
  "I accept gold, silver, and minor organs. Mostly gold.",
  "Fresh stock! Some of it was even yours, once. Don't ask.",
];

export class ShopScene implements Scene {
  opaque = true;
  private tab: 0 | 1 = 0;
  private list = new ListMenu([], 11, 12);
  private stock: Gear[];
  private pitch: string;
  private t = 0;

  constructor(private game: Game, private vendor: string, private done: () => void) {
    const run = game.run!;
    const r = run.rng("shop" + run.floorN);
    this.stock = [0, 1, 2].map((i) => genGear(r, run.floorN * 2 + 1, i === 2 ? 2 : 1));
    this.pitch = r.pick(PITCHES);
    this.refresh();
  }

  onEnter() {
    this.game.music("safe", 5);
  }

  private refresh() {
    const run = this.game.run!;
    const items: MenuItem[] = [];
    if (this.tab === 0) {
      const keys = [...SHOP_BASIC, ...(run.floorN >= 2 ? SHOP_LATE.slice(0, run.floorN + 1) : [])];
      for (const k of keys) items.push({ label: CONSUMABLES[k].name, right: `${CONSUMABLES[k].price}G`, value: "c:" + k, disabled: run.gold < CONSUMABLES[k].price });
      for (const g of this.stock) {
        if (run.fstate.opened.includes("shop:" + g.uid)) continue;
        items.push({ label: g.name, right: `${Math.round(g.value * 1.5)}G`, value: "g:" + g.uid, color: RARITY[g.rarity].color, disabled: run.gold < Math.round(g.value * 1.5) });
      }
    } else {
      for (const [k, n] of Object.entries(run.inv.items)) if (n > 0) items.push({ label: `${CONSUMABLES[k].name} ×${n}`, right: `${Math.floor(CONSUMABLES[k].price / 2)}G`, value: "c:" + k });
      for (const g of run.inv.gear) items.push({ label: g.name, right: `${g.value}G`, value: "g:" + g.uid, color: RARITY[g.rarity].color });
      if (!items.length) items.push({ label: "You have nothing I want.", value: "", disabled: true });
    }
    this.list.setItems(items);
  }

  update(dt: number) {
    this.t += dt;
    const inp = this.game.input;
    const run = this.game.run!;
    if (inp.pressed("left") || inp.pressed("right")) {
      this.tab = this.tab === 0 ? 1 : 0;
      this.list.sel = 0;
      audio.sfx("cursor");
      this.refresh();
      return;
    }
    const r = this.list.update(inp);
    if (r === "cancel") {
      this.game.pop(this);
      this.done();
      return;
    }
    if (r !== "confirm" || !this.list.current || this.list.current.disabled) return;
    const v = this.list.current.value as string;
    const [kind, id] = v.split(":");
    if (this.tab === 0) {
      if (kind === "c") {
        const c = CONSUMABLES[id];
        if (run.gold < c.price) return;
        run.gold -= c.price;
        run.addItem(id);
      } else {
        const g = this.stock.find((x) => x.uid === id);
        if (!g || run.gold < Math.round(g.value * 1.5)) return;
        run.gold -= Math.round(g.value * 1.5);
        run.addGear({ ...g });
        run.fstate.opened.push("shop:" + g.uid);
      }
      audio.sfx("buy");
      run.unlock("shopper");
    } else {
      if (kind === "c") {
        run.removeItem(id);
        run.addGold(Math.floor(CONSUMABLES[id].price / 2));
      } else {
        const g = run.inv.gear.find((x) => x.uid === id);
        if (!g) return;
        run.inv.gear = run.inv.gear.filter((x) => x.uid !== id);
        run.addGold(g.value);
      }
      audio.sfx("buy");
    }
    this.refresh();
  }

  draw(ctx: Ctx) {
    const run = this.game.run!;
    ctx.fillStyle = "#0c0a18";
    ctx.fillRect(0, 0, W, H);
    drawWindow(ctx, 4, 4, W - 8, 34);
    drawText(ctx, `${this.vendor}'s Discount Emporium`, 12, 9, { color: "#ffe080" });
    const pl = wrap(this.pitch, W - 120);
    drawText(ctx, pl[0], 12, 21, { color: "#e0e8ff" });
    drawText(ctx, `${run.gold} G`, W - 12, 9, { align: "right", color: "#ffe040" });
    drawWindow(ctx, 4, 40, W - 8, 16);
    drawText(ctx, "BUY", 120, 44, { color: this.tab === 0 ? "#ffffff" : "#707890", align: "center" });
    drawText(ctx, "SELL", W - 120, 44, { color: this.tab === 1 ? "#ffffff" : "#707890", align: "center" });
    drawText(ctx, "← →", W / 2, 44, { color: "#8088b0", align: "center" });
    drawWindow(ctx, 4, 58, W - 8, 140);
    this.list.draw(ctx, 8, 65, W - 24, this.t);
    drawWindow(ctx, 4, H - 20, W - 8, 18);
    const cur = this.list.current?.value as string | undefined;
    let desc = "";
    if (cur) {
      const [kind, id] = cur.split(":");
      if (kind === "c") desc = CONSUMABLES[id]?.desc ?? "";
      if (kind === "g") {
        const g = this.stock.find((x) => x.uid === id) ?? run.inv.gear.find((x) => x.uid === id);
        if (g) desc = `${g.slot}: ${statLine(g.stats)}`;
      }
    }
    drawText(ctx, desc, 12, H - 15, { color: "#c8d0f0" });
  }
}
