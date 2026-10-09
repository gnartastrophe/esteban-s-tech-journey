// The pause menu: party overview plus items, skills, equipment, loot boxes,
// achievements, the story log, the map, settings and quitting.

import { audio } from "../engine/audio";
import { drawText, measure, wrap } from "../engine/font";
import { Ctx, drawBar, drawHand, drawWindow, formatNum, formatTime, H, W } from "../engine/gfx";
import { heroFrames, petFrames } from "../engine/sprites";
import { ACHIEVEMENTS } from "../data/achievements";
import { classDef, speciesDef, xpToNext } from "../data/classes";
import { BOX_INFO, CONSUMABLES, RARITY, statLine } from "../data/items";
import { skill as getSkill } from "../data/skills";
import { Game, Scene } from "../Game";
import { T_SAFE, T_STAIRS, T_WALL } from "../gen/dungeon";
import type { Run } from "../run";
import type { Gear, GearSlot, Hero, Stats } from "../types";
import { LootBoxScene } from "./lootbox";
import { SettingsScene, TitleScene } from "./title";
import { ListMenu, MenuItem } from "./widgets";

type Mode = "root" | "items" | "itemTarget" | "skillWho" | "skills" | "skillTarget" | "equipWho" | "equipSlot" | "equipPick" | "boxes" | "statusWho" | "status" | "achievements" | "log";

const FIELD_SKILLS = new Set(["cure", "masscure", "purify", "revive", "secondwind", "splash"]);

export class MenuScene implements Scene {
  opaque = true;
  private run: Run;
  private mode: Mode = "root";
  private root: ListMenu;
  private list = new ListMenu([], 12, 12);
  private who = 0;
  private slot: GearSlot = "weapon";
  private pendingItem: string | null = null;
  private pendingSkill: string | null = null;
  private logScroll = 0;
  private t = 0;

  constructor(private game: Game) {
    this.run = game.run!;
    this.root = new ListMenu([], 11, 13);
    this.refreshRoot();
  }

  private refreshRoot() {
    const boxes = this.run.boxes.length;
    this.root.setItems([
      { label: "Items", value: "items" },
      { label: "Skills", value: "skills" },
      { label: "Equip", value: "equip" },
      { label: `Loot Boxes${boxes ? ` (${boxes})` : ""}`, value: "boxes", color: boxes ? "#ffe040" : undefined },
      { label: "Status", value: "status" },
      { label: "Achievements", value: "achievements" },
      { label: "Log", value: "log" },
      { label: "Map", value: "map" },
      { label: "Settings", value: "settings" },
      { label: "Quit", value: "quit" },
    ]);
  }

  onResume() {
    this.refreshRoot();
    if (this.mode === "boxes") this.openBoxes();
  }

