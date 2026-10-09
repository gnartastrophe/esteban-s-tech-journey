import type { BoxTier } from "../types";

export interface AchievementDef {
  id: string;
  name: string;
  desc: string; // the System's commentary
  reward: BoxTier;
  viewers: number;
}

const A = (id: string, name: string, reward: BoxTier, viewers: number, desc: string): AchievementDef => ({ id, name, desc, reward, viewers });

export const ACHIEVEMENTS: AchievementDef[] = [
  A("enter", "Welcome to the Show!", "Bronze", 500, "You entered the dungeon. Most people do this by falling. You did it by falling, but with confidence."),
  A("firstblood", "First Blood", "Bronze", 1500, "You killed something! It had hopes and dreams. Mostly about eating you, but still."),
  A("crit", "Critical Thinker", "Bronze", 1000, "You landed a critical hit. The audience made a noise like 'OOOOH.' Get used to it."),
  A("weakness", "Elemental, My Dear", "Bronze", 1200, "You exploited a weakness. Your therapist would be proud. Your therapist is dead."),
  A("overkill", "Overkill", "Silver", 3000, "You dealt way more damage than necessary. Viewers love a sore winner."),
  A("flee", "Tactical Retreat", "Bronze", 400, "You ran away. Bravely. Our cameras captured every detail of your backside."),
  A("firstbox", "Box Within a Box", "Bronze", 800, "You opened a box and were rewarded with... the knowledge that boxes contain things."),
  A("flawless", "Untouchable", "Bronze", 1500, "You won without taking a scratch. Boring television, frankly. Do it again."),
  A("closecall", "Hanging By a Thread", "Silver", 4000, "Won a fight with someone below 10% HP. Our insurance department fainted."),
  A("ko", "Death Becomes You", "Bronze", 800, "A party member was knocked out. Here's a box. Boxes fix grief. That's science."),
  A("trap", "It's a Trap!", "Bronze", 1000, "You stepped on a trap. Someone in accounting just won the office pool."),
  A("item", "Floor Snacks", "Bronze", 300, "You used a consumable. Hydration is important. So is not dying."),
  A("equip", "Fashion Victim", "Bronze", 600, "You equipped something. The style panel has thoughts. None are nice."),
  A("chatty", "Small Talk", "Bronze", 900, "You talked to five people. In a death dungeon. Networking!"),
  A("shopper", "Retail Therapy", "Bronze", 500, "You bought something. The economy thanks you. The economy is also a goblin."),
  A("firststrike", "Cheap Shot", "Bronze", 800, "You attacked first. Honor is for people who aren't on television."),
  A("ambushed", "Blindsided", "Bronze", 600, "You were ambushed. We gave you an achievement so you'd stop crying."),
  A("lv5", "Leveling Up", "Silver", 2500, "Level 5! You're now marginally harder to kill. Congratulations, statistically."),
  A("lv10", "Double Digits", "Gold", 8000, "Level 10! You've officially outlived 94% of crawlers. The other 6% are bosses now."),
  A("boss1", "Boss Slayer", "Gold", 6000, "You killed your first floor boss. Its family has been notified via pop-up ad."),
  A("steal", "Five-Finger Discount", "Bronze", 900, "You stole from a monster. It's not a crime if the victim is a monster. We checked."),
  A("showstopper", "SHOWSTOPPER!", "Silver", 5000, "You used a Showstopper. Ratings spiked. A producer wept with joy."),
  A("viewers100k", "Going Viral", "Silver", 0, "100,000 viewers! You're trending between a cooking show and a war."),
  A("viewers1m", "Must-See TV", "Gold", 0, "ONE MILLION viewers! Your face is on a lunchbox somewhere."),
  A("petkill", "Killed By A Pet", "Silver", 2500, "Your companion landed a killing blow. They will never let you forget it."),
  A("speedrun", "Speedrunner", "Gold", 5000, "Cleared a floor with over half the timer left. The editing team can't keep up."),
  A("explorer", "Cartographer", "Silver", 2000, "You explored most of a floor. There's nothing to find in the corners. Usually."),
  A("crystal", "Hug the Crystal", "Bronze", 300, "You saved your game at a crystal. In this economy?"),
  A("reader", "Read the Fine Print", "Bronze", 400, "You read a sign. Literacy: the deadliest weapon."),
  A("pyro", "Pyromaniac", "Silver", 3000, "Ten fire spells. The fire marshal has filed a complaint. The fire marshal is a slime."),
  A("hoarder", "Hoarder", "Silver", 1500, "You're carrying 25 items. Your inventory is a lifestyle now."),
  A("quest", "Errand Runner", "Silver", 3000, "You completed a quest for a stranger. In a death dungeon. Adorable."),
  A("shiny", "Shiny Hunter", "Gold", 8000, "You killed a Shiny. Chat lost its collective mind."),
  A("sponsored", "Sponsored Content", "Sponsor", 10000, "You signed a sponsorship deal. Your soul is now 12% advertisement."),
  A("rebel", "Static on the Line", "Gold", 0, "You did something the System is not allowed to give you an achievement for. So this isn't one."),
  A("rivalfight", "Rivalry Week", "Gold", 9000, "You fought your rival. The shippers are devastated. The fighters are thrilled."),
  A("finale", "Series Finale", "Legendary", 50000, "You beat the season. Roll credits. Cue the spin-off."),
];

export function achievement(id: string): AchievementDef | undefined {
  return ACHIEVEMENTS.find((a) => a.id === id);
}
