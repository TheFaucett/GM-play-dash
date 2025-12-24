import type { RunnerState } from "../engine/types/halfInning";

type Props = {
  outs: number;
  runnerState: RunnerState;
};

export function BaseOutsPanel({ outs, runnerState }: Props) {
  const bases = {
    first: false,
    second: false,
    third: false,
  };

  switch (runnerState.type) {
    case "first":
      bases.first = true;
      break;
    case "second":
      bases.second = true;
      break;
    case "third":
      bases.third = true;
      break;
    case "first_second":
      bases.first = true;
      bases.second = true;
      break;
    case "first_third":
      bases.first = true;
      bases.third = true;
      break;
    case "second_third":
      bases.second = true;
      bases.third = true;
      break;
    case "loaded":
      bases.first = true;
      bases.second = true;
      bases.third = true;
      break;
  }

  return (
    <section
      style={{
        marginTop: 16,
        padding: 12,
        border: "1px solid #ccc",
        display: "inline-block",
      }}
    >
      <h4>Situation</h4>

      {/* Outs */}
      <div style={{ marginBottom: 10 }}>
        <strong>Outs:</strong>{" "}
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            style={{
              display: "inline-block",
              width: 10,
              height: 10,
              borderRadius: "50%",
              marginRight: 6,
              backgroundColor: i < outs ? "#000" : "#ddd",
            }}
          />
        ))}
      </div>

      {/* Bases (explicit diamond) */}
      <div style={{ textAlign: "center" }}>
        <Base active={bases.second} label="2B" />

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            marginTop: 6,
          }}
        >
          <Base active={bases.third} label="3B" />
          <Base active={bases.first} label="1B" />
        </div>
      </div>
    </section>
  );
}

function Base({ active, label }: { active: boolean; label: string }) {
  return (
    <div
      title={label}
      style={{
        width: 22,
        height: 22,
        backgroundColor: active ? "#000" : "#eee",
        border: "1px solid #555",
      }}
    />
  );
}