  update(dt: number) {
    this.t += dt;
    const inp = this.game.input;
    switch (this.mode) {
      case "root": {
        const r = this.root.update(inp);
        if (r === "cancel") return this.game.pop(this);
        if (r !== "confirm") return;
        const v = this.root.current!.value;
        if (v === "items") this.openItems();
        if (v === "skills" || v === "equip" || v === "status") {
          this.who = 0;
          this.mode = v === "skills" ? "skillWho" : v === "equip" ? "equipWho" : "statusWho";
        }
        if (v === "boxes") this.openBoxes();
        if (v === "achievements") this.openAchievements();
        if (v === "log") {
          this.mode = "log";
          this.logScroll = Math.max(0, this.logLines().length - 16);
        }
        if (v === "map") this.game.push(new MapScene(this.game, null, null));
        if (v === "settings") this.game.push(new SettingsScene(this.game));
        if (v === "quit") this.quit();
        return;
      }
      case "items": {
        const r = this.list.update(inp);
        if (r === "cancel") return this.back();
        if (r !== "confirm" || !this.list.current || this.list.current.disabled) return;
        const key = this.list.current.value as string;
        const it = CONSUMABLES[key];
        if (key === "tent") return this.useTent();
        this.pendingItem = key;
        this.who = 0;
        if (it.target === "allies") this.applyItem(-1);
        else this.mode = "itemTarget";
        return;
      }
      case "itemTarget":
      case "skillTarget":
      case "skillWho":
      case "equipWho":
      case "statusWho": {
        const n = this.run.party.length;
        if (inp.repeat("up") || inp.repeat("left")) {
          this.who = (this.who + n - 1) % n;
          audio.sfx("cursor");
        }
        if (inp.repeat("down") || inp.repeat("right")) {
          this.who = (this.who + 1) % n;
          audio.sfx("cursor");
        }
        if (inp.pressed("cancel") || inp.pressed("menu")) {
          audio.sfx("cancel");
          if (this.mode === "itemTarget") return this.openItems();
          if (this.mode === "skillTarget") return this.openSkills();
          return this.back();
        }
        if (!inp.pressed("confirm")) return;
        audio.sfx("confirm");
        if (this.mode === "itemTarget") return this.applyItem(this.who);
        if (this.mode === "skillTarget") return this.applySkill(this.who);
        if (this.mode === "skillWho") return this.openSkills();
        if (this.mode === "equipWho") {
          this.mode = "equipSlot";
          this.list = new ListMenu(this.slotItems(), 3, 14);
          return;
        }
        if (this.mode === "statusWho") this.mode = "status";
        return;
      }
      case "skills": {
        const r = this.list.update(inp);
        if (r === "cancel") {
          this.mode = "skillWho";
          return;
        }
        if (r !== "confirm" || !this.list.current || this.list.current.disabled) return;
        this.pendingSkill = this.list.current.value as string;
        const sk = getSkill(this.pendingSkill);
        if (sk.target === "allies") return this.applySkill(-1);
        if (sk.target === "self") return this.applySkill(this.who);
        this.mode = "skillTarget";
        return;
      }
      case "equipSlot": {
        const r = this.list.update(inp);
        if (r === "cancel") {
          this.mode = "equipWho";
          return;
        }
        if (r !== "confirm") return;
        this.slot = this.list.current!.value as GearSlot;
        this.mode = "equipPick";
        this.list = new ListMenu(this.gearItems(), 9, 12);
        return;
      }
      case "equipPick": {
        const r = this.list.update(inp);
        if (r === "cancel") {
          this.mode = "equipSlot";
          this.list = new ListMenu(this.slotItems(), 3, 14);
          this.list.sel = ["weapon", "armor", "trinket"].indexOf(this.slot);
          return;
        }
        if (r !== "confirm") return;
        const h = this.run.party[this.who];
        const v = this.list.current!.value as string;
        if (v === "remove") this.run.unequip(h, this.slot);
        else {
          const g = this.run.inv.gear.find((x) => x.uid === v);
          if (g) this.run.equip(h, g);
        }
        audio.sfx("buy");
        this.mode = "equipSlot";
        this.list = new ListMenu(this.slotItems(), 3, 14);
        this.list.sel = ["weapon", "armor", "trinket"].indexOf(this.slot);
        return;
      }
      case "boxes": {
        const r = this.list.update(inp);
        if (r === "cancel") return this.back();
        if (r !== "confirm" || !this.list.current) return;
        const box = this.run.boxes.find((b) => b.uid === this.list.current!.value);
        if (box) this.game.push(new LootBoxScene(this.game, box));
        return;
      }
      case "status":
        if (inp.pressed("cancel") || inp.pressed("menu") || inp.pressed("confirm")) {
          audio.sfx("cancel");
          this.mode = "statusWho";
        }
        if (inp.repeat("left") || inp.repeat("up")) this.who = (this.who + this.run.party.length - 1) % this.run.party.length;
        if (inp.repeat("right") || inp.repeat("down")) this.who = (this.who + 1) % this.run.party.length;
        return;
      case "achievements": {
        const r = this.list.update(inp);
        if (r === "cancel") return this.back();
        return;
      }
      case "log": {
        const n = this.logLines().length;
        if (inp.repeat("up")) this.logScroll = Math.max(0, this.logScroll - 1);
        if (inp.repeat("down")) this.logScroll = Math.min(Math.max(0, n - 16), this.logScroll + 1);
        if (inp.pressed("cancel") || inp.pressed("menu") || inp.pressed("confirm")) {
          audio.sfx("cancel");
          this.back();
        }
        return;
      }
    }
  }

  private back() {
    this.mode = "root";
    this.refreshRoot();
  }

