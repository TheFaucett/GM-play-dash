import type { AtBat } from "../engine/types/atBat";

export function narrateAtBat(atBat: AtBat): string {
  const pitches = atBat.pitchIds.length;

  switch (atBat.result) {
    case "strikeout":
      return pitches >= 5
        ? "Strikes out after a long battle."
        : "Goes down on strikes.";

    case "walk":
      return pitches >= 6
        ? "Works a tough walk."
        : "Takes ball four.";

    case "single":
      return "Lines a single into the outfield.";

    case "double":
      return "Drives it into the gap for a double.";

    case "triple":
      return "Rips it into the corner — triple!";

    case "home_run":
      return "That one’s crushed — home run!";

    case "out":
      return "Retired on the play.";

    default:
      return "";
  }
}
