// engine/sim/describePlayer.ts
// --------------------------------------------------
// PLAYER IDENTITY (ENRICHED, HUMAN-READABLE)
// Layer 2.5 — interpretation only
// --------------------------------------------------

import type { Player } from "../types/player";
import type { PlayerLatents } from "../types/playerLatents";

import {
  getBatterAttributes,
  getPitcherAttributes,
} from "./deriveAttributes";

import { assignFieldingPositions } from "./assignFieldingPositions";

/* ==============================================
   TYPES
============================================== */

export type PlayerIdentity = {
  headline: string;
  tags: string[];
  summary: string;
};

/* ==============================================
   SMALL HELPERS
============================================== */

function pushIf(tags: string[], condition: boolean, label: string) {
  if (condition) tags.push(label);
}

function safeNumber(v: unknown, fallback = 50): number {
  return typeof v === "number" ? v : fallback;
}

function join(parts: string[]): string {
  return parts.filter(Boolean).join(" ");
}

/* ==============================================
   CAREER STAGE / AGE LANGUAGE
============================================== */

function describeCareerStage(player: Player, tags: string[]): string {
  const age = player.age;

  if (age <= 21) {
    tags.push("Teen Prospect");
    return "teenage prospect";
  }

  if (age <= 24) {
    tags.push("Young Player");
    return "young player";
  }

  if (age <= 27) {
    tags.push("Prime-Age");
    return "prime-age player";
  }

  if (age <= 31) {
    tags.push("Veteran");
    return "veteran";
  }

  tags.push("Aging Veteran");
  return "aging veteran";
}

/* ==============================================
   BATTER IDENTITY
============================================== */

function describeBatter(
  player: Player,
  latents: PlayerLatents
): PlayerIdentity {
  const attrs = getBatterAttributes(player);
  const common = latents.common;
  const fielding = assignFieldingPositions(latents) as any;

  const tags: string[] = [];

  /* -------- POWER -------- */
  if (attrs.power >= 88) tags.push("70-Grade Power", "40–70 HR Ceiling");
  else if (attrs.power >= 80) tags.push("40–50 HR Power");
  else if (attrs.power >= 75) tags.push("Plus Power");
  else if (attrs.power <= 45) tags.push("Low Power Bat");

  /* -------- CONTACT -------- */
  if (attrs.contact >= 80) tags.push("Elite Contact");
  else if (attrs.contact >= 70) tags.push("Plus Contact");
  else if (attrs.contact <= 45) tags.push("High Whiff Risk");

  /* -------- DISCIPLINE -------- */
  pushIf(tags, attrs.discipline >= 75, "Advanced Plate Discipline");
  pushIf(tags, attrs.discipline <= 45, "Aggressive Approach");

  /* -------- ATHLETICISM / RUNNING -------- */
  pushIf(tags, common.athleticism >= 75, "Plus Runner");
  pushIf(tags, common.athleticism >= 85, "Excellent Baserunning");

  /* -------- VARIANCE / RISK -------- */
  pushIf(tags, common.volatility >= 70, "High Variance Bat");
  pushIf(tags, common.volatility <= 40, "Consistent Producer");

  /* -------- FIELDING -------- */
  const primaryPosition =
    typeof fielding?.primary === "string"
      ? fielding.primary
      : "LF";

  tags.push(primaryPosition);

  const arm = safeNumber(fielding?.ratings?.arm ?? fielding?.arm);
  const glove = safeNumber(fielding?.ratings?.fielding ?? fielding?.fielding);

  pushIf(tags, arm >= 75, "Cannon Arm");
  pushIf(tags, arm >= 65 && arm < 75, "Strong Arm");

  pushIf(tags, glove >= 75, "Plus Defender");
  pushIf(tags, glove <= 45, "Defensive Liability");

  /* -------- CAREER STAGE -------- */
  const careerPhrase = describeCareerStage(player, tags);

  /* -------- HEADLINE -------- */
  let headline = "Balanced " + primaryPosition;

  if (attrs.power >= 80) {
    headline = "Middle-of-the-Order " + primaryPosition;
  } else if (attrs.contact >= 75) {
    headline = "Contact-Oriented " + primaryPosition;
  }

  /* -------- SUMMARY -------- */

  const powerPhrase =
    attrs.power >= 88
      ? "40–70 HR masher"
      : attrs.power >= 80
      ? "plus-power bat"
      : attrs.contact >= 75
      ? "high-contact hitter"
      : "balanced bat";

  const speedPhrase =
    common.athleticism >= 85
      ? "excellent speed"
      : common.athleticism >= 72
      ? "good speed"
      : "";

  const armPhrase =
    arm >= 75
      ? "cannon arm"
      : arm >= 65
      ? "strong arm"
      : "";

  const riskPhrase =
    common.volatility >= 70
      ? "with volatile outcomes"
      : common.volatility <= 40
      ? "with a steady profile"
      : "";

  const summary = join([
    powerPhrase,
    speedPhrase && `with ${speedPhrase}`,
    armPhrase && `and a ${armPhrase}`,
    `in ${primaryPosition}`,
    `— ${careerPhrase}`,
    riskPhrase,
  ]);

  return { headline, tags, summary };
}

