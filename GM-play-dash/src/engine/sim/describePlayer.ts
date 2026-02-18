// engine/sim/describePlayer.ts
import type { Player } from "../types/player";
import type { PlayerLatents } from "../types/playerLatents";
import { getBatterAttributes, getPitcherAttributes } from "./deriveAttributes";
import { assignFieldingPositions } from "./assignFieldingPositions";

/* ==============================================
   TYPES
============================================== */

export type PlayerIdentity = {
  headline: string;
  tags: string[];
  summary: string;

  report: {
    overview: string;
    strengths: string[];
    weaknesses: string[];
    usage: string[];
    risk: string[];
    contract: string[];
    gmNotes: string[];
  };
};

/* ==============================================
   SMALL HELPERS
============================================== */

function pushIf(arr: string[], cond: boolean, text: string) {
  if (cond) arr.push(text);
}

function safeNumber(v: unknown, fallback = 50): number {
  return typeof v === "number" ? v : fallback;
}

function fmtMoney(millions: number): string {
  if (!Number.isFinite(millions)) return "?";
  return `$${millions.toFixed(1)}M`;
}

function tier(n: number) {
  if (n >= 85) return "elite";
  if (n >= 75) return "plus";
  if (n >= 60) return "avg+";
  if (n >= 45) return "below avg";
  return "poor";
}

/* ==============================================
   CAREER STAGE
============================================== */

function careerStage(player: Player): { label: string; note: string } {
  const age = player.age;

  if (age <= 21) return { label: "Teen Prospect", note: "developmental runway is long" };
  if (age <= 24) return { label: "Young Player", note: "growth years; skills can jump fast" };
  if (age <= 27) return { label: "Prime-Age", note: "peak seasons; push contention window" };
  if (age <= 31) return { label: "Veteran", note: "stable but aging curve begins" };
  return { label: "Aging Veteran", note: "decline risk increases year-over-year" };
}

/* ==============================================
   CONTRACT EVAL
============================================== */

function getContract(player: Player) {
  const c = (player as any).contract;
  if (!c) return null;

  const years = c.yearsRemaining ?? c.years ?? 1;
  const aav = c.aav ?? c.salaryAAV ?? c.salary ?? 1;

  return { years, aav, total: years * aav };
}

// You can tune these thresholds later. They just need to be consistent.
function contractBand(aav: number) {
  if (aav <= 2) return "minimum";
  if (aav <= 6) return "cheap";
  if (aav <= 12) return "mid";
  if (aav <= 20) return "high";
  return "star";
}

/* ==============================================
   BATTER SCOUTING
============================================== */

function batterImpactScore(attrs: ReturnType<typeof getBatterAttributes>, glove: number, pos: string) {
  let base = 0.35 * attrs.contact + 0.35 * attrs.power + 0.2 * attrs.discipline + 0.1 * glove;

  // premium defensive positions matter more
  if (pos === "CF" || pos === "SS" || pos === "C") base += 4;
  if (pos === "2B") base += 2;

  return base; // roughly 40–95 range
}

function batterRoleAndUsage(attrs: any, common: any) {
  const usage: string[] = [];

  const obpLean = attrs.discipline >= 70 || attrs.contact >= 75;
  const speed = common.athleticism >= 75;

  if (obpLean && speed) usage.push("Lineup fit: leadoff / #2 (sets table, pressure on bases).");
  else if (attrs.power >= 80 && attrs.contact >= 60) usage.push("Lineup fit: 3–5 (middle-order damage).");
  else if (attrs.power >= 80 && attrs.discipline <= 50) usage.push("Lineup fit: 4–6 (power bat; streak management).");
  else if (attrs.contact >= 75) usage.push("Lineup fit: #2 / #6 (contact stabilizer).");
  else usage.push("Lineup fit: bottom third / platoon until skills consolidate.");

  if (common.volatility >= 70) usage.push("Deployment: avoid long cold-streak exposure; consider platoon/rest cadence.");
  if (common.volatility <= 40) usage.push("Deployment: stable everyday option; can anchor lineup construction.");

  return usage;
}

