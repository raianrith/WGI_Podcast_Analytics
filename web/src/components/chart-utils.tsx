"use client";

type TooltipItem = {
  dataKey?: string | number;
  name?: string;
  value?: number;
  color?: string;
};

export function NonZeroTooltip({
  active,
  payload,
  label,
  seriesLabels,
}: {
  active?: boolean;
  payload?: TooltipItem[];
  label?: string;
  seriesLabels: Record<string, string>;
}) {
  if (!active || !payload?.length) return null;

  const items = payload
    .filter((p) => typeof p.value === "number" && p.value > 0)
    .sort((a, b) => (b.value as number) - (a.value as number));

  if (items.length === 0) return null;

  return (
    <div className="rounded-xl border border-slate-border bg-white/95 backdrop-blur-sm shadow-lg px-4 py-3 text-sm max-w-xs">
      <p className="font-semibold text-navy mb-2">{label}</p>
      <ul className="space-y-1.5">
        {items.map((item) => (
          <li key={item.dataKey} className="flex items-start justify-between gap-3">
            <span className="flex items-center gap-2 text-navy/80 min-w-0">
              <span
                className="w-2 h-2 rounded-full shrink-0 mt-1.5"
                style={{ background: item.color }}
              />
              <span className="truncate">{seriesLabels[String(item.dataKey)] ?? item.name}</span>
            </span>
            <span className="font-semibold text-navy shrink-0">{item.value}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export const COLORS = ["#0D9488", "#1B2A41", "#2A3F5F", "#14B8A6", "#64748B", "#94A3B8", "#5EEAD4", "#334155"];
