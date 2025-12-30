// engine/debug/debugDescribePlayer.ts

import type { Player } from "../types/player";
import type { BatterLatents, PitcherLatents } from "../types/playerLatents";
import {
  getBatterAttributes,
  getPitcherAttributes,
} from "../sim/deriveAttributes";

function round(n: number) {
  return Math.round(n * 10) / 10;
}

function formatLatents(latents: Record<string, number> | undefined) {
  if (!latents) return "—";
  return Object.entries(latents)
    .map(([k, v]) => `${k}: ${round(v)}`)
    .join(", ");
}

export function debugDescribePlayer(player: Player): string {
  const lines: string[] = [];

  lines.push(`🧍 ${player.name}`);
  lines.push(
    `Age ${player.age} | ${player.handedness} | Role: ${player.role} | Level: ${player.level}`
  );
  lines.push(`Team: ${player.teamId}`);
  lines.push("");

  /* ===============================
     BATTER PROFILE
     =============================== */

  if (player.role === "BAT") {
    const batterAttrs = getBatterAttributes(player);
    const latents = player.latents as BatterLatents | undefined;

    lines.push("⚾ Batter Profile");
    lines.push(
      `Archetype: ${player.ratings.batterArchetype ?? "none"}`
    );

    lines.push(
      `Contact ${batterAttrs.contact}, Power ${batterAttrs.power}, Discipline ${batterAttrs.discipline}, Vision ${batterAttrs.vision}`
    );

    lines.push("Latents:");
    lines.push(`  ${formatLatents(latents)}`);
  }

  /* ===============================
     PITCHER PROFILE
     =============================== */

  if (player.role === "SP" || player.role === "RP" || player.role === "CL") {
    const pitcherAttrs = getPitcherAttributes(player);
    const latents = player.latents as PitcherLatents | undefined;

    lines.push("⚾ Pitcher Profile");
    lines.push(
      `Archetype: ${player.ratings.pitcherArchetype ?? "none"}`
    );

    lines.push(
      `Stuff ${pitcherAttrs.stuff}, Control ${pitcherAttrs.control}, Movement ${pitcherAttrs.movement}, Stamina ${pitcherAttrs.stamina}`
    );

    lines.push("Latents:");
    lines.push(`  ${formatLatents(latents)}`);
  }

  /* ===============================
     FIELDING / ATHLETICISM
     =============================== */

  if (player.ratings.speed || player.ratings.fielding || player.ratings.arm) {
    lines.push("");
    lines.push("🧤 Fielding");
    lines.push(
      `Speed ${player.ratings.speed ?? "—"}, Fielding ${player.ratings.fielding ?? "—"}, Arm ${player.ratings.arm ?? "—"}`
    );
  }

  /* ===============================
     HEALTH / STATE
     =============================== */

  lines.push("");
  lines.push(
    `Status — Fatigue: ${round(player.fatigue)}, Health: ${round(player.health)}`
  );

  return lines.join("\n");
}
