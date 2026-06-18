"use client";

import {
  ANALYTICS_START_DATE,
  CHANGEOVER_CHANNEL,
  type ComparisonMode,
  type PeriodPreset,
} from "@/lib/analytics";

const PERIOD_OPTIONS: { id: PeriodPreset; label: string }[] = [
  { id: "7", label: "7 days" },
  { id: "14", label: "14 days" },
  { id: "30", label: "30 days" },
  { id: "90", label: "90 days" },
  { id: "180", label: "6 months" },
  { id: "ytd", label: "YTD 2026" },
  { id: "custom", label: "Custom" },
];

type Props = {
  compareMode: ComparisonMode;
  onCompareMode: (m: ComparisonMode) => void;
  periodPreset: PeriodPreset;
  onPeriodPreset: (p: PeriodPreset) => void;
  customStart: string;
  customEnd: string;
  onCustomStart: (v: string) => void;
  onCustomEnd: (v: string) => void;
  projectFilter: string;
  channelFilter: string;
  onProjectFilter: (v: string) => void;
  onChannelFilter: (v: string) => void;
  projectOptions: string[];
  channelOptions: string[];
  onClear: () => void;
  onRefresh: () => void;
  periodLabel?: string;
  compareLabel?: string;
};

export function FilterBar({
  compareMode,
  onCompareMode,
  periodPreset,
  onPeriodPreset,
  customStart,
  customEnd,
  onCustomStart,
  onCustomEnd,
  projectFilter,
  channelFilter,
  onProjectFilter,
  onChannelFilter,
  projectOptions,
  channelOptions,
  onClear,
  onRefresh,
  periodLabel,
  compareLabel,
}: Props) {
  const selectClass =
    "px-3 py-2 rounded-xl text-sm border border-slate-border bg-white text-navy focus:outline-none focus:ring-2 focus:ring-teal/30 min-w-[140px]";

  const chipClass = (active: boolean) =>
    `px-3.5 py-2 rounded-xl text-sm font-medium transition-all ${
      active
        ? "bg-navy text-white shadow-sm"
        : "bg-white border border-slate-border text-navy/70 hover:border-teal/40 hover:text-navy"
    }`;

  return (
    <div className="card p-5 md:p-6 mb-6 space-y-5">
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => onChannelFilter(CHANGEOVER_CHANNEL)}
          className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
            channelFilter === CHANGEOVER_CHANNEL
              ? "bg-teal text-white shadow-md shadow-teal/20"
              : "bg-teal/10 text-teal border border-teal/20 hover:bg-teal/15"
          }`}
        >
          ChangeOver Podcast
        </button>
        <button
          type="button"
          onClick={() => {
            onChannelFilter("all");
            onProjectFilter("all");
          }}
          className={chipClass(channelFilter === "all" && projectFilter === "all")}
        >
          All content
        </button>
      </div>

      <div className="grid lg:grid-cols-[auto_1fr] gap-4 items-start">
        <p className="text-[10px] font-bold uppercase tracking-widest text-navy/40 pt-2.5">Timeline</p>
        <div className="space-y-3">
          <div className="flex flex-wrap gap-2">
            {PERIOD_OPTIONS.map((p) => (
              <button
                key={p.id}
                type="button"
                disabled={compareMode !== "none"}
                onClick={() => onPeriodPreset(p.id)}
                className={`${chipClass(periodPreset === p.id && compareMode === "none")} disabled:opacity-40`}
              >
                {p.label}
              </button>
            ))}
          </div>

          {compareMode === "none" && periodPreset === "custom" && (
            <div className="flex flex-wrap items-center gap-3">
              <label className="flex items-center gap-2 text-sm text-navy/70">
                From
                <input
                  type="date"
                  min={ANALYTICS_START_DATE}
                  value={customStart}
                  onChange={(e) => onCustomStart(e.target.value)}
                  className={selectClass}
                />
              </label>
              <label className="flex items-center gap-2 text-sm text-navy/70">
                To
                <input
                  type="date"
                  value={customEnd}
                  onChange={(e) => onCustomEnd(e.target.value)}
                  className={selectClass}
                />
              </label>
            </div>
          )}

          {compareMode === "none" && periodLabel && (
            <p className="text-xs text-navy/50">
              Showing <span className="font-medium text-navy">{periodLabel}</span>
            </p>
          )}
        </div>
      </div>

      <div className="grid lg:grid-cols-[auto_1fr] gap-4 items-start border-t border-slate-border pt-5">
        <p className="text-[10px] font-bold uppercase tracking-widest text-navy/40 pt-2.5">Compare</p>
        <div className="flex flex-wrap gap-2 items-center">
          {(
            [
              { id: "none" as const, label: "Off" },
              { id: "wow" as const, label: "Week over week" },
              { id: "mom" as const, label: "Month over month" },
            ] as const
          ).map((m) => (
            <button key={m.id} type="button" onClick={() => onCompareMode(m.id)} className={chipClass(compareMode === m.id)}>
              {m.label}
            </button>
          ))}
          {compareMode !== "none" && compareLabel && (
            <span className="text-xs text-navy/50 ml-2">{compareLabel}</span>
          )}
        </div>
      </div>

      <div className="grid lg:grid-cols-[auto_1fr] gap-4 items-center border-t border-slate-border pt-5">
        <p className="text-[10px] font-bold uppercase tracking-widest text-navy/40">Scope</p>
        <div className="flex flex-wrap items-center gap-3">
          <select value={projectFilter} onChange={(e) => onProjectFilter(e.target.value)} className={selectClass}>
            <option value="all">All projects</option>
            {projectOptions.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
          <select value={channelFilter} onChange={(e) => onChannelFilter(e.target.value)} className={selectClass}>
            <option value="all">All channels</option>
            {channelOptions.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
          <button type="button" onClick={onClear} className="text-sm text-teal hover:underline px-2">
            Reset
          </button>
          <button
            type="button"
            onClick={onRefresh}
            className="ml-auto px-5 py-2.5 rounded-xl text-sm font-semibold bg-navy text-white hover:bg-navy-light transition shadow-sm"
          >
            Refresh data
          </button>
        </div>
      </div>
    </div>
  );
}
