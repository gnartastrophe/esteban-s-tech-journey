// Opening a loot box, with the ceremony it deserves.

import { audio } from "../engine/audio";
import { drawText, drawTitle } from "../engine/font";
import { Ctx, drawWindow, H, W } from "../engine/gfx";
import { hashString, RNG } from "../engine/rng";
import { BOX_INFO, BoxReward, CONSUMABLES, RARITY, rollBox } from "../data/items";
import { Game, Scene } from "../Game";
import type { LootBox } from "../types";
import { BattleFx } from "./battlefx";

export class LootBoxScene implements Scene {
  opaque = false;
  private t = 0;
  private stage: "shake" | "open" | "reveal" = "shake";
  private reward: BoxReward;
  private lines: { text: string; color: string }[] = [];
  private shown = 0;
  private fx = new BattleFx();
  private nextShake = 0;

  constructor(private game: Game, private box: LootBox) {
    const run = game.run!;
    const r = new RNG(hashString(box.uid + run.seed));
    this.reward = rollBox(r, box.tier, Math.max(run.hero.level, run.floorN * 2));
    if (this.reward.gold) this.lines.push({ text: `${this.reward.gold} Gold`, color: "#ffe040" });
    for (const [k, n] of Object.entries(this.reward.items)) this.lines.push({ text: `${CONSUMABLES[k].name} ×${n}`, color: "#a0ffa0" });
    for (const g of this.reward.gear) this.lines.push({ text: `${g.name} (${RARITY[g.rarity].name})`, color: RARITY[g.rarity].color });
    if (this.reward.joke) this.lines.push({ text: `...and ${this.reward.joke}`, color: "#ff90e0" });
  }

  private apply() {
    const run = this.game.run!;
    run.boxes = run.boxes.filter((b) => b.uid !== this.box.uid);
    run.addGold(this.reward.gold);
    for (const [k, n] of Object.entries(this.reward.items)) run.addItem(k, n);
    for (const g of this.reward.gear) run.addGear(g);
    run.stats.boxesOpened++;
    run.unlock("firstbox");
    run.addViewers(150 * (["Bronze", "Silver", "Gold", "Legendary"].indexOf(this.box.tier) + 2));
  }

  update(dt: number) {
    this.t += dt;
    this.fx.update(dt);
    const inp = this.game.input;
    if (this.stage === "shake") {
      this.nextShake -= dt;
      if (this.nextShake <= 0) {
        audio.sfx("boxshake");
        this.nextShake = Math.max(0.07, 0.3 - this.t * 0.18);
      }
      if (this.t > 1.4 || (this.t > 0.3 && inp.pressed("confirm"))) {
        this.stage = "open";
        this.t = 0;
        audio.sfx("boxopen");
        const info = BOX_INFO[this.box.tier];
        this.fx.burst(W / 2, 96, 60, [info.color, "#ffffff", "#ffe080"], { speed: 160, life: 1.2, size: 3 });
        this.fx.flash = 0.7;
        this.apply();
      }
      return;
    }
    if (this.stage === "open") {
      if (this.t > 0.6) {
        this.stage = "reveal";
        this.t = 0;
      }
      return;
    }
    if (this.shown < this.lines.length && this.t > 0.25 * (this.shown + 1)) {
      this.shown++;
      audio.sfx("chest");
    }
    if (inp.pressed("confirm") || inp.pressed("cancel")) {
      if (this.shown < this.lines.length) this.shown = this.lines.length;
      else {
        audio.sfx("confirm");
        this.game.pop(this);
      }
    }
  }

  draw(ctx: Ctx) {
    ctx.fillStyle = "rgba(0,0,10,0.82)";
    ctx.fillRect(0, 0, W, H);
    const info = BOX_INFO[this.box.tier];
    drawText(ctx, info.label.toUpperCase(), W / 2, 18, { color: info.color, align: "center" });
    drawText(ctx, `from: ${this.box.source}`, W / 2, 30, { color: "#a8a0c8", align: "center" });
    const cx = W / 2;
    const cy = 100;
    if (this.stage !== "reveal" || this.t < 0.6) {
      // rays
      if (this.stage !== "shake") {
        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(this.t * 0.8);
        for (let i = 0; i < 12; i++) {
          ctx.rotate((Math.PI * 2) / 12);
          ctx.fillStyle = i % 2 ? "rgba(255,240,180,0.18)" : "rgba(255,255,255,0.08)";
          ctx.beginPath();
          ctx.moveTo(0, 0);
          ctx.lineTo(-10, -200);
          ctx.lineTo(10, -200);
          ctx.fill();
        }
        ctx.restore();
      }
      const shake = this.stage === "shake" ? Math.round(Math.sin(this.t * 60) * Math.min(4, this.t * 3)) : 0;
      const lidUp = this.stage === "shake" ? 0 : Math.min(40, this.t * 140);
      drawBox(ctx, cx + shake, cy, info.color, info.dark, lidUp, this.game.time);
    }
    this.fx.draw(ctx);
    if (this.stage === "reveal") {
      const h = this.lines.length * 12 + 16;
      drawWindow(ctx, W / 2 - 130, 130 - Math.max(0, h - 70), 260, h);
      for (let i = 0; i < this.shown; i++) drawText(ctx, this.lines[i].text, W / 2, 138 - Math.max(0, h - 70) + i * 12, { color: this.lines[i].color, align: "center" });
      if (this.t < 0.8) drawTitle(ctx, "LOOT!", W / 2, 50, 3, "#fff8c0", info.color);
    } else if (this.stage === "shake") drawText(ctx, "Z to open", W / 2, H - 20, { color: "#8088b0", align: "center" });
  }
}

function drawBox(ctx: Ctx, cx: number, cy: number, col: string, dark: string, lid: number, t: number) {
  const w = 44;
  const h = 34;
  const x = Math.round(cx - w / 2);
  const y = Math.round(cy - h / 2 + 6);
  ctx.fillStyle = "#100810";
  ctx.fillRect(x - 1, y - 1, w + 2, h + 2);
  ctx.fillStyle = col;
  ctx.fillRect(x, y, w, h);
  ctx.fillStyle = dark;
  ctx.fillRect(x, y + h - 6, w, 6);
  ctx.fillRect(x + w - 6, y, 6, h);
  // ribbon
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(x + w / 2 - 3, y, 6, h);
  // question mark
  ctx.fillStyle = Math.floor(t * 4) % 2 ? "#ffffff" : "#ffe080";
  ctx.fillRect(x + 8, y + 10, 6, 2);
  ctx.fillRect(x + 12, y + 12, 2, 4);
  ctx.fillRect(x + 10, y + 16, 2, 3);
  ctx.fillRect(x + 10, y + 21, 2, 2);
  // lid
  const ly = y - 10 - lid;
  ctx.fillStyle = "#100810";
  ctx.fillRect(x - 4, ly - 1, w + 8, 12);
  ctx.fillStyle = col;
  ctx.fillRect(x - 3, ly, w + 6, 10);
  ctx.fillStyle = dark;
  ctx.fillRect(x - 3, ly + 7, w + 6, 3);
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(x + w / 2 - 3, ly, 6, 10);
  // bow
  ctx.fillRect(x + w / 2 - 9, ly - 5, 6, 5);
  ctx.fillRect(x + w / 2 + 3, ly - 5, 6, 5);
}
