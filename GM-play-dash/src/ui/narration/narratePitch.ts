// src/ui/narration/narratePitch.ts

import type { Pitch } from "../../engine/types/pitch";
import type { AtBat } from "../../engine/types/atBat";

function pick(lines: string[]) {
  return lines[Math.floor(Math.random() * lines.length)];
}

export function narratePitch(
  pitch: Pitch,
  atBat: AtBat
): string {
  // -------------------------------
  // Balls
  // -------------------------------
  if (pitch.result === "ball") {
    return pick([
      "Misses just outside.",
      "Taken for a ball.",
      "Never tempted.",
      "Doesn’t get the call.",
    ]);
  }

  // -------------------------------
  // Strikes
  // -------------------------------
  if (pitch.result === "strike") {
    if (atBat.count.strikes === 2) {
      return pick([
        "Strike three!",
        "Frozen — strike three.",
        "He’s caught looking!",
      ]);
    }

    return pick([
      "Paints the corner.",
      "Called strike.",
      "Gets the zone.",
    ]);
  }

  // -------------------------------
  // Fouls
  // -------------------------------
  if (pitch.result === "foul") {
    if (atBat.count.strikes === 2) {
      return pick([
        "Stays alive.",
        "Just got a piece.",
        "Fights it off.",
      ]);
    }

    return pick([
      "Fouled straight back.",
      "Out of play.",
      "Tipped away.",
    ]);
  }

  // -------------------------------
  // Ball in play
  // -------------------------------
  if (pitch.result === "in_play") {
    return narrateBallInPlay(atBat);
  }

  return "Pitch delivered.";
}

function narrateBallInPlay(atBat: AtBat): string {
  const { result, play } = atBat;

  if (!play) {
    return "Ball put in play.";
  }

  switch (result) {
    case "out":
      return pick([
        play.note ?? "Routine play for the defense.",
        "Handled cleanly.",
        "Out recorded.",
      ]);

    case "single":
      return pick([
        "Base hit!",
        "Finds a hole.",
        "Drops in for a single.",
      ]);

    case "double":
      return pick([
        "Into the gap!",
        "That one rattles the wall.",
        "Stand-up double.",
      ]);

    case "triple":
      return pick([
        "Down the line!",
        "He’s flying around the bases!",
        "Triple!",
      ]);

    case "home_run":
      return pick([
        "That ball is gone!",
        "No doubt about it!",
        "Way back… gone!",
      ]);

    case "walk":
      return pick([
        "Ball four.",
        "Takes his base.",
        "Issued a free pass.",
      ]);

    case "strikeout":
      return pick([
        "Down on strikes.",
        "Strike three!",
        "Punch out.",
      ]);

    default:
      return result;
  }
}
