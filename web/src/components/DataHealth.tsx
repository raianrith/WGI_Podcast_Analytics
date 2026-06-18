"use client";

import type { DataCoverage } from "@/lib/analytics";
import { ANALYTICS_START_DATE } from "@/lib/analytics";

type Props = {
  coverage: DataCoverage;
  periodLabel: string;
  filteredVideoCount: number;
};

export function DataHealth({ coverage, periodLabel, filteredVideoCount }: Props) {
  const syncOk = coverage.lastSyncStatus === "success";
  const syncTime = coverage.lastSyncAt
    ? new Date(coverage.lastSyncAt).toLocaleString(undefined, {
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
      })
    : "Never";

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
        <div
          className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium ${
            syncOk ? "bg-teal/10 text-teal" : "bg-amber-50 text-amber-700"
          }`}
        >
          <span className={`w-1.5 h-1.5 rounded-full ${syncOk ? "bg-teal" : "bg-amber-500"}`} />
          {syncOk ? "Live" : coverage.lastSyncStatus ?? "Unknown"} · {syncTime}
        </div>
      </div>

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
