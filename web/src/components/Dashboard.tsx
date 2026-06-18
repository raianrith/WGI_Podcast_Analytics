"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { format } from "date-fns";
import {
  ANALYTICS_START_DATE,
  CHANGEOVER_CHANNEL,
  aggregateKpis,
  buildPeriodWindow,
  channelBreakdown,
  dailyPlays,
  dataCoverage,
  fetchChannels,
  fetchMetrics,
  fetchProjects,
  fetchSyncRuns,
  fetchVideos,
  filterMetricsByVideos,
  filterVideos,
  getDateWindow,
  kpiDelta,
  metricsInRange,
  monthlyPlays,
  monthlyPlaysByVideo,
  periodComparisonChart,
  projectBreakdown,
  uniqueChannels,
  uniqueProjects,
  videoPerformance,
  videosGroupedByChannel,
  weeklyPlays,
  type ComparisonMode,
  type DateWindow,
  type PeriodPreset,
} from "@/lib/analytics";
import type { Channel, Project, SyncRun } from "@/lib/supabase";
import { ChangeOverSpotlight } from "./ChangeOverSpotlight";
import {
  BarRanking,
  ComparisonChart,
  PeriodTrendChart,
  PlaysChart,
  VideoMonthlyPlaysChart,
} from "./Charts";
import { DataHealth } from "./DataHealth";
import { FilterBar } from "./FilterBar";
import { KpiCard } from "./KpiCard";

type Tab = "overview" | "trends" | "channel-videos" | "videos" | "projects" | "channels";

const TABS: { id: Tab; label: string }[] = [
  { id: "overview", label: "Overview" },
  { id: "trends", label: "Trends" },
  { id: "channel-videos", label: "By Channel" },
  { id: "videos", label: "Videos" },
  { id: "projects", label: "Projects" },
  { id: "channels", label: "Channels" },
];

