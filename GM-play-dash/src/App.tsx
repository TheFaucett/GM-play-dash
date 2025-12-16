import { useLeagueStore } from "./store/useLeagueStore";

export default function App() {
  const state = useLeagueStore((s) => s.state);
  const dispatch = useLeagueStore((s) => s.dispatch);

  return (
    <div style={{ padding: 20, fontFamily: "system-ui, sans-serif" }}>
      <h1>Anchorage Arms</h1>

      {/* No league yet */}
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

      {/* League loaded */}
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

          {/* Debug info */}
          <pre
            style={{
              background: "#111",
              color: "#0f0",
              padding: 12,
              marginTop: 12,
            }}
          >
            {JSON.stringify(
              {
                pointers: state.pointers,
              },
              null,
              2
            )}
          </pre>

          {/* Current At-Bat */}
          {state.pointers.atBatId && (
            <section style={{ marginTop: 16 }}>
              <h3>Current At-Bat</h3>
              <pre
                style={{
                  background: "#111",
                  color: "#0f0",
                  padding: 12,
                }}
              >
                {JSON.stringify(
                  state.atBats[state.pointers.atBatId],
                  null,
                  2
                )}
              </pre>

              <div style={{ marginTop: 8 }}>
                <strong>
                  Count:{" "}
                  {state.atBats[state.pointers.atBatId].count.balls}–
                  {state.atBats[state.pointers.atBatId].count.strikes}
                </strong>
              </div>
            </section>
          )}

          {/* Controls */}
          <section style={{ display: "flex", gap: 8, marginTop: 16 }}>
            <button
              onClick={() =>
                dispatch({
                  type: "CALL_PITCH",
                  payload: {
                    pitchType: "FB",
                    location: "middle",
                    intent: "attack",
                  },
                })
              }
              disabled={!state.pointers.atBatId}
            >
              Call Pitch
            </button>

            <button
              onClick={() =>
                dispatch({
                  type: "ADVANCE_AT_BAT",
                })
              }
            >
              Advance At-Bat
            </button>

            <button
              onClick={() =>
                dispatch({
                  type: "ADVANCE_HALF_INNING",
                })
              }
            >
              Advance Inning
            </button>
          </section>
        </>
      )}
    </div>
  );
}
