"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  channelShare,
  fetchAllMonths,
  fetchAppleEpisodes,
  fetchSpotifyDailyImpressions,
  fetchSpotifyEpisodes,
  fetchYoutubeVideos,
  momChange,
  monthLabel,
  num,
  shortMonth,
  sumRange,
  trendSeries,
} from "@/lib/analytics";
import { lastDayOfMonth, previousCalendarMonth } from "@/lib/monthEnd";
import type {
  AppleEpisodeMetric,
  MonthlyMetric,
  SpotifyDailyImpression,
  SpotifyEpisodeMetric,
  YoutubeVideoMetric,
} from "@/lib/supabase";
import {
  DualBarChart,
  HighlightCard,
  PlatformTrendChart,
  ShareDonut,
  SingleLineChart,
  TotalTrendChart,
} from "./Charts";
import { StatCard } from "./StatCard";

type Tab = "overview" | "youtube" | "apple" | "spotify";

const TABS: { id: Tab; label: string }[] = [
  { id: "overview", label: "Overview" },
  { id: "youtube", label: "YouTube" },
  { id: "spotify", label: "Spotify" },
  { id: "apple", label: "Apple" },
];

export default function Dashboard() {
  const [rows, setRows] = useState<MonthlyMetric[]>([]);
  const [ytVideos, setYtVideos] = useState<YoutubeVideoMetric[]>([]);
  const [appleEps, setAppleEps] = useState<AppleEpisodeMetric[]>([]);
  const [spotifyEps, setSpotifyEps] = useState<SpotifyEpisodeMetric[]>([]);
  const [spotifyImpressions, setSpotifyImpressions] = useState<SpotifyDailyImpression[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>("overview");
  const [ytSubTab, setYtSubTab] = useState<"videos" | "clips">("videos");
  /** Focus month (month_end date). Charts include history through this month. */
  const [selectedMonth, setSelectedMonth] = useState<string>("");
  /** How much history before the selected month to show in charts */
  const [historyWindow, setHistoryWindow] = useState<number | "all">(12);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const months = await fetchAllMonths();
      setRows(months);
      const lastMonthEnd = lastDayOfMonth(previousCalendarMonth());
      setSelectedMonth((prev) => {
        if (prev && months.some((m) => m.month_end === prev)) return prev;
        if (months.some((m) => m.month_end === lastMonthEnd)) return lastMonthEnd;
        const throughLast = months.filter((m) => m.month_end <= lastMonthEnd);
        if (throughLast.length) return throughLast[throughLast.length - 1].month_end;
        return months.length ? months[months.length - 1].month_end : "";
      });
      const impressions = await fetchSpotifyDailyImpressions().catch(
        () => [] as SpotifyDailyImpression[]
      );
      setSpotifyImpressions(impressions);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load data");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // Load episode/video detail for the selected month only
  useEffect(() => {
    if (!selectedMonth) {
      setYtVideos([]);
      setAppleEps([]);
      setSpotifyEps([]);
      return;
    }
    let cancelled = false;
    (async () => {
      const [yt, apple, sp] = await Promise.all([
        fetchYoutubeVideos(selectedMonth).catch(() => [] as YoutubeVideoMetric[]),
        fetchAppleEpisodes(selectedMonth).catch(() => [] as AppleEpisodeMetric[]),
        fetchSpotifyEpisodes(selectedMonth).catch(() => [] as SpotifyEpisodeMetric[]),
      ]);
      if (!cancelled) {
        setYtVideos(yt);
        setAppleEps(apple);
        setSpotifyEps(sp);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [selectedMonth]);

  const monthOptions = useMemo(
    () => [...rows].sort((a, b) => b.month_end.localeCompare(a.month_end)),
    [rows]
  );

  /** All months through the selected month (history preserved, nothing after selection) */
  const throughSelected = useMemo(() => {
    if (!selectedMonth) return [];
    return rows.filter((r) => r.month_end <= selectedMonth);
  }, [rows, selectedMonth]);

  /** Chart window: last N months ending at selected, or all history through selected */
  const filtered = useMemo(() => {
    if (!throughSelected.length) return [];
    if (historyWindow === "all") return throughSelected;
    return throughSelected.slice(-historyWindow);
  }, [throughSelected, historyWindow]);

  const selected = useMemo(
    () => throughSelected.find((r) => r.month_end === selectedMonth) ?? null,
    [throughSelected, selectedMonth]
  );

  const prev = useMemo(() => {
    if (!selectedMonth) return null;
    const idx = throughSelected.findIndex((r) => r.month_end === selectedMonth);
    return idx > 0 ? throughSelected[idx - 1] : null;
  }, [throughSelected, selectedMonth]);

  const trend = useMemo(() => trendSeries(filtered), [filtered]);
  const share = useMemo(() => channelShare(sumRange(selected ? [selected] : [])), [selected]);

  const ytSeries = useMemo(
    () =>
      filtered.map((r) => ({
        month: shortMonth(r.month_end),
        views: num(r.yt_views),
        unique: num(r.yt_unique_viewers),
        hours: num(r.yt_watch_time_hrs),
        pct: num(r.yt_avg_pct_viewed),
        clips: num(r.yt_clip_views),
      })),
    [filtered]
  );

  const appleSeries = useMemo(
    () =>
      filtered.map((r) => ({
        month: shortMonth(r.month_end),
        plays: num(r.apple_plays),
        listeners: num(r.apple_listeners),
        engaged: num(r.apple_engaged_listeners),
        followers: num(r.apple_followers),
        netNew: num(r.apple_net_new_followers),
        hours: num(r.apple_hours_listened),
      })),
    [filtered]
  );

  const spotifySeries = useMemo(
    () =>
      filtered.map((r) => ({
        month: shortMonth(r.month_end),
        plays: num(r.spotify_plays),
        streams: num(r.spotify_streams_60s),
        listeners: num(r.spotify_listeners),
        followers: num(r.spotify_followers),
        hours: num(r.spotify_hours_played),
        netNew: num(r.spotify_net_new_followers),
      })),
    [filtered]
  );

  const spotifyImpressionSeries = useMemo(() => {
    if (!selectedMonth) return [];
    const start = `${selectedMonth.slice(0, 8)}01`;
    const end = selectedMonth;
    return spotifyImpressions
      .filter((d) => d.impression_date >= start && d.impression_date <= end)
      .map((d) => ({
        month: d.impression_date.slice(5),
        date: d.impression_date,
        impressions: num(d.impressions),
      }));
  }, [spotifyImpressions, selectedMonth]);

  const impressionsInView = useMemo(
    () => spotifyImpressionSeries.reduce((s, d) => s + d.impressions, 0),
    [spotifyImpressionSeries]
  );

  const selectedPlays = selected
    ? num(selected.yt_views) + num(selected.apple_plays) + num(selected.spotify_plays)
    : 0;
  const prevPlays = prev
    ? num(prev.yt_views) + num(prev.apple_plays) + num(prev.spotify_plays)
    : null;

  const latest = selected;

  const ytPlaylistVideos = useMemo(
    () => ytVideos.filter((v) => !v.is_clip),
    [ytVideos]
  );
  const ytPlaylistClips = useMemo(
    () => ytVideos.filter((v) => v.is_clip),
    [ytVideos]
  );

  const clipStats = useMemo(() => {
    const rows = ytPlaylistClips;
    return {
      views: rows.reduce((s, v) => s + num(v.views), 0),
      unique: rows.reduce((s, v) => s + num(v.unique_viewers), 0),
      hours: rows.reduce((s, v) => s + num(v.watch_time_hrs), 0),
      impressions: rows.reduce((s, v) => s + num(v.impressions), 0),
    };
  }, [ytPlaylistClips]);

  return (
    <div className="min-h-screen">
      <header className="relative overflow-hidden bg-ink text-white border-b border-white/[0.06]">
        <div
          className="pointer-events-none absolute inset-0 opacity-40"
          aria-hidden
          style={{
            background:
              "radial-gradient(ellipse 60% 80% at 85% 20%, rgba(196,92,38,0.25), transparent 55%), radial-gradient(ellipse 40% 60% at 10% 100%, rgba(29,185,84,0.12), transparent 50%)",
          }}
        />
        <div className="relative max-w-7xl mx-auto px-6 py-10 md:py-12 flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-accent-soft">
              Weidert Group
            </p>
            <h1 className="font-display text-3xl md:text-4xl font-medium tracking-tight mt-2.5">
              ChangeOver Podcast
            </h1>
            <p className="text-white/50 text-sm mt-3 max-w-xl leading-relaxed">
              Monthly performance across YouTube, Apple Podcasts, and Spotify.
            </p>
          </div>
          <Link
            href="/admin"
            className="inline-flex text-sm border border-white/15 bg-white/[0.04] px-4 py-2.5 rounded-xl text-white/75 hover:text-white hover:border-white/30 hover:bg-white/[0.08] transition-all duration-200"
          >
            Admin →
          </Link>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 py-10">
        <div className="flex flex-wrap items-center gap-4 mb-8">
          <div className="seg-track">
            {TABS.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setTab(t.id)}
                className={`seg-item ${tab === t.id ? "seg-item-active" : ""}`}
              >
                {t.label}
              </button>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-3 ml-auto">
            <label className="flex items-center gap-2.5 text-sm text-ink-muted">
              <span className="label !mb-0">Focus month</span>
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="field-input !py-2 !w-auto min-w-[148px] font-semibold cursor-pointer"
              >
                {monthOptions.map((m) => (
                  <option key={m.month_end} value={m.month_end}>
                    {monthLabel(m.month_end)}
                  </option>
                ))}
              </select>
            </label>

            <div className="seg-track">
              {([6, 12, "all"] as const).map((r) => (
                <button
                  key={String(r)}
                  type="button"
                  onClick={() => setHistoryWindow(r)}
                  className={`seg-item-accent ${historyWindow === r ? "seg-item-accent-active" : ""}`}
                >
                  {r === "all" ? "All history" : `${r} mo history`}
                </button>
              ))}
            </div>
          </div>
        </div>

        {error && (
          <div className="card p-5 mb-8 !border-red-200/80 !bg-red-50/90 text-red-800 text-sm shadow-soft">
            {error}
            <p className="mt-2 text-xs text-red-700/80">
              Make sure you ran <code className="bg-red-100/80 px-1.5 py-0.5 rounded-md text-[11px]">supabase/schema.sql</code> in Supabase.
            </p>
          </div>
        )}

        {loading ? (
          <div className="text-center py-28 text-ink-muted text-sm tracking-wide">Loading…</div>
        ) : rows.length === 0 ? (
          <div className="card p-14 text-center">
            <h2 className="font-display text-2xl font-medium tracking-tight mb-2">No months yet</h2>
            <p className="text-ink-muted text-sm mb-8 max-w-md mx-auto leading-relaxed">
              Enter monthly metrics in the admin panel to get started.
            </p>
            <Link href="/admin" className="btn-primary">
              Open admin
            </Link>
          </div>
        ) : (
          <>
            {latest && (
              <p className="text-xs text-ink-faint mb-6 tracking-wide">
                Showing <span className="font-semibold text-ink">{monthLabel(latest.month_end)}</span>
                {prev && (
                  <>
                    {" "}
                    · MoM vs <span className="font-medium text-ink-soft">{monthLabel(prev.month_end)}</span>
                  </>
                )}
                {" · "}
                charts include {filtered.length} month{filtered.length === 1 ? "" : "s"} through that date
                {historyWindow !== "all" ? ` (${historyWindow} mo window)` : " (full history)"}
              </p>
            )}

            {tab === "overview" && latest && (
              <div className="space-y-8">
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
                  <StatCard
                    label="Total plays"
                    value={Math.round(selectedPlays).toLocaleString()}
                    sub={`${monthLabel(latest.month_end)} · YT + Apple + Spotify`}
                    accent="accent"
                    delta={prevPlays !== null ? momChange(selectedPlays, prevPlays) : null}
                  />
                  <StatCard
                    label="YouTube views"
                    value={num(latest.yt_views).toLocaleString()}
                    accent="yt"
                    delta={prev ? momChange(num(latest.yt_views), num(prev.yt_views)) : null}
                  />
                  <StatCard
                    label="Apple plays"
                    value={num(latest.apple_plays).toLocaleString()}
                    accent="apple"
                    delta={prev ? momChange(num(latest.apple_plays), num(prev.apple_plays)) : null}
                  />
                  <StatCard
                    label="Spotify plays"
                    value={num(latest.spotify_plays).toLocaleString()}
                    accent="spotify"
                    delta={prev ? momChange(num(latest.spotify_plays), num(prev.spotify_plays)) : null}
                  />
                </div>

                <div className="grid lg:grid-cols-3 gap-6">
                  <div className="lg:col-span-2">
                    <PlatformTrendChart data={trend} />
                  </div>
                  <ShareDonut data={share} />
                </div>

                <TotalTrendChart data={trend} />

                {latest && (
                  <div className="grid md:grid-cols-3 gap-5">
                    <HighlightCard
                      title="Top this month · YouTube"
                      items={[
                        { label: "Episode", value: latest.yt_top_episode || "—" },
                        { label: "Clip", value: latest.yt_top_clip || "—" },
                      ]}
                    />
                    <HighlightCard
                      title="Top this month · Apple"
                      items={[{ label: "Episode", value: latest.apple_top_episode || "—" }]}
                    />
                    <HighlightCard
                      title="Top this month · Spotify"
                      items={[{ label: "Episode", value: latest.spotify_top_episode || "—" }]}
                    />
                  </div>
                )}
              </div>
            )}

            {tab === "youtube" && latest && (
              <div className="space-y-8">
                <div className="seg-track w-fit">
                  {(
                    [
                      { id: "videos" as const, label: "Playlist Videos" },
                      { id: "clips" as const, label: "Playlist Clips" },
                    ] as const
                  ).map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setYtSubTab(t.id)}
                      className={`seg-item ${ytSubTab === t.id ? "seg-item-active" : ""}`}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>

                {ytSubTab === "videos" && (
                  <>
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
                      <StatCard label="Views" value={num(latest.yt_views).toLocaleString()} accent="yt" delta={prev ? momChange(num(latest.yt_views), num(prev.yt_views)) : null} />
                      <StatCard label="Unique viewers*" value={num(latest.yt_unique_viewers).toLocaleString()} accent="yt" delta={prev ? momChange(num(latest.yt_unique_viewers), num(prev.yt_unique_viewers)) : null} sub="*Sum of video-level uniques from CSV" />
                      <StatCard label="Watch time (hrs)" value={num(latest.yt_watch_time_hrs).toFixed(1)} accent="yt" delta={prev ? momChange(num(latest.yt_watch_time_hrs), num(prev.yt_watch_time_hrs)) : null} />
                      <StatCard label="Avg % viewed" value={`${num(latest.yt_avg_pct_viewed).toFixed(1)}%`} accent="yt" sub={`Avg duration ${num(latest.yt_avg_view_duration_min).toFixed(1)} min`} />
                    </div>
                    <div className="grid lg:grid-cols-2 gap-6">
                      <DualBarChart title="Views vs unique viewers" data={ytSeries} aKey="views" bKey="unique" aName="Views" bName="Unique" aColor="#E11D48" bColor="#FDA4AF" />
                      <SingleLineChart title="Watch time (hours)" data={ytSeries} dataKey="hours" color="#E11D48" />
                    </div>
                    <SingleLineChart title="Average % viewed" data={ytSeries} dataKey="pct" color="#C45C26" />

                    {ytPlaylistVideos.length > 0 && (
                      <div className="card overflow-hidden">
                        <div className="px-7 py-5 border-b border-paper-hairline bg-paper-warm/50">
                          <h3 className="font-display text-xl font-medium tracking-tight">
                            Playlist videos · {monthLabel(latest.month_end)}
                          </h3>
                          <p className="text-xs text-ink-muted mt-1.5">From the playlist videos CSV upload</p>
                        </div>
                        <div className="overflow-x-auto">
                          <table className="w-full text-sm">
                            <thead>
                              <tr className="text-left text-[10px] font-semibold uppercase tracking-[0.14em] text-ink-muted bg-paper-warm/80">
                                <th className="px-7 py-3.5">#</th>
                                <th className="px-4 py-3.5">Video</th>
                                <th className="px-4 py-3.5 text-right">Views</th>
                                <th className="px-4 py-3.5 text-right">Unique</th>
                                <th className="px-4 py-3.5 text-right">Watch hrs</th>
                                <th className="px-4 py-3.5 text-right">Avg %</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-paper-hairline">
                              {ytPlaylistVideos
                                .filter((v) => v.views > 0)
                                .slice(0, 25)
                                .map((v, i) => (
                                  <tr key={v.video_id} className="hover:bg-paper-warm/60 transition-colors duration-150">
                                    <td className="px-7 py-3.5 text-ink-faint tabular-nums">{i + 1}</td>
                                    <td className="px-4 py-3.5 font-medium max-w-md text-ink-soft">
                                      <span className="line-clamp-2">{v.title}</span>
                                    </td>
                                    <td className="px-4 py-3.5 text-right font-semibold text-yt tabular-nums">{v.views}</td>
                                    <td className="px-4 py-3.5 text-right tabular-nums">{v.unique_viewers}</td>
                                    <td className="px-4 py-3.5 text-right tabular-nums">{Number(v.watch_time_hrs).toFixed(2)}</td>
                                    <td className="px-4 py-3.5 text-right tabular-nums">{Number(v.avg_pct_viewed).toFixed(1)}%</td>
                                  </tr>
                                ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}

                    <HighlightCard title="Top episode" items={[{ label: monthLabel(latest.month_end), value: latest.yt_top_episode || "—" }]} />
                  </>
                )}

                {ytSubTab === "clips" && (
                  <>
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
                      <StatCard
                        label="Clip views"
                        value={(ytPlaylistClips.length ? clipStats.views : num(latest.yt_clip_views)).toLocaleString()}
                        accent="yt"
                        delta={prev ? momChange(num(latest.yt_clip_views), num(prev.yt_clip_views)) : null}
                      />
                      <StatCard
                        label="Unique viewers*"
                        value={clipStats.unique.toLocaleString()}
                        accent="yt"
                        sub="*Sum of clip-level uniques from CSV"
                      />
                      <StatCard
                        label="Watch time (hrs)"
                        value={clipStats.hours.toFixed(2)}
                        accent="yt"
                      />
                      <StatCard
                        label="Impressions"
                        value={clipStats.impressions.toLocaleString()}
                        accent="yt"
                      />
                    </div>
                    <SingleLineChart title="Monthly clip views" data={ytSeries} dataKey="clips" color="#E11D48" />

                    {ytPlaylistClips.length > 0 ? (
                      <div className="card overflow-hidden">
                        <div className="px-7 py-5 border-b border-paper-hairline bg-paper-warm/50">
                          <h3 className="font-display text-xl font-medium tracking-tight">
                            Playlist clips · {monthLabel(latest.month_end)}
                          </h3>
                          <p className="text-xs text-ink-muted mt-1.5">From the playlist clips CSV upload</p>
                        </div>
                        <div className="overflow-x-auto">
                          <table className="w-full text-sm">
                            <thead>
                              <tr className="text-left text-[10px] font-semibold uppercase tracking-[0.14em] text-ink-muted bg-paper-warm/80">
                                <th className="px-7 py-3.5">#</th>
                                <th className="px-4 py-3.5">Clip</th>
                                <th className="px-4 py-3.5 text-right">Views</th>
                                <th className="px-4 py-3.5 text-right">Unique</th>
                                <th className="px-4 py-3.5 text-right">Impressions</th>
                                <th className="px-4 py-3.5 text-right">Watch hrs</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-paper-hairline">
                              {ytPlaylistClips
                                .filter((v) => v.views > 0 || v.impressions > 0)
                                .slice(0, 40)
                                .map((v, i) => (
                                  <tr key={v.video_id} className="hover:bg-paper-warm/60 transition-colors duration-150">
                                    <td className="px-7 py-3.5 text-ink-faint tabular-nums">{i + 1}</td>
                                    <td className="px-4 py-3.5 font-medium max-w-md text-ink-soft">
                                      <span className="line-clamp-2">{v.title}</span>
                                    </td>
                                    <td className="px-4 py-3.5 text-right font-semibold text-yt tabular-nums">{v.views}</td>
                                    <td className="px-4 py-3.5 text-right tabular-nums">{v.unique_viewers}</td>
                                    <td className="px-4 py-3.5 text-right tabular-nums">{v.impressions}</td>
                                    <td className="px-4 py-3.5 text-right tabular-nums">{Number(v.watch_time_hrs).toFixed(3)}</td>
                                  </tr>
                                ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    ) : (
                      <div className="card p-8 text-sm text-ink-muted">
                        No clips for {monthLabel(latest.month_end)} yet. Upload the playlist clips CSV in Admin.
                      </div>
                    )}

                    <HighlightCard title="Top clip" items={[{ label: monthLabel(latest.month_end), value: latest.yt_top_clip || "—" }]} />
                  </>
                )}
              </div>
            )}

            {tab === "apple" && latest && (
              <div className="space-y-8">
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
                  <StatCard label="Plays" value={num(latest.apple_plays).toLocaleString()} accent="apple" delta={prev ? momChange(num(latest.apple_plays), num(prev.apple_plays)) : null} />
                  <StatCard label="Listeners*" value={num(latest.apple_listeners).toLocaleString()} accent="apple" delta={prev ? momChange(num(latest.apple_listeners), num(prev.apple_listeners)) : null} sub="*Sum of episode Unique Listeners from CSV" />
                  <StatCard label="Engaged listeners*" value={num(latest.apple_engaged_listeners).toLocaleString()} accent="apple" sub="*Sum of episode Unique Engaged Listeners" />
                  <StatCard label="Followers" value={num(latest.apple_followers).toLocaleString()} accent="apple" sub={`Hours ${num(latest.apple_hours_listened).toFixed(1)}`} />
                </div>
                <SingleLineChart title="Monthly plays" data={appleSeries} dataKey="plays" color="#525252" />
                <div className="grid lg:grid-cols-2 gap-6">
                  <SingleLineChart title="Follower count" data={appleSeries} dataKey="followers" color="#737373" />
                  <SingleLineChart title="Hours listened" data={appleSeries} dataKey="hours" color="#A3A3A3" />
                </div>
                <HighlightCard title="Top episode" items={[{ label: monthLabel(latest.month_end), value: latest.apple_top_episode || "—" }]} />

                {appleEps.length > 0 && (
                  <div className="card overflow-hidden">
                    <div className="px-7 py-5 border-b border-paper-hairline bg-paper-warm/50">
                      <h3 className="font-display text-xl font-medium tracking-tight">
                        Episodes · {monthLabel(latest.month_end)}
                      </h3>
                      <p className="text-xs text-ink-muted mt-1.5">From the Apple Podcasts Connect CSV upload</p>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="text-left text-[10px] font-semibold uppercase tracking-[0.14em] text-ink-muted bg-paper-warm/80">
                            <th className="px-7 py-3.5">#</th>
                            <th className="px-4 py-3.5">Episode</th>
                            <th className="px-4 py-3.5 text-right">Plays</th>
                            <th className="px-4 py-3.5 text-right">Listeners</th>
                            <th className="px-4 py-3.5 text-right">Engaged</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-paper-hairline">
                          {appleEps
                            .filter((e) => e.plays > 0 || e.unique_listeners > 0)
                            .slice(0, 20)
                            .map((e, i) => (
                              <tr key={e.episode_id} className="hover:bg-paper-warm/60 transition-colors duration-150">
                                <td className="px-7 py-3.5 text-ink-faint tabular-nums">{i + 1}</td>
                                <td className="px-4 py-3.5 font-medium max-w-md text-ink-soft">
                                  <span className="line-clamp-2">{e.episode_title}</span>
                                </td>
                                <td className="px-4 py-3.5 text-right font-semibold tabular-nums">{e.plays}</td>
                                <td className="px-4 py-3.5 text-right tabular-nums">{e.unique_listeners}</td>
                                <td className="px-4 py-3.5 text-right tabular-nums">{e.unique_engaged_listeners}</td>
                              </tr>
                            ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            )}

            {tab === "spotify" && latest && (
              <div className="space-y-8">
                <div className="grid grid-cols-2 lg:grid-cols-5 gap-5">
                  <StatCard label="Plays" value={num(latest.spotify_plays).toLocaleString()} accent="spotify" delta={prev ? momChange(num(latest.spotify_plays), num(prev.spotify_plays)) : null} />
                  <StatCard label="Streams >60s" value={num(latest.spotify_streams_60s).toLocaleString()} accent="spotify" />
                  <StatCard label="Listeners*" value={num(latest.spotify_listeners).toLocaleString()} accent="spotify" sub="*Sum of episode audience_size from CSV" />
                  <StatCard label="Followers" value={num(latest.spotify_followers).toLocaleString()} accent="spotify" sub={`Hours ${num(latest.spotify_hours_played).toFixed(1)}`} />
                  <StatCard
                    label="Impressions"
                    value={(spotifyImpressionSeries.length ? impressionsInView : num(latest.spotify_impressions)).toLocaleString()}
                    accent="spotify"
                    sub={spotifyImpressionSeries.length ? `${monthLabel(latest.month_end)} · daily CSV` : monthLabel(latest.month_end)}
                    delta={prev ? momChange(num(latest.spotify_impressions), num(prev.spotify_impressions)) : null}
                  />
                </div>
                <div className="grid lg:grid-cols-2 gap-6">
                  <DualBarChart title="Plays vs streams (>60s)" subtitle="Streams = meaningful listens" data={spotifySeries} aKey="plays" bKey="streams" aName="Plays" bName="Streams >60s" aColor="#1DB954" bColor="#86EFAC" />
                  <SingleLineChart title="Monthly listeners" data={spotifySeries} dataKey="listeners" color="#1DB954" />
                </div>
                <SingleLineChart
                  title="Daily impressions"
                  subtitle={
                    spotifyImpressionSeries.length
                      ? `${monthLabel(latest.month_end)} · ${spotifyImpressionSeries.length} days · ${impressionsInView.toLocaleString()} total`
                      : `No daily data for ${monthLabel(latest.month_end)} — upload impressions CSV in Admin`
                  }
                  data={spotifyImpressionSeries}
                  dataKey="impressions"
                  color="#15803D"
                />
                <div className="grid lg:grid-cols-2 gap-6">
                  <SingleLineChart title="Follower count" data={spotifySeries} dataKey="followers" color="#1DB954" />
                  <SingleLineChart title="Hours played" data={spotifySeries} dataKey="hours" color="#1DB954" />
                </div>

                {spotifyEps.length > 0 && (
                  <div className="card overflow-hidden">
                    <div className="px-7 py-5 border-b border-paper-hairline bg-paper-warm/50">
                      <h3 className="font-display text-xl font-medium tracking-tight">
                        Episodes · {monthLabel(latest.month_end)}
                      </h3>
                      <p className="text-xs text-ink-muted mt-1.5">From the latest Spotify episode CSV upload</p>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="text-left text-[10px] font-semibold uppercase tracking-[0.14em] text-ink-muted bg-paper-warm/80">
                            <th className="px-7 py-3.5">#</th>
                            <th className="px-4 py-3.5">Episode</th>
                            <th className="px-4 py-3.5 text-right">Plays</th>
                            <th className="px-4 py-3.5 text-right">Streams</th>
                            <th className="px-4 py-3.5 text-right">Audience</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-paper-hairline">
                          {spotifyEps
                            .filter((e) => e.plays > 0 || e.streams > 0)
                            .slice(0, 20)
                            .map((e, i) => (
                              <tr key={e.episode_name} className="hover:bg-paper-warm/60 transition-colors duration-150">
                                <td className="px-7 py-3.5 text-ink-faint tabular-nums">{i + 1}</td>
                                <td className="px-4 py-3.5 font-medium max-w-md text-ink-soft">
                                  <span className="line-clamp-2">{e.episode_name}</span>
                                </td>
                                <td className="px-4 py-3.5 text-right font-semibold text-spotify tabular-nums">{e.plays}</td>
                                <td className="px-4 py-3.5 text-right tabular-nums">{e.streams}</td>
                                <td className="px-4 py-3.5 text-right tabular-nums">{e.audience_size}</td>
                              </tr>
                            ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                <HighlightCard title="Top episode" items={[{ label: monthLabel(latest.month_end), value: latest.spotify_top_episode || "—" }]} />
              </div>
            )}
          </>
        )}
      </div>

      <footer className="border-t border-paper-hairline mt-16 py-10 text-center">
        <p className="text-[10px] font-medium uppercase tracking-[0.18em] text-ink-faint/80">
          © {new Date().getFullYear()} Weidert Group · ChangeOver Podcast Analytics
        </p>
      </footer>
    </div>
  );
}
