"use client";

type Props = {
  label: string;
  value: string;
  sub?: string;
  delta?: number | null;
  accent?: "yt" | "apple" | "spotify" | "accent";
};

export function StatCard({ label, value, sub, delta, accent }: Props) {
  const bar =
    accent === "yt"
      ? "from-yt/90 to-yt/25"
      : accent === "apple"
        ? "from-apple/80 to-apple/20"
        : accent === "spotify"
          ? "from-spotify/90 to-spotify/25"
          : accent === "accent"
            ? "from-accent/90 to-accent/25"
            : "from-ink/30 to-ink/5";

  const deltaColor =
    delta === null || delta === undefined
      ? ""
      : delta > 0
        ? "text-spotify"
        : delta < 0
          ? "text-yt"
          : "text-ink-muted";

  return (
    <div className="card p-6 relative overflow-hidden group">
      <div
        className={`absolute left-0 top-3 bottom-3 w-0.5 rounded-full bg-gradient-to-b ${bar} opacity-90`}
      />
      <p className="label pl-3">{label}</p>
      <p className="pl-3 mt-2.5 text-3xl font-semibold tracking-tight text-ink tabular-nums">
        {value}
      </p>
      {delta !== null && delta !== undefined && (
        <p className={`pl-3 mt-2 text-sm font-medium tabular-nums ${deltaColor}`}>
          {delta > 0 ? "↑" : delta < 0 ? "↓" : "→"} {Math.abs(delta).toFixed(0)}% MoM
        </p>
      )}
      {sub && <p className="pl-3 mt-1.5 text-xs text-ink-faint leading-relaxed">{sub}</p>}
    </div>
  );
}