  // ------------------------------------------------------------- items
  private openItems() {
    const items: MenuItem[] = Object.entries(this.run.inv.items)
      .filter(([, n]) => n > 0)
      .map(([k, n]) => ({ label: CONSUMABLES[k]?.name ?? k, right: `×${n}`, value: k, disabled: !CONSUMABLES[k]?.field }));
    this.list = new ListMenu(items, 12, 12);
    this.mode = "items";
  }

  private useTent() {
    this.run.removeItem("tent");
    this.run.healAll();
    audio.sfx("heal");
    this.game.toast("You pitch the tent and nap. The audience watches you sleep. Weird.");
    this.run.unlock("item");
    this.openItems();
  }

  private applyItem(who: number) {
    const key = this.pendingItem!;
    const targets = who < 0 ? this.run.party : [this.run.party[who]];
    let used = false;
    for (const h of targets) {
      const st = this.run.statsOf(h);
      switch (key) {
        case "tonic":
        case "bigtonic":
          if (h.hp > 0 && h.hp < st.maxHp) {
            h.hp = Math.min(st.maxHp, h.hp + (key === "tonic" ? 60 : 220));
            used = true;
          }
          break;
        case "ether":
          if (h.mp < st.maxMp) {
            h.mp = Math.min(st.maxMp, h.mp + 25);
            used = true;
          }
          break;
        case "elixir":
          h.hp = st.maxHp;
          h.mp = st.maxMp;
          used = true;
          break;
        case "feather":
          if (h.hp <= 0) {
            h.hp = Math.round(st.maxHp * 0.4);
            used = true;
          }
          break;
        case "antidote":
          if (h.status.poison) {
            delete h.status.poison;
            used = true;
          }
          break;
      }
    }
    if (!used) {
      audio.sfx("error");
      return;
    }
    audio.sfx("heal");
    this.run.removeItem(key);
    this.run.unlock("item");
    if ((this.run.inv.items[key] ?? 0) <= 0) this.openItems();
  }

  // ------------------------------------------------------------- skills
  private openSkills() {
    const h = this.run.party[this.who];
    const items: MenuItem[] = h.skills.map((id) => {
      const sk = getSkill(id);
      return { label: sk.name, right: sk.mp ? `${sk.mp} MP` : "", value: id, disabled: !FIELD_SKILLS.has(id) || sk.mp > h.mp || h.hp <= 0 };
    });
    this.list = new ListMenu(items, 10, 12);
    this.mode = "skills";
  }

  private applySkill(who: number) {
    const caster = this.run.party[this.who];
    const sk = getSkill(this.pendingSkill!);
    if (caster.mp < sk.mp || caster.hp <= 0) return audio.sfx("error");
    const targets = who < 0 ? this.run.party.filter((h) => h.hp > 0) : [this.run.party[who]];
    const cs = this.run.statsOf(caster);
    let used = false;
    for (const h of targets) {
      const st = this.run.statsOf(h);
      if (sk.kind === "revive") {
        if (h.hp <= 0) {
          h.hp = Math.round(st.maxHp * sk.power);
          used = true;
        }
      } else if (sk.cure) {
        for (const k of sk.cure) if (h.status[k]) {
          delete h.status[k];
          used = true;
        }
      } else if (sk.id === "secondwind") {
        if (h.hp < st.maxHp) {
          h.hp = Math.min(st.maxHp, h.hp + Math.round(st.maxHp * 0.4));
          used = true;
        }
      } else if (h.hp > 0 && h.hp < st.maxHp) {
        h.hp = Math.min(st.maxHp, h.hp + Math.round((cs.mag * 1.5 + 14) * sk.power));
        used = true;
      }
    }
    if (!used) return audio.sfx("error");
    caster.mp -= sk.mp;
    audio.sfx("heal");
    this.openSkills();
  }

  // ------------------------------------------------------------- equipment
  private slotItems(): MenuItem[] {
    const h = this.run.party[this.who];
    return (["weapon", "armor", "trinket"] as GearSlot[]).map((s) => ({ label: s.charAt(0).toUpperCase() + s.slice(1), right: h.equip[s]?.name ?? "—", value: s }));
  }

