import { useEffect } from "react";
import { useLeagueStore } from "./store/useLeagueStore";
import { PitchControlPanel } from "./ui/PitchControlPanel";
import { PitchLogPanel } from "./ui/PitchLogPanel";
import { narrateAtBat } from "./ui/narrateAtBat";
import { BaseOutsPanel } from "./ui/BaseOutsPanel";

export default function App() {
  const state = useLeagueStore((s) => s.state);
  const dispatch = useLeagueStore((s) => s.dispatch);

  const halfInning =
    state && state.pointers.halfInningId
      ? state.halfInnings[state.pointers.halfInningId]
      : null;

  const atBat =
    state && state.pointers.atBatId
      ? state.atBats[state.pointers.atBatId]
      : null;

  const lastPitch =
    state && Object.values(state.pitches).length
      ? Object.values(state.pitches).slice(-1)[0]
      : null;

  // -------------------------------------------------
  // AUTO-DISPATCH ENGINE PENDING ACTIONS (STEP 2)
  // -------------------------------------------------
  useEffect(() => {
    if (!state?.pendingAction) return;
    console.log(
      "[AUTO EFFECT FIRED]",
      state.pendingAction.type,
      "atBatId:",
      state.pointers.atBatId
    );
    console.log(
      "[AUTO] Dispatching pending action:",
      state.pendingAction.type
    );

    dispatch(state.pendingAction);
  }, [state?.pendingAction, dispatch]);

  // -------------------------------------------------
  // FILTER PITCH LOG EVENTS
  // -------------------------------------------------
  const pitchLog =
    state?.log.filter((e) => e.type === "PITCH") ?? [];

  return (
    <div style={{ padding: 20, fontFamily: "system-ui, sans-serif" }}>
      <h1>Anchorage Arms — Pitch Lab</h1>

      {/* No league */}
      {!state && (
        <button
          onClick={() =>
            dispatch({
              type: "NEW_LEAGUE",
              payload: { seed: 12345, year: 2025 },
            })
          }
        >
          New League
        </button>
      )}

      {state && (
        <>
          {/* Start Game */}
          <button
            onClick={() =>
              dispatch({
                type: "START_GAME",
                payload: {
                  seasonId: "season_1",
                  homeTeamId: "home",
                  awayTeamId: "away",
                },
              })
            }
          >
            Start Game
          </button>

          <button
            onClick={() => dispatch({ type: "ADVANCE_AT_BAT" })}
            disabled={!state.pointers.halfInningId}
          >
            Start / Advance At-Bat
          </button>

          <button
            onClick={() => dispatch({ type: "SIM_HALF_INNING" })}
            disabled={!state.pointers.halfInningId}
          >
            Sim Half Inning
          </button>

          {/* Current At-Bat */}
          {atBat && (
            <section style={{ marginTop: 20 }}>
              <h3>Current At-Bat</h3>
              <strong>
                Count: {atBat.count.balls}–
                {atBat.count.strikes}
              </strong>

              {atBat.result && (
                <div style={{ marginTop: 6 }}>
                  <strong>Result:</strong> {atBat.result}
                </div>
              )}
            </section>
          )}

          {/* Bases + Outs */}
          {halfInning && (
            <BaseOutsPanel
              outs={halfInning.outs}
              runnerState={halfInning.runnerState}
            />
          )}

          {/* Last Pitch */}
          {lastPitch && (
            <section
              style={{
                marginTop: 16,
                padding: 12,
                border: "1px solid #ccc",
              }}
            >
              <h4>Last Pitch</h4>
              <div>Type: {lastPitch.pitchType}</div>
              <div>Location: {lastPitch.location}</div>
              <div>Intent: {lastPitch.intent}</div>
              <div>
                <strong>Outcome:</strong> {lastPitch.result}
              </div>
            </section>
          )}

          {/* Pitch Controls */}
          <section style={{ marginTop: 20 }}>
            <PitchControlPanel
              disabled={!state.pointers.atBatId}
              onCallPitch={(payload) =>
                dispatch({
                  type: "CALL_PITCH",
                  payload,
                })
              }
            />
          </section>

          {/* Pitch Log */}
          {state.pointers.halfInningId && (
            <PitchLogPanel
              pitches={Object.values(state.pitches)}
              halfInning={
                state.halfInnings[state.pointers.halfInningId]
              }
            />
          )}

          {/* At-Bat Narration */}
          {atBat?.result && (
            <div
              style={{
                marginTop: 12,
                fontStyle: "italic",
                color: "#333",
              }}
            >
              {narrateAtBat(atBat)}
            </div>
          )}

          {/* Text Play-by-Play */}
          <section
            style={{
              marginTop: 20,
              padding: 12,
              border: "1px solid #ccc",
            }}
          >
            <h3>Play Log</h3>
            <ul
              style={{
                fontFamily: "monospace",
                fontSize: 13,
                paddingLeft: 20,
              }}
            >
              {pitchLog.map((e) => (
                <li key={e.id}>{e.description}</li>
              ))}
            </ul>
          </section>

          {/* Debug */}
          <details style={{ marginTop: 20 }}>
            <summary>Debug State</summary>
            <pre
              style={{
                background: "#111",
                color: "#0f0",
                padding: 12,
                maxHeight: 300,
                overflow: "auto",
              }}
            >
              {JSON.stringify(state.pointers, null, 2)}
            </pre>
          </details>
        </>
      )}
    </div>
  );
}