function batterWeaknessGameplan(attrs: any) {
  const weak: string[] = [];

  if (attrs.contact <= 50) weak.push("Swing-and-miss risk: expands strike zone under pressure.");
  if (attrs.discipline <= 50) weak.push("Chase tendency: pitchers can bait him with soft stuff off the plate.");
  if (attrs.power <= 45) weak.push("Limited impact contact: can be challenged in-zone without fear of damage.");

  // gameplan-style bullets (simulated, not pitch-type real yet)
  if (attrs.contact <= 55) weak.push("Opposing plan: live on edges; finish at-bats away and below the zone.");
  if (attrs.discipline <= 50) weak.push("Opposing plan: show early chase pitches; steal strikes with expansion.");
  if (attrs.power >= 80 && attrs.contact <= 60) weak.push("Opposing plan: do not miss middle — force him to earn damage.");

  if (weak.length === 0) weak.push("No glaring single-point weakness; requires complete pitching plan.");

  return weak;
}

function batterStrengths(attrs: any, common: any, arm: number, glove: number, pos: string) {
  const s: string[] = [];

  if (attrs.power >= 85) s.push("Game-changing raw power; mistakes turn into multi-run swings.");
  else if (attrs.power >= 75) s.push("Above-average power; consistent extra-base threat.");

  if (attrs.contact >= 80) s.push("Elite bat-to-ball; hard to put away.");
  else if (attrs.contact >= 70) s.push("Plus contact foundation; high floor for average/OBP.");

  if (attrs.discipline >= 75) s.push("Advanced approach; controls at-bats and sees pitches.");
  else if (attrs.discipline >= 65) s.push("Solid strike-zone awareness; takes walks when pitched around.");

  if (common.athleticism >= 85) s.push("Plus-plus athlete; adds value on bases and range.");
  else if (common.athleticism >= 75) s.push("Above-average runner; can add doubles/steals value.");

  if (pos === "CF" || pos === "SS" || pos === "C") s.push(`Defensive premium at ${pos}; roster flexibility multiplier.`);
  if (glove >= 75) s.push("Positive defender; saves runs and holds lineup value during slumps.");
  if (arm >= 75) s.push("Cannon arm; deters extra bases and helps defensive alignment.");

  return s;
}

function describeBatter(player: Player, latents: PlayerLatents): PlayerIdentity {
  const attrs = getBatterAttributes(player);
  const common = latents.common;
  const fielding = assignFieldingPositions(latents) as any;

  const pos = typeof fielding?.primary === "string" ? fielding.primary : "LF";
  const arm = safeNumber(fielding?.ratings?.arm ?? fielding?.arm);
  const glove = safeNumber(fielding?.ratings?.fielding ?? fielding?.fielding);

  const stage = careerStage(player);

  // Headline
  let headline = `Balanced ${pos}`;
  if (attrs.power >= 80) headline = `Middle-of-the-Order ${pos}`;
  else if (attrs.contact >= 75) headline = `Contact-Oriented ${pos}`;
  else if (attrs.discipline >= 75) headline = `Patient ${pos}`;

  // Tags
  const tags: string[] = [pos, stage.label];

  pushIf(tags, attrs.power >= 85, "70-Grade Power");
  pushIf(tags, attrs.contact >= 80, "Elite Contact");
  pushIf(tags, attrs.discipline >= 75, "Advanced Discipline");
  pushIf(tags, common.athleticism >= 80, "Plus Athlete");
  pushIf(tags, common.volatility >= 70, "High Variance");
  pushIf(tags, glove >= 75, "Plus Defender");
  pushIf(tags, arm >= 75, "Cannon Arm");

  // Summary
  const summary = [
    `Offense: power ${tier(attrs.power)}, contact ${tier(attrs.contact)}, discipline ${tier(attrs.discipline)}.`,
    `Athleticism: ${tier(common.athleticism)}.`,
    `Defense at ${pos}: glove ${tier(glove)}, arm ${tier(arm)}.`,
  ].join(" ");

  // Strength/weakness/usage/risk
  const strengths = batterStrengths(attrs, common, arm, glove, pos);
  const weaknesses = batterWeaknessGameplan(attrs);
  const usage = batterRoleAndUsage(attrs, common);

  const risk: string[] = [];
  pushIf(risk, common.volatility >= 70, "Risk: performance swings; value can spike or crater by month.");
  pushIf(risk, attrs.contact <= 50, "Risk: whiff-driven floor; can become replacement-level if approach slips.");
  pushIf(risk, pos === "LF" && glove <= 45, "Risk: corner-only + poor glove reduces roster tolerance for slumps.");
  risk.push(`Career stage: ${stage.note}.`);

  // Contract analysis
  const contract: string[] = [];
  const c = getContract(player);
  const impact = batterImpactScore(attrs, glove, pos);

  if (!c) {
    contract.push("Contract: not generated yet.");
  } else {
    const band = contractBand(c.aav);
    contract.push(`Contract: ${c.years}y @ ${fmtMoney(c.aav)} AAV (${fmtMoney(c.total)} total).`);
    contract.push(`Cost tier: ${band}. Estimated impact score: ${impact.toFixed(1)}.`);

    // crude value language
    if (impact >= 80 && c.aav <= 12) contract.push("Value: team-friendly — star impact at mid-market cost.");
    else if (impact >= 70 && c.aav <= 6) contract.push("Value: bargain — this is how contenders get unfair.");
    else if (impact <= 55 && c.aav >= 18) contract.push("Value: overpay risk — consider moving salary or limiting role.");
    else contract.push("Value: roughly market-aligned for role.");
  }

  // GM notes
  const gmNotes: string[] = [];
  if (attrs.power >= 80 && attrs.discipline <= 50) gmNotes.push("GM note: don’t overpay for hot streaks — weigh volatility heavily.");
  if (attrs.contact >= 75 && attrs.discipline >= 70) gmNotes.push("GM note: playoff profile — approach travels, floor holds.");
  if (pos === "CF" || pos === "SS" || pos === "C") gmNotes.push("GM note: premium position leverage in trades (scarcity).");
  if (common.athleticism >= 80) gmNotes.push("GM note: adds hidden runs via range + bases; boosts team ceiling.");
  if (gmNotes.length === 0) gmNotes.push("GM note: role/value depends on team context; prioritize fit and cost control.");

  // Final overview string (human readable)
  const overview = `${headline}. ${summary}`;

  return {
    headline,
    tags,
    summary,
    report: { overview, strengths, weaknesses, usage, risk, contract, gmNotes },
  };
}

