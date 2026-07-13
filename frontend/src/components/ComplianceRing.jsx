import React from "react";

function gradient(pass, partial, notMet) {
  const total = pass + partial + notMet;
  if (!total) return "conic-gradient(#E0E6EF 0deg 360deg)";
  const stops = [];
  let cur = 0;
  const add = (color, count) => {
    if (!count) return;
    const end = cur + (count / total) * 360;
    stops.push(`${color} ${cur}deg ${end}deg`);
    cur = end;
  };
  add("#22c55e", pass);
  add("#f59e0b", partial);
  add("#ef4444", notMet);
  return `conic-gradient(${stops.join(", ")})`;
}

const SIZES = {
  sm: { outer: 40, inset: 8 },
  md: { outer: 80, inset: 14 },
  lg: { outer: 140, inset: 22 },
};

export default function ComplianceRing({ pass = 0, partial = 0, notMet = 0, size = "md", bg = "#fff" }) {
  const { outer, inset } = SIZES[size] || SIZES.md;
  const total = pass + partial + notMet;
  const score = total > 0 ? Math.round((pass + partial * 0.5) / total * 100) : null;

  return (
    <div style={{ position: "relative", width: outer, height: outer, flexShrink: 0 }}>
      <div style={{ width: outer, height: outer, borderRadius: "50%", background: gradient(pass, partial, notMet), transform: "rotate(-90deg)" }} />
      <div style={{
        position: "absolute", top: inset, left: inset, right: inset, bottom: inset,
        background: bg, borderRadius: "50%",
        display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column",
      }}>
        {score !== null && size !== "sm" && (
          <>
            <span style={{ fontSize: size === "lg" ? 26 : 15, fontWeight: 800, color: "#0E2D52", lineHeight: 1 }}>{score}%</span>
            {size === "lg" && (
              <span style={{ fontSize: 8, fontWeight: 700, color: "#8A9AB5", textTransform: "uppercase", letterSpacing: "0.07em", marginTop: 3 }}>Readiness</span>
            )}
          </>
        )}
      </div>
    </div>
  );
}