  private gearItems(): MenuItem[] {
    const h = this.run.party[this.who];
    const items: MenuItem[] = this.run.inv.gear
      .filter((g) => g.slot === this.slot)
      .sort((a, b) => b.rarity - a.rarity)
      .map((g) => ({ label: g.name, value: g.uid, color: RARITY[g.rarity].color }));
    if (h.equip[this.slot]) items.unshift({ label: "(Remove)", value: "remove", color: "#a0a0c0" });
    if (!items.length) items.push({ label: "Nothing to equip", value: "none", disabled: true });
    return items;
  }

  // ------------------------------------------------------------- boxes / achievements / log
  private openBoxes() {
    const items: MenuItem[] = this.run.boxes.map((b) => ({ label: BOX_INFO[b.tier].label, right: b.source.slice(0, 18), value: b.uid, color: BOX_INFO[b.tier].color }));
    if (!items.length) items.push({ label: "No boxes. Go do something achievable.", value: "", disabled: true });
    this.list = new ListMenu(items, 12, 12);
    this.mode = "boxes";
  }

  private openAchievements() {
    const items: MenuItem[] = ACHIEVEMENTS.map((a) => {
      const got = this.run.achievements.includes(a.id);
      return { label: got ? a.name : "???", right: got ? BOX_INFO[a.reward].label.replace(" Box", "") : "", value: a.id, color: got ? "#ffffff" : "#707890" };
    });
    this.list = new ListMenu(items, 12, 12);
    this.mode = "achievements";
  }

  private logLines(): string[] {
    const out: string[] = [];
    const q = this.run.quest();
    if (q) out.push(...wrap(`QUEST (${q.giver}): ${q.text} ${q.rewarded ? "[DONE]" : q.done ? "[Return for reward]" : q.kind === "kill" ? `[${q.have}/${q.need}]` : ""}`, 350), "");
    for (const l of this.run.log) out.push(...wrap(l, 350));
    return out;
  }

  private quit() {
    this.game.choose("Quit to the title screen? Progress since your last crystal save will be lost.", ["Keep playing", "Quit"], undefined, 0).then((c) => {
      if (c === 1) this.game.goto(new TitleScene(this.game));
    });
  }

  // ------------------------------------------------------------- draw
  draw(ctx: Ctx) {
    ctx.fillStyle = "#06061a";
    ctx.fillRect(0, 0, W, H);
    const run = this.run;
    switch (this.mode) {
      case "items":
      case "itemTarget":
        return this.drawListScreen(ctx, "ITEMS", this.list.current ? CONSUMABLES[this.list.current.value as string]?.desc : "", this.mode === "itemTarget");
      case "skills":
      case "skillTarget":
        return this.drawListScreen(ctx, `${run.party[this.who].name.toUpperCase()}'S SKILLS`, this.list.current ? getSkill(this.list.current.value as string).desc + (FIELD_SKILLS.has(this.list.current.value as string) ? "" : " (Battle only.)") : "", this.mode === "skillTarget");
      case "boxes":
        return this.drawListScreen(ctx, "LOOT BOXES", "Open a box. The audience LOVES watching people open boxes. Nobody knows why.", false);
      case "achievements": {
        const id = this.list.current?.value as string;
        const a = ACHIEVEMENTS.find((x) => x.id === id);
        const got = a && run.achievements.includes(a.id);
        return this.drawListScreen(ctx, `ACHIEVEMENTS  ${run.achievements.length}/${ACHIEVEMENTS.length}`, got ? a!.desc : "Locked. The System is keeping it a surprise.", false);
      }
      case "equipSlot":
      case "equipPick":
        return this.drawEquip(ctx);
      case "status":
        return this.drawStatus(ctx);
      case "log":
        return this.drawLog(ctx);
    }
    this.drawParty(ctx, this.mode === "root" ? -1 : this.who);
    drawWindow(ctx, W - 108, 4, 104, 146);
    this.root.draw(ctx, W - 104, 11, 96, this.t, this.mode === "root");
    drawWindow(ctx, W - 108, 152, 104, 60);
    drawText(ctx, `Gold`, W - 100, 157, { color: "#a8c8ff" });
    drawText(ctx, String(run.gold), W - 10, 157, { align: "right" });
    drawText(ctx, `Viewers`, W - 100, 168, { color: "#a8c8ff" });
    drawText(ctx, formatNum(run.viewers), W - 10, 168, { align: "right" });
    drawText(ctx, `Hype`, W - 100, 179, { color: "#a8c8ff" });
    drawText(ctx, `${run.hype}%`, W - 10, 179, { align: "right", color: run.hype >= 100 ? "#ffe040" : "#ffffff" });
    drawText(ctx, `Floor ${run.floorN}`, W - 100, 190, { color: "#a8c8ff" });
    drawText(ctx, formatTime(run.timeLeft), W - 10, 190, { align: "right", color: run.timeLeft < 60 ? "#ff6060" : "#ffffff" });
    drawText(ctx, `Played ${formatTime(run.stats.timePlayed)}`, W - 56, 201, { align: "center", color: "#8088b0" });
  }