/* ==============================================
   PITCHER SCOUTING
============================================== */

function pitcherImpactScore(attrs: any, common: any) {
  let base = 0.4 * attrs.stuff + 0.35 * attrs.control + 0.25 * attrs.movement;
  if (attrs.stamina >= 75) base += 3; // starter value bump
  if (common.consistency >= 70) base += 2; // durability-ish
  return base;
}

function pitcherRoleAndUsage(attrs: any, common: any) {
  const usage: string[] = [];
  const starter = attrs.stamina >= 75;

  if (starter && attrs.stuff >= 80 && attrs.control >= 65) usage.push("Role: rotation leader traits; build staff around him.");
  else if (starter) usage.push("Role: starter; projects as innings provider / mid-rotation stabilizer.");
  else if (attrs.stuff >= 80) usage.push("Role: late-inning reliever; leverage usage recommended.");
  else usage.push("Role: reliever / swingman; protect him from repeated high-leverage exposure.");

  if (attrs.control <= 45) usage.push("Usage: short stints; avoid inherited runners (walk risk).");
  if (attrs.movement <= 50) usage.push("Usage: avoid predictable counts; protect against lift.");
  if (common.volatility >= 70) usage.push("Usage: matchup-based; don’t assume week-to-week reliability.");

  return usage;
}

function pitcherWeaknessGameplan(attrs: any) {
  const weak: string[] = [];

  if (attrs.control <= 50) weak.push("Command risk: free passes create big innings.");
  if (attrs.movement <= 50) weak.push("Contact quality risk: flatter shape; mistakes get punished.");
  if (attrs.stuff <= 55) weak.push("Bat-missing ceiling limited; needs defense + sequencing.");

  if (attrs.control <= 50) weak.push("Opposing plan: take pitches, run counts, force him into the zone.");
  if (attrs.movement <= 55) weak.push("Opposing plan: lift-friendly approach; hunt mistakes up.");
  if (weak.length === 0) weak.push("No obvious hole; must win via disciplined at-bats and timing.");

  return weak;
}

function pitcherStrengths(attrs: any, common: any) {
  const s: string[] = [];

  if (attrs.stuff >= 85) s.push("Elite bat-missing stuff; strikeout engine.");
  else if (attrs.stuff >= 75) s.push("Plus stuff; can overpower lineups when ahead.");

  if (attrs.control >= 75) s.push("Advanced command; limits free bases and controls damage.");
  else if (attrs.control >= 65) s.push("Solid strike throwing; workable floor.");

  if (attrs.movement >= 75) s.push("Wipeout movement; suppresses barrels and hard contact.");

  if (attrs.stamina >= 75) s.push("Starter build; can turn lineup over multiple times.");
  else s.push("Relief profile; plays up in shorter bursts.");

  if (common.consistency >= 75) s.push("Durability edge; fewer blowups and steadier workload.");

  return s;
}

