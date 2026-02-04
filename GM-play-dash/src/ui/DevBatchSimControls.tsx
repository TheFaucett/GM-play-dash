import React from "react";
import type { LeagueState } from "../engine/types/league";
import type { EntityId } from "../engine/types/base";

import { simGameBatch } from "../engine/sim/simGameBatch";

type Props = {
  state: LeagueState;
  setState: React.Dispatch<React.SetStateAction<LeagueState | null>>;
};

export function DevBatchSimControls({ state, setState }: Props) {
  function simNextGameBatch() {
    setState((prev) => {
      if (!prev) return prev;

      const seasonId = prev.pointers.seasonId;
      if (!seasonId) {
        console.warn("❌ No seasonId in pointers");
        return prev;
      }

      const season = prev.seasons[seasonId];
      if (!season) {
        console.warn("❌ Season not found:", seasonId);
        return prev;
      }

      /* --------------------------------------------
         1️⃣ INITIALIZE SEASON (ONCE)
      -------------------------------------------- */
      if (season.status === "scheduled") {
        console.log("📅 Initializing season (schedule only)");

        const gameIds: EntityId[] = [];

        for (let i = 0; i < season.teamIds.length; i++) {
          for (let j = i + 1; j < season.teamIds.length; j++) {
            for (let k = 0; k < 6; k++) {
              gameIds.push(
                `game_${season.teamIds[i]}_${season.teamIds[j]}_${k}` as EntityId
              );
            }
          }
        }

        return {
            ...prev,
            pointers: {
                ...prev.pointers, // ✅ PRESERVE POINTERS
            },
            seasons: {
                ...prev.seasons,
                [seasonId]: {
                ...season,
                status: "active",
                gameIds,
                currentGameIndex: 0,
                },
            },
        };
      }

      /* --------------------------------------------
         2️⃣ ENSURE REMAINING GAMES
      -------------------------------------------- */
      const gameId = season.gameIds[season.currentGameIndex];

      if (!gameId) {
        console.warn("❌ No remaining games", {
          currentGameIndex: season.currentGameIndex,
          totalGames: season.gameIds.length,
        });
        return prev;
      }

      console.log("⚡ BATCH SIM GAME", {
        seasonId,
        gameIndex: season.currentGameIndex,
        gameId,
      });

      /* --------------------------------------------
         3️⃣ SIM ONE GAME (BATCH)
      -------------------------------------------- */
      const next = simGameBatch(prev, seasonId, gameId);
      const game = next.games[gameId];

      if (!game) {
        console.error("❌ Game missing after batch sim:", gameId);
        return next;
      }

      console.group("📊 BATCH GAME RESULT");
      console.log("Game ID:", gameId);
      console.log("Status:", game.status);
      console.log("Final Score:", game.score);
      console.log("Half Innings:", game.halfInningIds.length);

      if (game.boxScore) {
        console.log("Winner:", game.boxScore.summary.winnerTeamId);
        console.log(
          "Sample Batting Lines:",
          Object.values(game.boxScore.batting).slice(0, 5)
        );
      } else {
        console.warn("⚠️ No boxScore produced");
      }

      console.groupEnd();

      return next;
    });
  }

  return (
    <section style={{ marginTop: 16 }}>
      <h4>⚡ Batch Sim (DEV)</h4>

      <button onClick={simNextGameBatch}>
        Sim Next Game (Batch)
      </button>

      <div style={{ marginTop: 6, fontSize: 12, color: "#666" }}>
        • First click initializes schedule  
        • Each click simulates exactly ONE game  
        • No pitch-by-pitch UI updates
      </div>
    </section>
  );
}