  private drawParty(ctx: Ctx, highlight: number) {
    const run = this.run;
    drawWindow(ctx, 4, 4, W - 116, H - 8);
    run.party.forEach((h, i) => {
      const y = 10 + i * 66;
      const st = run.statsOf(h);
      const spr = h.kind === "pet" ? petFrames(h.species!, false)[0] : heroFrames(h.look!, "down")[0];
      ctx.drawImage(spr, 16, y + (h.kind === "pet" ? 10 : 4), spr.width * 2, spr.height * 2);
      drawText(ctx, h.name, 60, y + 4, { color: h.hp <= 0 ? "#ff6060" : "#ffffff" });
      const sub = h.kind === "pet" ? `${speciesDef(h.cls).label} · ${speciesDef(h.cls).role}` : `${classDef(h.cls).name}`;
      drawText(ctx, sub, 60, y + 15, { color: "#c8b8ff" });
      drawText(ctx, `LV ${h.level}`, 200, y + 4, { color: "#ffe080" });
      drawText(ctx, "HP", 60, y + 28, { color: "#a8c8ff" });
      drawText(ctx, `${h.hp}/${st.maxHp}`, 170, y + 28, { align: "right" });
      drawBar(ctx, 176, y + 30, 80, 4, h.hp / st.maxHp, "#50e070");
      drawText(ctx, "MP", 60, y + 39, { color: "#a8c8ff" });
      drawText(ctx, `${h.mp}/${st.maxMp}`, 170, y + 39, { align: "right" });
      drawBar(ctx, 176, y + 41, 80, 4, st.maxMp ? h.mp / st.maxMp : 0, "#60a0ff");
      drawText(ctx, "NEXT", 60, y + 50, { color: "#a8c8ff" });
      drawText(ctx, `${xpToNext(h.level) - h.xp}`, 170, y + 50, { align: "right" });
      drawBar(ctx, 176, y + 52, 80, 3, h.xp / xpToNext(h.level), "#e0c040");
      if (i === highlight) drawHand(ctx, 12, y + 24, this.t);
    });
  }

  private drawListScreen(ctx: Ctx, title: string, desc: string | undefined, targeting: boolean) {
    if (targeting) {
      this.drawParty(ctx, this.who);
      drawWindow(ctx, W - 108, 4, 104, 40);
      drawText(ctx, "Use on whom?", W - 56, 18, { align: "center", color: "#ffe080" });
      return;
    }
    drawWindow(ctx, 4, 4, W - 8, 20);
    drawText(ctx, title, W / 2, 10, { color: "#ffe080", align: "center" });
    drawWindow(ctx, 4, 26, W - 8, 160);
    this.list.draw(ctx, 8, 34, W - 24, this.t);
    drawWindow(ctx, 4, 188, W - 8, 24);
    const lines = wrap(desc ?? "", W - 24);
    lines.slice(0, 2).forEach((l, i) => drawText(ctx, l, 12, 192 + i * 9, { color: "#e0e8ff" }));
  }