/* ==============================================
   PITCHER IDENTITY
============================================== */

function describePitcher(
  player: Player,
  latents: PlayerLatents
): PlayerIdentity {
  const attrs = getPitcherAttributes(player);
  const common = latents.common;

  const tags: string[] = [];

  /* -------- STUFF -------- */
  if (attrs.stuff >= 85) tags.push("Elite Stuff");
  else if (attrs.stuff >= 75) tags.push("Plus Stuff");

  /* -------- COMMAND -------- */
  pushIf(tags, attrs.control >= 75, "Advanced Command");
  pushIf(tags, attrs.control <= 45, "Wild Command");

  /* -------- MOVEMENT -------- */
  pushIf(tags, attrs.movement >= 75, "Wipeout Movement");

  /* -------- ROLE -------- */
  const isStarter = attrs.stamina >= 75;
  tags.push(isStarter ? "Starter Profile" : "Reliever Profile");

  /* -------- VARIANCE -------- */
  pushIf(tags, common.volatility >= 70, "High Variance Arm");
  pushIf(tags, common.volatility <= 40, "Reliable Inning-Eater");

  /* -------- CAREER STAGE -------- */
  const careerPhrase = describeCareerStage(player, tags);

  /* -------- HEADLINE -------- */
  let headline = "Pitcher";

  if (attrs.stuff >= 80 && attrs.control >= 70) {
    headline = "Power Ace Profile";
  } else if (attrs.control >= 75) {
    headline = "Command-First Pitcher";
  } else if (attrs.stuff >= 75) {
    headline = "High-Velocity Arm";
  } else {
    headline = "Back-End Pitcher";
  }

  /* -------- SUMMARY -------- */

  const stuffPhrase =
    attrs.stuff >= 85
      ? "power arm"
      : attrs.stuff >= 75
      ? "plus-stuff arm"
      : "average-stuff arm";

  const commandPhrase =
    attrs.control >= 75
      ? "with advanced command"
      : attrs.control <= 45
      ? "with shaky command"
      : "";

  const rolePhrase = isStarter ? "starter" : "reliever";

  const durabilityPhrase =
    common.consistency >= 75
      ? "durable"
      : common.consistency <= 45
      ? "inconsistent"
      : "";

  const summary = join([
    stuffPhrase,
    rolePhrase,
    commandPhrase,
    durabilityPhrase && `(${durabilityPhrase})`,
    `— ${careerPhrase}`,
  ]);

  return { headline, tags, summary };
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
    };
  }

  if (player.latents.batter || player.role === "BAT") {
    return describeBatter(player, player.latents);
  }

  return describePitcher(player, player.latents);
}
