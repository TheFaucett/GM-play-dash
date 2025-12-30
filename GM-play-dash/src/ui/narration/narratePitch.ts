import { pick } from "../../engine/utils/pick"; 
import type { AtBat } from "../../engine/types/atBat";
   

function narrateBallInPlay(atBat: AtBat): string {
  const { result, play } = atBat;

  const note =
    typeof play?.note === "string"
      ? play.note
      : undefined;

  switch (result) {
    case "out":
      return pick(
        [
          note,
          "Routine play for the defense.",
          "Handled cleanly.",
          "Out recorded.",
        ].filter(Boolean) as string[]
      );

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
      return "Ball put in play.";
  }
}