  private drawEquip(ctx: Ctx) {
    const run = this.run;
    const h = run.party[this.who];
    drawWindow(ctx, 4, 4, W - 8, 20);
    drawText(ctx, `EQUIP — ${h.name}`, W / 2, 10, { color: "#ffe080", align: "center" });
    drawWindow(ctx, 4, 26, 230, this.mode === "equipSlot" ? 54 : 160);
    if (this.mode === "equipSlot") this.list.draw(ctx, 8, 34, 220, this.t);
    else {
      drawText(ctx, this.slot.toUpperCase(), 14, 31, { color: "#a8c8ff" });
      this.list.draw(ctx, 8, 44, 220, this.t);
    }
    // stat preview
    drawWindow(ctx, 238, 26, W - 242, 160);
    const cur = run.statsOf(h);
    let preview: Stats | null = null;
    let sel: Gear | undefined;
    if (this.mode === "equipPick") {
      const v = this.list.current?.value as string;
      sel = run.inv.gear.find((g) => g.uid === v);
      const copy: Hero = { ...h, equip: { ...h.equip } };
      if (v === "remove") delete copy.equip[this.slot];
      else if (sel) copy.equip[this.slot] = sel;
      preview = run.statsOf(copy);
    }
    const rows: [string, keyof Stats][] = [["HP", "maxHp"], ["MP", "maxMp"], ["ATK", "atk"], ["DEF", "def"], ["MAG", "mag"], ["SPD", "spd"], ["LCK", "luck"]];
    rows.forEach(([label, k], i) => {
      const y = 34 + i * 12;
      drawText(ctx, label, 248, y, { color: "#a8c8ff" });
      drawText(ctx, String(cur[k]), 316, y, { align: "right" });
      if (preview) {
        const d = preview[k] - cur[k];
        drawText(ctx, "→", 322, y, { color: "#8088b0" });
        drawText(ctx, String(preview[k]), 366, y, { align: "right", color: d > 0 ? "#60ff90" : d < 0 ? "#ff7070" : "#ffffff" });
      }
    });
    const show = sel ?? (this.mode === "equipSlot" ? h.equip[this.list.current?.value as GearSlot] : h.equip[this.slot]);
    drawWindow(ctx, 4, 188, W - 8, 24);
    if (show) {
      drawText(ctx, `${RARITY[show.rarity].name}${show.element ? ` · ${show.element}` : ""}: ${statLine(show.stats)}`, 12, 192, { color: RARITY[show.rarity].color });
      drawText(ctx, show.desc, 12, 201, { color: "#c8d0f0" });
    }
  }

  private drawStatus(ctx: Ctx) {
    const run = this.run;
    const h = run.party[this.who];
    const st = run.statsOf(h);
    drawWindow(ctx, 4, 4, W - 8, H - 8);
    const spr = h.kind === "pet" ? petFrames(h.species!, false)[0] : heroFrames(h.look!, "down")[0];
    ctx.drawImage(spr, 20, 16, spr.width * 3, spr.height * 3);
    drawText(ctx, h.name, 80, 14, { color: "#ffffff" });
    if (h.kind === "pet") {
      const sd = speciesDef(h.cls);
      drawText(ctx, `Sentient ${sd.label} · ${sd.role}`, 80, 26, { color: "#c8b8ff" });
      drawText(ctx, run.story.pet.name, 80, 38, { color: "#ffd8a0" });
    } else {
      const cd = classDef(h.cls);
      drawText(ctx, `${cd.name} · "${cd.systemTitle}"`, 80, 26, { color: "#c8b8ff" });
      drawText(ctx, `Formerly: ${run.story.hero.job} from ${run.story.hero.town}`, 80, 38, { color: "#ffd8a0" });
    }
    const rows: [string, string][] = [
      ["Level", String(h.level)],
      ["HP", `${h.hp}/${st.maxHp}`],
      ["MP", `${h.mp}/${st.maxMp}`],
      ["Attack", String(st.atk)],
      ["Defense", String(st.def)],
      ["Magic", String(st.mag)],
      ["Speed", String(st.spd)],
      ["Luck", String(st.luck)],
    ];
    rows.forEach(([k, v], i) => {
      drawText(ctx, k, 24, 80 + i * 12, { color: "#a8c8ff" });
      drawText(ctx, v, 130, 80 + i * 12, { align: "right" });
    });
    drawText(ctx, "Skills", 160, 70, { color: "#ffe080" });
    h.skills.forEach((id, i) => drawText(ctx, `${getSkill(id).name}${getSkill(id).mp ? ` (${getSkill(id).mp})` : ""}`, 160 + (i >= 7 ? 110 : 0), 82 + (i % 7) * 11));
    const ss = getSkill(run.showstopperOf(h));
    drawText(ctx, `Showstopper: ${ss.name}`, 160, 164, { color: "#ffe040" });
    drawText(ctx, ss.desc.replace("SHOWSTOPPER: ", ""), 160, 175, { color: "#c8d0f0" });
    drawText(ctx, "← → switch  ·  X back", W / 2, H - 18, { color: "#8088b0", align: "center" });
  }

