"use client";

type Props = {
  label: string;
  value: string;
  sub?: string;
  delta?: number | null;
  deltaLabel?: string;
  accent?: boolean;
};

export function KpiCard({ label, value, sub, delta, deltaLabel, accent }: Props) {
  const deltaColor =
    delta === null || delta === undefined
      ? ""
      : delta > 0
        ? "text-teal"
        : delta < 0
          ? "text-red-500"
          : "text-navy/40";

  return (
    <div
      className={`card p-5 md:p-6 relative overflow-hidden ${
        accent ? "border-teal/30 bg-gradient-to-br from-white to-teal/[0.03]" : ""
      }`}
    >
      {accent && <div className="absolute left-0 top-0 bottom-0 w-1 bg-teal rounded-l-xl" />}
      <p className="kpi-label">{label}</p>
      <p className="kpi-value mt-2">{value}</p>
      {delta !== null && delta !== undefined && (
        <p className={`text-sm font-medium mt-1.5 ${deltaColor}`}>
          {delta > 0 ? "↑" : delta < 0 ? "↓" : "→"} {Math.abs(delta).toFixed(1)}%
          {deltaLabel && <span className="text-navy/40 font-normal ml-1">vs {deltaLabel}</span>}
        </p>
      )}
      {sub && <p className="text-xs text-navy/40 mt-1.5">{sub}</p>}
    </div>
  );
}
