import { useLeagueStore } from "./store/useLeagueStore";

export default function App() {
  const state = useLeagueStore((s) => s.state);
  const dispatch = useLeagueStore((s) => s.dispatch);

  const atBat =
    state && state.pointers.atBatId
      ? state.atBats[state.pointers.atBatId]
      : null;

  const lastPitch =
    state && Object.values(state.pitches).length
      ? Object.values(state.pitches).slice(-1)[0]
      : null;

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
            onClick={() =>
            dispatch({
            type: "ADVANCE_AT_BAT",
            })
            }
            disabled={!state.pointers.halfInningId}
          >
            Start / Advance At-Bat
          </button>

          {/* Current At-Bat */}
          {atBat && (
            <section style={{ marginTop: 20 }}>
              <h3>Current At-Bat</h3>

              <div>
                <strong>
                  Count: {atBat.count.balls}–
                  {atBat.count.strikes}
                </strong>
              </div>

              {atBat.result && (
                <div style={{ marginTop: 6 }}>
                  <strong>Result:</strong> {atBat.result}
                </div>
              )}
            </section>
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
            <h3>Call Pitch</h3>

            <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
              <button
                onClick={() =>
                  dispatch({
                    type: "CALL_PITCH",
                    payload: {
                      pitchType: "FB",
                      location: "high",
                      intent: "attack",
                    },
                  })
                }
                disabled={!state.pointers.atBatId}
              >
                FB ↑ Attack
              </button>

              <button
                onClick={() =>
                  dispatch({
                    type: "CALL_PITCH",
                    payload: {
                      pitchType: "SL",
                      location: "low",
                      intent: "paint",
                    },
                  })
                }
                disabled={!state.pointers.atBatId}
              >
                SL ↓ Paint
              </button>

              <button
                onClick={() =>
                  dispatch({
                    type: "CALL_PITCH",
                    payload: {
                      pitchType: "CH",
                      location: "middle",
                      intent: "waste",
                    },
                  })
                }
                disabled={!state.pointers.atBatId}
              >
                CH → Waste
              </button>
            </div>

            <div style={{ display: "flex", gap: 8 }}>
              <button
                onClick={() =>
                  dispatch({ type: "ADVANCE_AT_BAT" })
                }
              >
                Advance At-Bat
              </button>

              <button
                onClick={() =>
                  dispatch({ type: "ADVANCE_HALF_INNING" })
                }
              >
                Advance Inning
              </button>
            </div>
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