function describePitcher(player: Player, latents: PlayerLatents): PlayerIdentity {
  const attrs = getPitcherAttributes(player);
  const common = latents.common;
  const stage = careerStage(player);

  // Headline
  let headline = "Pitcher";
  if (attrs.stuff >= 80 && attrs.control >= 70) headline = "Power Ace Profile";
  else if (attrs.control >= 75) headline = "Command-First Pitcher";
  else if (attrs.stuff >= 75) headline = "High-Velocity Arm";
  else headline = attrs.stamina >= 75 ? "Back-End Starter" : "Relief Arm";

  // Tags
  const tags: string[] = [stage.label];
  pushIf(tags, attrs.stamina >= 75, "Starter Profile");
  pushIf(tags, attrs.stuff >= 85, "Elite Stuff");
  pushIf(tags, attrs.control >= 75, "Advanced Command");
  pushIf(tags, attrs.movement >= 75, "Wipeout Movement");
  pushIf(tags, common.volatility >= 70, "High Variance");

  // Summary
  const summary = [
    `Arsenal: stuff ${tier(attrs.stuff)}, movement ${tier(attrs.movement)}.`,
    `Command: ${tier(attrs.control)}.`,
    `Role: ${attrs.stamina >= 75 ? "starter" : "reliever"}.`,
  ].join(" ");

  const strengths = pitcherStrengths(attrs, common);
  const weaknesses = pitcherWeaknessGameplan(attrs);
  const usage = pitcherRoleAndUsage(attrs, common);

  const risk: string[] = [];
  pushIf(risk, common.volatility >= 70, "Risk: volatile outcomes; command/stuff can fluctuate.");
  pushIf(risk, attrs.control <= 50, "Risk: walk-driven blowups; hard to stabilize late in games.");
  pushIf(risk, attrs.stamina >= 75 && attrs.stuff <= 60, "Risk: starter workload without carrying weapon; may get exposed 3rd time through.");
  risk.push(`Career stage: ${stage.note}.`);

  const contract: string[] = [];
  const c = getContract(player);
  const impact = pitcherImpactScore(attrs, common);

  if (!c) {
    contract.push("Contract: not generated yet.");
  } else {
    const band = contractBand(c.aav);
    contract.push(`Contract: ${c.years}y @ ${fmtMoney(c.aav)} AAV (${fmtMoney(c.total)} total).`);
    contract.push(`Cost tier: ${band}. Estimated impact score: ${impact.toFixed(1)}.`);

    if (impact >= 80 && c.aav <= 12) contract.push("Value: team-friendly — frontline traits at non-frontline cost.");
    else if (impact >= 70 && c.aav <= 6) contract.push("Value: bargain — surplus value arm (moveable asset).");
    else if (impact <= 55 && c.aav >= 18) contract.push("Value: overpay risk — consider bullpen shift or salary dump.");
    else contract.push("Value: roughly market-aligned for role.");
  }

  const gmNotes: string[] = [];
  if (attrs.control >= 75 && attrs.stamina >= 75) gmNotes.push("GM note: rotation stabilizer — high playoff utility.");
  if (attrs.stuff >= 85 && attrs.stamina < 75) gmNotes.push("GM note: leverage weapon — shorten games in October.");
  if (attrs.control <= 50) gmNotes.push("GM note: don’t pay saves premium; profile is noisy year-to-year.");
  if (gmNotes.length === 0) gmNotes.push("GM note: value depends on team defense + usage discipline.");

  const overview = `${headline}. ${summary}`;

  return {
    headline,
    tags,
    summary,
    report: { overview, strengths, weaknesses, usage, risk, contract, gmNotes },
  };
}

/* ==============================================
   MAIN ENTRY
============================================== */

export function describePlayer(player: Player): PlayerIdentity {
  if (!player.latents) {
    return {
      headline: "Unknown Profile",
      tags: [],
      summary: "Unknown player profile",
      report: {
        overview: "No scouting report available.",
        strengths: [],
        weaknesses: [],
        usage: [],
        risk: [],
        contract: ["Contract: unknown."],
        gmNotes: [],
      },
    };
  }

  if (player.latents.batter || player.role === "BAT") {
    return describeBatter(player, player.latents);
  }

  return describePitcher(player, player.latents);
}