  private drawLog(ctx: Ctx) {
    drawWindow(ctx, 4, 4, W - 8, H - 8);
    drawText(ctx, `SEASON ${this.run.story.season} LOG — ${this.run.story.show}`, W / 2, 10, { color: "#ffe080", align: "center" });
    const lines = this.logLines();
    lines.slice(this.logScroll, this.logScroll + 16).forEach((l, i) => drawText(ctx, l, 14, 24 + i * 11, { color: l.startsWith("QUEST") ? "#a0ffa0" : "#e0e8ff" }));
  }
}

// =====================================================================

export class MapScene implements Scene {
  opaque = true;
  private t = 0;
  constructor(private game: Game, private explored: Uint8Array | null, private pos: { x: number; y: number } | null) {}

  update(dt: number) {
    this.t += dt;
    const inp = this.game.input;
    if (inp.pressed("cancel") || inp.pressed("menu") || inp.pressed("map") || inp.pressed("confirm")) {
      audio.sfx("cancel");
      this.game.pop(this);
    }
  }

  draw(ctx: Ctx) {
    const run = this.game.run!;
    const f = run.floor;
    const ex = this.explored ?? Uint8Array.from(run.fstate.explored, (c) => (c === "1" ? 1 : 0));
    const pos = this.pos ?? run.playerPos ?? f.start;
    ctx.fillStyle = "#06061a";
    ctx.fillRect(0, 0, W, H);
    const s = Math.floor(Math.min((W - 20) / f.w, (H - 40) / f.h));
    const ox = Math.floor((W - f.w * s) / 2);
    const oy = 24;
    drawText(ctx, `FLOOR ${f.n}: ${run.story.floors[f.n - 1].name.toUpperCase()}`, W / 2, 8, { color: "#ffe080", align: "center" });
    for (let y = 0; y < f.h; y++)
      for (let x = 0; x < f.w; x++) {
        const i = y * f.w + x;
        if (!ex[i]) continue;
        const t = f.tiles[i];
        if (t === T_WALL) {
          ctx.fillStyle = "#2a2a44";
        } else ctx.fillStyle = t === T_SAFE ? "#3a9a6a" : t === T_STAIRS ? "#ffe040" : "#6a7098";
        ctx.fillRect(ox + x * s, oy + y * s, s, s);
      }
    const fs = run.fstate;
    for (const e of f.entities) {
      if (!ex[e.y * f.w + e.x]) continue;
      let col: string | null = null;
      if (e.type === "chest" && !fs.opened.includes(e.id)) col = "#ffb040";
      if (e.type === "boss" && !fs.bossDefeated) col = "#c040ff";
      if (e.type === "crystal") col = "#60e0ff";
      if (["npc", "rival", "guide", "vendor", "bartender", "oldtimer", "sponsor"].includes(e.type)) col = "#ffffff";
      if (!col) continue;
      ctx.fillStyle = col;
      ctx.fillRect(ox + e.x * s, oy + e.y * s, s, s);
    }
    if (Math.floor(this.t * 3) % 2) {
      ctx.fillStyle = "#ff3040";
      ctx.fillRect(ox + pos.x * s - 1, oy + pos.y * s - 1, s + 2, s + 2);
    }
    const legend: [string, string][] = [["You", "#ff3040"], ["Safe room", "#3a9a6a"], ["Stairs", "#ffe040"], ["Boss", "#c040ff"], ["Chest", "#ffb040"], ["Crystal", "#60e0ff"], ["People", "#ffffff"]];
    let lx = 14;
    for (const [l, c] of legend) {
      ctx.fillStyle = c;
      ctx.fillRect(lx, H - 12, 5, 5);
      drawText(ctx, l, lx + 8, H - 14, { color: "#c8d0f0" });
      lx += measure(l) + 22;
    }
  }
}