export default function Dashboard() {
  const [periodPreset, setPeriodPreset] = useState<PeriodPreset>("ytd");
  const [customStart, setCustomStart] = useState(ANALYTICS_START_DATE);
  const [customEnd, setCustomEnd] = useState(format(new Date(), "yyyy-MM-dd"));
  const [compareMode, setCompareMode] = useState<ComparisonMode>("none");
  const [projectFilter, setProjectFilter] = useState("all");
  const [channelFilter, setChannelFilter] = useState("all");
  const [tab, setTab] = useState<Tab>("overview");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [allVideos, setAllVideos] = useState<Awaited<ReturnType<typeof fetchVideos>>>([]);
  const [allMetrics, setAllMetrics] = useState<Awaited<ReturnType<typeof fetchMetrics>>>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [channels, setChannels] = useState<Channel[]>([]);
  const [syncRuns, setSyncRuns] = useState<SyncRun[]>([]);
  const [window, setWindow] = useState<DateWindow | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const base = getDateWindow(compareMode);
      const period =
        compareMode === "none" ? buildPeriodWindow(periodPreset, customStart, customEnd) : null;

      const effectiveWindow: DateWindow = period
        ? {
            ...base,
            currentStart: period.currentStart,
            currentEnd: period.currentEnd,
            fetchStart: period.fetchStart,
            fetchEnd: period.fetchEnd,
            label: period.label,
            previousStart: period.currentStart,
            previousEnd: period.currentEnd,
            previousLabel: "",
          }
        : base;

      setWindow(effectiveWindow);

      const [metrics, videoList, projectList, channelList, runs] = await Promise.all([
        fetchMetrics(effectiveWindow.fetchStart, effectiveWindow.fetchEnd),
        fetchVideos(),
        fetchProjects(),
        fetchChannels(),
        fetchSyncRuns(),
      ]);

      setAllMetrics(metrics);
      setAllVideos(videoList);
      setProjects(projectList);
      setChannels(channelList);
      setSyncRuns(runs);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load data");
    } finally {
      setLoading(false);
    }
  }, [compareMode, periodPreset, customStart, customEnd]);

  useEffect(() => {
    load();
  }, [load]);

  const filteredVideos = useMemo(
    () => filterVideos(allVideos, projectFilter, channelFilter),
    [allVideos, projectFilter, channelFilter]
  );

  const videoIds = useMemo(() => new Set(filteredVideos.map((v) => v.external_id)), [filteredVideos]);

  const filteredAllMetrics = useMemo(
    () => filterMetricsByVideos(allMetrics, videoIds),
    [allMetrics, videoIds]
  );

  const currentMetrics = useMemo(() => {
    if (!window) return [];
    return metricsInRange(filteredAllMetrics, window.currentStart, window.currentEnd);
  }, [filteredAllMetrics, window]);

  const previousMetrics = useMemo(() => {
    if (!window || compareMode === "none") return [];
    return metricsInRange(filteredAllMetrics, window.previousStart, window.previousEnd);
  }, [filteredAllMetrics, window, compareMode]);

  const kpis = useMemo(() => aggregateKpis(currentMetrics), [currentMetrics]);
  const prevKpis = useMemo(() => aggregateKpis(previousMetrics), [previousMetrics]);
  const coverage = useMemo(() => dataCoverage(allMetrics, allVideos, syncRuns), [allMetrics, allVideos, syncRuns]);

  const changeoverVideos = useMemo(
    () => allVideos.filter((v) => v.channel_name === CHANGEOVER_CHANNEL),
    [allVideos]
  );
  const changeoverIds = useMemo(() => new Set(changeoverVideos.map((v) => v.external_id)), [changeoverVideos]);
  const changeoverMetrics = useMemo(() => {
    if (!window) return [];
    return metricsInRange(
      filterMetricsByVideos(allMetrics, changeoverIds),
      window.currentStart,
      window.currentEnd
    );
  }, [allMetrics, changeoverIds, window]);
  const changeoverKpis = useMemo(() => aggregateKpis(changeoverMetrics), [changeoverMetrics]);
  const changeoverTop = useMemo(
    () => videoPerformance(changeoverMetrics, changeoverVideos).slice(0, 5),
    [changeoverMetrics, changeoverVideos]
  );

  const playsTrend = useMemo(() => dailyPlays(currentMetrics), [currentMetrics]);
  const weeklyTrend = useMemo(() => weeklyPlays(filteredAllMetrics), [filteredAllMetrics]);
  const monthlyTrend = useMemo(() => monthlyPlays(filteredAllMetrics), [filteredAllMetrics]);
  const monthlyByVideo = useMemo(
    () => monthlyPlaysByVideo(filteredAllMetrics, filteredVideos),
    [filteredAllMetrics, filteredVideos]
  );
  const projectData = useMemo(() => projectBreakdown(currentMetrics, filteredVideos), [currentMetrics, filteredVideos]);
  const channelData = useMemo(() => channelBreakdown(currentMetrics, filteredVideos), [currentMetrics, filteredVideos]);
  const videos = useMemo(() => videoPerformance(currentMetrics, filteredVideos), [currentMetrics, filteredVideos]);
  const channelVideoGroups = useMemo(
    () => videosGroupedByChannel(currentMetrics, filteredVideos),
    [currentMetrics, filteredVideos]
  );
  const comparisonData = useMemo(
    () => (compareMode !== "none" ? periodComparisonChart(currentMetrics, previousMetrics, compareMode) : []),
    [currentMetrics, previousMetrics, compareMode]
  );

  const projectOptions = useMemo(() => uniqueProjects(allVideos), [allVideos]);
  const channelOptions = useMemo(() => uniqueChannels(allVideos), [allVideos]);
  const isChangeOverFocused = channelFilter === CHANGEOVER_CHANNEL;

  const formatDuration = (s: number | null) => {
    if (!s) return "—";
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec.toString().padStart(2, "0")}`;
  };

  const compareLabel =
    window && compareMode !== "none" ? `${window.label} vs ${window.previousLabel}` : undefined;

  return (
    <div className="min-h-screen">
      <header className="relative overflow-hidden bg-navy-dark text-white">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_rgba(13,148,136,0.15),_transparent_50%)]" />
        <div className="relative max-w-7xl mx-auto px-6 py-8 md:py-10">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div>
              <p className="text-teal-light text-xs font-bold tracking-[0.2em] uppercase">Weidert Group</p>
              <h1 className="font-display text-3xl md:text-4xl mt-2">Wistia Analytics</h1>
              <p className="text-white/55 text-sm mt-2 max-w-lg">
                Video performance across channels — optimized for ChangeOver Podcast insights.
              </p>
            </div>
            <a
              href="https://www.weidert.com/"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex text-sm text-white/70 hover:text-white border border-white/15 px-4 py-2 rounded-xl transition backdrop-blur-sm"
            >
              weidert.com →
            </a>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 py-8">
        <FilterBar
          compareMode={compareMode}
          onCompareMode={setCompareMode}
          periodPreset={periodPreset}
          onPeriodPreset={setPeriodPreset}
          customStart={customStart}
          customEnd={customEnd}
          onCustomStart={setCustomStart}
          onCustomEnd={setCustomEnd}
          projectFilter={projectFilter}
          channelFilter={channelFilter}
          onProjectFilter={setProjectFilter}
          onChannelFilter={setChannelFilter}
          projectOptions={projectOptions}
          channelOptions={channelOptions}
          onClear={() => {
            setProjectFilter("all");
            setChannelFilter("all");
            setPeriodPreset("ytd");
          }}
          onRefresh={load}
          periodLabel={window?.label}
          compareLabel={compareLabel}
        />

        {error && (
          <div className="card p-4 mb-6 border-red-200 bg-red-50 text-red-800 text-sm">{error}</div>
        )}

        {loading ? (
          <div className="text-center py-24">
            <div className="inline-block w-8 h-8 border-2 border-teal/30 border-t-teal rounded-full animate-spin mb-4" />
            <p className="text-navy/40">Loading analytics…</p>
          </div>
        ) : (
          <>
            <DataHealth
              coverage={coverage}
              periodLabel={window?.label ?? "—"}
              filteredVideoCount={filteredVideos.length}
            />

            {!isChangeOverFocused && changeoverKpis.plays > 0 && (
              <ChangeOverSpotlight
                plays={changeoverKpis.plays}
                activeVideos={changeoverKpis.activeVideos}
                hoursWatched={changeoverKpis.hoursWatched}
                topVideos={changeoverTop}
                onFocus={() => {
                  setChannelFilter(CHANGEOVER_CHANNEL);
                  setTab("channel-videos");
                }}
                isFocused={false}
              />
            )}

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              <KpiCard
                label="Active Videos"
                value={kpis.activeVideos.toLocaleString()}
                delta={compareMode !== "none" ? kpiDelta(kpis.activeVideos, prevKpis.activeVideos).pct : null}
                deltaLabel={window?.previousLabel}
                accent={isChangeOverFocused}
              />
              <KpiCard
                label="Plays"
                value={kpis.plays.toLocaleString()}
                delta={compareMode !== "none" ? kpiDelta(kpis.plays, prevKpis.plays).pct : null}
                deltaLabel={window?.previousLabel}
                accent={isChangeOverFocused}
              />
              <KpiCard
                label="Page Loads"
                value={kpis.pageLoads.toLocaleString()}
                delta={compareMode !== "none" ? kpiDelta(kpis.pageLoads, prevKpis.pageLoads).pct : null}
                deltaLabel={window?.previousLabel}
              />
              <KpiCard
                label="Hours Watched"
                value={kpis.hoursWatched.toFixed(1)}
                sub={compareMode === "none" ? window?.label : undefined}
                delta={compareMode !== "none" ? kpiDelta(kpis.hoursWatched, prevKpis.hoursWatched).pct : null}
                deltaLabel={window?.previousLabel}
              />
            </div>

            <nav className="flex flex-wrap gap-1 mb-6 p-1 bg-slate-wash/80 rounded-2xl border border-slate-border w-fit">
              {TABS.map(({ id, label }) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setTab(id)}
                  className={tab === id ? "tab-active" : "tab-inactive"}
                >
                  {label}
                </button>
              ))}
            </nav>

            {tab === "overview" && (
              <div className="space-y-6">
                {compareMode !== "none" && window && (
                  <ComparisonChart
                    data={comparisonData}
                    title={`${compareMode === "wow" ? "Week" : "Month"} over ${compareMode === "wow" ? "Week" : "Month"}`}
                    currentLabel={window.label}
                    previousLabel={window.previousLabel}
                  />
                )}
                <div className="grid lg:grid-cols-2 gap-6">
                  <PlaysChart data={playsTrend} title={window?.label ?? "Daily Plays"} />
                  <BarRanking data={channelData} title="Plays by Channel" labelKey="channel" />
                </div>
              </div>
            )}

            {tab === "trends" && (
              <div className="space-y-6">
                <div className="grid lg:grid-cols-2 gap-6">
                  <PeriodTrendChart data={weeklyTrend} title="Weekly Plays" />
                  <PeriodTrendChart data={monthlyTrend} title="Monthly Plays" />
                </div>
                <VideoMonthlyPlaysChart
                  rows={monthlyByVideo.rows}
                  seriesKeys={monthlyByVideo.seriesKeys}
                  seriesLabels={monthlyByVideo.seriesLabels}
                />
                {compareMode !== "none" && window && (
                  <ComparisonChart
                    data={comparisonData}
                    title={`Period Comparison: ${window.label} vs ${window.previousLabel}`}
                    currentLabel={window.label}
                    previousLabel={window.previousLabel}
                  />
                )}
              </div>
            )}

            {tab === "channel-videos" && (
              <div className="space-y-6">
                {channelVideoGroups.length === 0 ? (
                  <p className="text-navy/50 text-center py-12 card">No videos with plays in this period.</p>
                ) : (
                  channelVideoGroups.map((group) => (
                    <div key={group.channel} className="card overflow-hidden">
                      <div className="px-6 py-5 bg-gradient-to-r from-slate-wash to-white border-b border-slate-border flex items-center justify-between">
                        <div>
                          <h3 className="font-display text-xl text-navy">{group.channel}</h3>
                          <p className="text-sm text-navy/50 mt-0.5">
                            {group.videos.length} episodes with plays
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-3xl font-semibold text-teal">{group.totalPlays.toLocaleString()}</p>
                          <p className="text-[10px] text-navy/45 uppercase tracking-widest">plays</p>
                        </div>
                      </div>
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="text-left text-[10px] uppercase tracking-widest text-navy/45 border-b border-slate-border bg-slate-wash/50">
                            <th className="px-6 py-3">#</th>
                            <th className="px-4 py-3">Episode</th>
                            <th className="px-4 py-3 text-right">Plays</th>
                            <th className="px-4 py-3 text-right">Loads</th>
                            <th className="px-4 py-3 text-right">Hours</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-border">
                          {group.videos.map((v, i) => (
                            <tr key={v.external_id} className="hover:bg-teal/[0.02] transition">
                              <td className="px-6 py-3.5 text-navy/35 font-medium">{i + 1}</td>
                              <td className="px-4 py-3.5 font-medium text-navy max-w-md">
                                {v.url ? (
                                  <a href={v.url} target="_blank" rel="noopener noreferrer" className="hover:text-teal line-clamp-2">
                                    {v.title}
                                  </a>
                                ) : (
                                  <span className="line-clamp-2">{v.title}</span>
                                )}
                              </td>
                              <td className="px-4 py-3.5 text-right font-semibold text-teal">{v.plays.toLocaleString()}</td>
                              <td className="px-4 py-3.5 text-right text-navy/70">{v.pageLoads.toLocaleString()}</td>
                              <td className="px-4 py-3.5 text-right text-navy/70">{v.hoursWatched.toFixed(1)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ))
                )}
              </div>
            )}

            {tab === "videos" && (
              <div className="card overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-border">
                  <h3 className="font-display text-lg text-navy">All videos with activity</h3>
                  <p className="text-xs text-navy/50 mt-1">Only episodes with at least one play or load</p>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-slate-wash/80 text-left text-[10px] uppercase tracking-widest text-navy/45">
                        <th className="px-6 py-3">Video</th>
                        <th className="px-4 py-3">Channel</th>
                        <th className="px-4 py-3 text-right">Plays</th>
                        <th className="px-4 py-3 text-right">Loads</th>
                        <th className="px-4 py-3 text-right">Hours</th>
                        <th className="px-4 py-3">Duration</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-border">
                      {videos.map((v) => (
                        <tr key={v.external_id} className="hover:bg-teal/[0.02]">
                          <td className="px-6 py-3 font-medium text-navy max-w-xs">
                            {v.url ? (
                              <a href={v.url} target="_blank" rel="noopener noreferrer" className="hover:text-teal line-clamp-2">
                                {v.title}
                              </a>
                            ) : (
                              <span className="line-clamp-2">{v.title}</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-navy/60 text-xs">{v.channel_name || "—"}</td>
                          <td className="px-4 py-3 text-right font-semibold">{v.plays.toLocaleString()}</td>
                          <td className="px-4 py-3 text-right">{v.pageLoads.toLocaleString()}</td>
                          <td className="px-4 py-3 text-right">{v.hoursWatched.toFixed(1)}</td>
                          <td className="px-4 py-3 text-navy/50">{formatDuration(v.duration_seconds)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {tab === "projects" && (
              <div className="grid lg:grid-cols-2 gap-6">
                <BarRanking data={projectData} title="Plays by Project" labelKey="project" />
                <div className="card overflow-hidden">
                  <h3 className="font-display text-lg text-navy p-6 pb-0">Projects</h3>
                  <table className="w-full text-sm mt-4">
                    <thead>
                      <tr className="text-left text-[10px] uppercase tracking-widest text-navy/45 border-b border-slate-border">
                        <th className="px-6 py-3">Project</th>
                        <th className="px-6 py-3 text-right">Videos</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-border">
                      {projects.map((p) => (
                        <tr key={p.external_id} className="hover:bg-slate-wash/50">
                          <td className="px-6 py-3">{p.name}</td>
                          <td className="px-6 py-3 text-right">{p.media_count}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {tab === "channels" && (
              <div className="grid lg:grid-cols-2 gap-6">
                <BarRanking data={channelData} title="Plays by Channel" labelKey="channel" />
                <div className="card overflow-hidden">
                  <h3 className="font-display text-lg text-navy p-6 pb-0">Channels</h3>
                  <table className="w-full text-sm mt-4">
                    <thead>
                      <tr className="text-left text-[10px] uppercase tracking-widest text-navy/45 border-b border-slate-border">
                        <th className="px-6 py-3">Channel</th>
                        <th className="px-6 py-3 text-right">Episodes</th>
                        <th className="px-6 py-3 text-right">Plays</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-border">
                      {channels.map((c) => {
                        const plays = channelData.find((d) => d.channel === c.name)?.plays ?? 0;
                        const featured = c.name === CHANGEOVER_CHANNEL;
                        return (
                          <tr
                            key={c.external_id}
                            className={featured ? "bg-teal/[0.04]" : "hover:bg-slate-wash/50"}
                          >
                            <td className="px-6 py-3 font-medium">
                              {c.name}
                              {featured && (
                                <span className="ml-2 text-[10px] uppercase tracking-wider text-teal font-bold">
                                  Featured
                                </span>
                              )}
                            </td>
                            <td className="px-6 py-3 text-right text-navy/60">{c.episode_count}</td>
                            <td className="px-6 py-3 text-right font-semibold text-teal">
                              {plays.toLocaleString()}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      <footer className="border-t border-slate-border mt-12 py-8 text-center text-xs text-navy/40">
        © {new Date().getFullYear()} Weidert Group · Synced from Wistia via Supabase
      </footer>
    </div>
  );
}
