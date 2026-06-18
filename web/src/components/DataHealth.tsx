"use client";

import { useEffect, useState } from "react";
import type { DataCoverage } from "@/lib/analytics";
import { ANALYTICS_START_DATE, formatTimeUntil } from "@/lib/analytics";

type Props = {
  coverage: DataCoverage;
  periodLabel: string;
  filteredVideoCount: number;
};

function formatSyncTime(iso: string) {
  return new Date(iso).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function DataHealth({ coverage, periodLabel, filteredVideoCount }: Props) {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(id);
  }, []);

  const syncOk = coverage.lastSyncStatus === "success";
  const lastLabel = coverage.lastSyncAt ? formatSyncTime(coverage.lastSyncAt) : "Never";
  const nextDate = coverage.nextSyncAt ? new Date(coverage.nextSyncAt) : null;
  const nextLabel = nextDate ? formatSyncTime(coverage.nextSyncAt!) : "—";
  const countdown = nextDate ? formatTimeUntil(nextDate, now) : null;

  return (
    <div className="rounded-2xl border border-slate-border bg-gradient-to-r from-white via-white to-teal/[0.04] p-5 mb-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-teal">Data coverage</p>
          <p className="text-sm text-navy/60 mt-1">
            Synced from <span className="text-navy font-medium">{ANALYTICS_START_DATE}</span>
            {coverage.earliestMetric && coverage.latestMetric && (
              <>
                {" "}
                · metrics {coverage.earliestMetric} → {coverage.latestMetric}
              </>
            )}
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <div
            className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium ${
              syncOk ? "bg-teal/10 text-teal" : "bg-amber-50 text-amber-700"
            }`}
          >
            <span className={`w-1.5 h-1.5 rounded-full ${syncOk ? "bg-teal" : "bg-amber-500"}`} />
            Last sync · {lastLabel}
          </div>
          {nextDate && (
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium bg-navy/5 text-navy/80 border border-slate-border">
              <span className="w-1.5 h-1.5 rounded-full bg-navy/30" />
              Next update · {nextLabel}
              {countdown && <span className="text-teal font-semibold">({countdown})</span>}
            </div>
          )}
        </div>
      </div>

      <p className="text-[11px] text-navy/45 mt-3">
        Auto-sync runs every {coverage.syncIntervalHours} hours when{" "}
        <code className="text-navy/60 bg-slate-wash px-1 rounded">scripts/scheduler.py</code> or GitHub Actions is
        active. Dashboard refresh only reloads from Supabase.
      </p>

      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3 mt-4">
        {[
          { label: "Videos in library", value: coverage.totalVideos.toLocaleString() },
          { label: "With plays (YTD)", value: coverage.videosWithPlays.toLocaleString() },
          { label: "Metric rows loaded", value: coverage.metricRows.toLocaleString() },
          { label: "Total plays (loaded)", value: Math.round(coverage.playEvents).toLocaleString() },
          { label: "In current view", value: filteredVideoCount.toLocaleString() },
          { label: "Period", value: periodLabel, small: true },
        ].map((stat) => (
          <div key={stat.label} className="rounded-xl bg-slate-wash/80 px-3 py-2.5 border border-slate-border/60">
            <p className="text-[10px] uppercase tracking-wider text-navy/45 font-medium">{stat.label}</p>
            <p className={`font-semibold text-navy mt-0.5 ${stat.small ? "text-xs leading-snug" : "text-lg"}`}>
              {stat.value}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
