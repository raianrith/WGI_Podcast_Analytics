import {
  format,
  subDays,
  startOfMonth,
  endOfMonth,
  subMonths,
  startOfWeek,
  endOfWeek,
  subWeeks,
  parseISO,
} from "date-fns";
import { supabase, type Channel, type DailyMetric, type Project, type SyncRun, type Video } from "./supabase";

export const ANALYTICS_START_DATE = "2026-01-01";
export const CHANGEOVER_CHANNEL = "The ChangeOver Podcast";

export type PeriodPreset = "7" | "14" | "30" | "90" | "180" | "ytd" | "custom";

export type ComparisonMode = "none" | "wow" | "mom";

export type DateWindow = {
  currentStart: string;
  currentEnd: string;
  previousStart: string;
  previousEnd: string;
  fetchStart: string;
  fetchEnd: string;
  label: string;
  previousLabel: string;
};

export function getDateWindow(mode: ComparisonMode): DateWindow {
  const today = new Date();
  const endStr = format(today, "yyyy-MM-dd");

  if (mode === "wow") {
    const currentStart = startOfWeek(today, { weekStartsOn: 1 });
    const currentEnd = endOfWeek(today, { weekStartsOn: 1 });
    const previousStart = startOfWeek(subWeeks(today, 1), { weekStartsOn: 1 });
    const previousEnd = endOfWeek(subWeeks(today, 1), { weekStartsOn: 1 });
    return {
      currentStart: format(currentStart, "yyyy-MM-dd"),
      currentEnd: format(currentEnd, "yyyy-MM-dd"),
      previousStart: format(previousStart, "yyyy-MM-dd"),
      previousEnd: format(previousEnd, "yyyy-MM-dd"),
      fetchStart: ANALYTICS_START_DATE,
      fetchEnd: endStr,
      label: "This week",
      previousLabel: "Last week",
    };
  }

  if (mode === "mom") {
    const currentStart = startOfMonth(today);
    const currentEnd = endOfMonth(today);
    const prev = subMonths(today, 1);
    const previousStart = startOfMonth(prev);
    const previousEnd = endOfMonth(prev);
    return {
      currentStart: format(currentStart, "yyyy-MM-dd"),
      currentEnd: format(currentEnd, "yyyy-MM-dd"),
      previousStart: format(previousStart, "yyyy-MM-dd"),
      previousEnd: format(previousEnd, "yyyy-MM-dd"),
      fetchStart: ANALYTICS_START_DATE,
      fetchEnd: endStr,
      label: format(today, "MMMM yyyy"),
      previousLabel: format(prev, "MMMM yyyy"),
    };
  }

  return {
    currentStart: ANALYTICS_START_DATE,
    currentEnd: endStr,
    previousStart: ANALYTICS_START_DATE,
    previousEnd: endStr,
    fetchStart: ANALYTICS_START_DATE,
    fetchEnd: endStr,
    label: "Since Jan 1, 2026",
    previousLabel: "",
  };
}

export function buildPeriodWindow(
  preset: PeriodPreset,
  customStart?: string,
  customEnd?: string
): Pick<DateWindow, "currentStart" | "currentEnd" | "fetchStart" | "fetchEnd" | "label"> {
  const today = new Date();
  const endStr = format(today, "yyyy-MM-dd");

  if (preset === "custom" && customStart && customEnd) {
    const start = customStart < ANALYTICS_START_DATE ? ANALYTICS_START_DATE : customStart;
    return {
      currentStart: start,
      currentEnd: customEnd,
      fetchStart: ANALYTICS_START_DATE,
      fetchEnd: endStr,
      label: `${format(parseISO(start), "MMM d")} – ${format(parseISO(customEnd), "MMM d, yyyy")}`,
    };
  }

  if (preset === "ytd") {
    return {
      currentStart: ANALYTICS_START_DATE,
      currentEnd: endStr,
      fetchStart: ANALYTICS_START_DATE,
      fetchEnd: endStr,
      label: "Since Jan 1, 2026",
    };
  }

  const days = preset === "7" ? 7 : preset === "14" ? 14 : preset === "30" ? 30 : preset === "90" ? 90 : 180;
  const start = format(subDays(today, days), "yyyy-MM-dd");
  const labels: Record<string, string> = {
    "7": "Last 7 days",
    "14": "Last 14 days",
    "30": "Last 30 days",
    "90": "Last 90 days",
    "180": "Last 6 months",
  };

  return {
    currentStart: start,
    currentEnd: endStr,
    fetchStart: ANALYTICS_START_DATE,
    fetchEnd: endStr,
    label: labels[preset] ?? `Last ${days} days`,
  };
}

export async function fetchMetrics(start: string, end: string): Promise<DailyMetric[]> {
  const pageSize = 1000;
  const all: DailyMetric[] = [];
  let offset = 0;

  while (true) {
    const { data, error } = await supabase
      .from("wistia_daily_metrics")
      .select("metric_date, metric_name, metric_value, video_external_id, project_id")
      .gte("metric_date", start)
      .lte("metric_date", end)
      .not("video_external_id", "is", null)
      .order("metric_date", { ascending: true })
      .range(offset, offset + pageSize - 1);

    if (error) throw error;
    const batch = data ?? [];
    all.push(...batch);
    if (batch.length < pageSize) break;
    offset += pageSize;
  }

  return all;
}

export async function fetchVideos(): Promise<Video[]> {
  const pageSize = 1000;
  const all: Video[] = [];
  let offset = 0;

  while (true) {
    const { data, error } = await supabase
      .from("wistia_videos")
      .select("external_id, title, project_name, channel_name, published_at, duration_seconds, url")
      .order("title")
      .range(offset, offset + pageSize - 1);

    if (error) throw error;
    const batch = data ?? [];
    all.push(...batch);
    if (batch.length < pageSize) break;
    offset += pageSize;
  }

  return all;
}

export async function fetchProjects(): Promise<Project[]> {
  const { data, error } = await supabase
    .from("wistia_projects")
    .select("external_id, name, media_count")
    .order("name");

  if (error) throw error;
  return data ?? [];
}

export async function fetchChannels(): Promise<Channel[]> {
  const { data, error } = await supabase
    .from("wistia_channels")
    .select("external_id, name, episode_count")
    .order("name");

  if (error) throw error;
  return data ?? [];
}

export async function fetchSyncRuns(): Promise<SyncRun[]> {
  const { data, error } = await supabase
    .from("wistia_sync_runs")
    .select("status, records_synced, started_at, completed_at, error_message")
    .order("started_at", { ascending: false })
    .limit(5);

  if (error) throw error;
  return data ?? [];
}

export function filterVideos(
  videos: Video[],
  projectFilter: string,
  channelFilter: string
): Video[] {
  return videos.filter((v) => {
    if (projectFilter !== "all" && (v.project_name || "Unassigned") !== projectFilter) return false;
    if (channelFilter !== "all" && (v.channel_name || "Not in a channel") !== channelFilter) return false;
    return true;
  });
}

export function filterMetricsByVideos(metrics: DailyMetric[], videoIds: Set<string>): DailyMetric[] {
  return metrics.filter((m) => m.video_external_id && videoIds.has(m.video_external_id));
}

export function metricsInRange(metrics: DailyMetric[], start: string, end: string): DailyMetric[] {
  return metrics.filter((m) => m.metric_date >= start && m.metric_date <= end);
}

export function aggregateKpis(metrics: DailyMetric[]) {
  const sum = (name: string) =>
    metrics.filter((m) => m.metric_name === name).reduce((a, m) => a + Number(m.metric_value), 0);

  const activeVideos = new Set(
    metrics.filter((m) => m.metric_name === "plays" && m.metric_value > 0).map((m) => m.video_external_id)
  ).size;

  return {
    plays: sum("plays"),
    pageLoads: sum("page_loads"),
    hoursWatched: sum("hours_watched"),
    activeVideos,
  };
}

export function kpiDelta(current: number, previous: number): { value: number; pct: number | null } {
  if (previous === 0) return { value: current - previous, pct: current > 0 ? 100 : null };
  return { value: current - previous, pct: ((current - previous) / previous) * 100 };
}

export function dailyPlays(metrics: DailyMetric[]) {
  const byDate: Record<string, number> = {};
  for (const m of metrics) {
    if (m.metric_name !== "plays") continue;
    byDate[m.metric_date] = (byDate[m.metric_date] ?? 0) + Number(m.metric_value);
  }
  return Object.entries(byDate)
    .map(([date, plays]) => ({ date, plays }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

export function weeklyPlays(metrics: DailyMetric[]) {
  const byWeek: Record<string, number> = {};
  for (const m of metrics) {
    if (m.metric_name !== "plays" || m.metric_date < ANALYTICS_START_DATE) continue;
    const weekStart = format(startOfWeek(parseISO(m.metric_date), { weekStartsOn: 1 }), "yyyy-MM-dd");
    byWeek[weekStart] = (byWeek[weekStart] ?? 0) + Number(m.metric_value);
  }
  return Object.entries(byWeek)
    .map(([week, plays]) => ({ period: week, plays, label: `Wk ${week.slice(5)}` }))
    .sort((a, b) => a.period.localeCompare(b.period));
}

export function monthlyPlays(metrics: DailyMetric[]) {
  const byMonth: Record<string, number> = {};
  for (const m of metrics) {
    if (m.metric_name !== "plays" || m.metric_date < ANALYTICS_START_DATE) continue;
    const month = m.metric_date.slice(0, 7);
    byMonth[month] = (byMonth[month] ?? 0) + Number(m.metric_value);
  }
  return Object.entries(byMonth)
    .map(([month, plays]) => ({
      period: month,
      plays,
      label: format(parseISO(`${month}-01`), "MMM yyyy"),
    }))
    .sort((a, b) => a.period.localeCompare(b.period));
}

export type VideoMonthlyPlays = {
  seriesKeys: string[];
  seriesLabels: Record<string, string>;
  rows: ({ label: string; period: string } & Record<string, number>)[];
};

export function monthlyPlaysByVideo(
  metrics: DailyMetric[],
  videos: Video[],
  topN = 8
): VideoMonthlyPlays {
  const videoTitle: Record<string, string> = {};
  for (const v of videos) videoTitle[v.external_id] = v.title;

  const byVideoMonth: Record<string, Record<string, number>> = {};
  const videoTotals: Record<string, number> = {};

  for (const m of metrics) {
    if (m.metric_name !== "plays" || !m.video_external_id || m.metric_date < ANALYTICS_START_DATE) continue;
    const vid = m.video_external_id;
    const month = m.metric_date.slice(0, 7);
    const val = Number(m.metric_value);
    if (!byVideoMonth[vid]) byVideoMonth[vid] = {};
    byVideoMonth[vid][month] = (byVideoMonth[vid][month] ?? 0) + val;
    videoTotals[vid] = (videoTotals[vid] ?? 0) + val;
  }

  const topVideos = Object.entries(videoTotals)
    .filter(([, total]) => total > 0)
    .sort((a, b) => b[1] - a[1])
    .slice(0, topN)
    .map(([id]) => id);

  const months = new Set<string>();
  for (const vid of topVideos) {
    for (const month of Object.keys(byVideoMonth[vid] ?? {})) months.add(month);
  }

  const seriesKeys: string[] = [];
  const seriesLabels: Record<string, string> = {};
  topVideos.forEach((vid, i) => {
    const key = `v${i}`;
    seriesKeys.push(key);
    const title = videoTitle[vid] || "Untitled";
    seriesLabels[key] = title.length > 50 ? `${title.slice(0, 47)}…` : title;
  });

  const rows = [...months].sort().map((month) => {
    const row: Record<string, number | string> = {
      period: month,
      label: format(parseISO(`${month}-01`), "MMM yyyy"),
    };
    topVideos.forEach((vid, i) => {
      const plays = byVideoMonth[vid]?.[month] ?? 0;
      row[`v${i}`] = plays > 0 ? plays : (null as unknown as number);
    });
    return row as { label: string; period: string } & Record<string, number>;
  });

  return { seriesKeys, seriesLabels, rows };
}

export function periodComparisonChart(
  currentMetrics: DailyMetric[],
  previousMetrics: DailyMetric[],
  mode: ComparisonMode
) {
  const currentKpis = aggregateKpis(currentMetrics);
  const previousKpis = aggregateKpis(previousMetrics);
  return [
    { metric: "Plays", current: currentKpis.plays, previous: previousKpis.plays },
    { metric: "Page Loads", current: currentKpis.pageLoads, previous: previousKpis.pageLoads },
    { metric: "Hours Watched", current: currentKpis.hoursWatched, previous: previousKpis.hoursWatched },
    { metric: "Active Videos", current: currentKpis.activeVideos, previous: previousKpis.activeVideos },
  ];
}

export function projectBreakdown(metrics: DailyMetric[], videos: Video[]) {
  const videoProject: Record<string, string> = {};
  for (const v of videos) {
    videoProject[v.external_id] = v.project_name || "Unassigned";
  }

  const byProject: Record<string, number> = {};
  for (const m of metrics) {
    if (m.metric_name !== "plays" || !m.video_external_id) continue;
    const project = videoProject[m.video_external_id] || "Unassigned";
    byProject[project] = (byProject[project] ?? 0) + Number(m.metric_value);
  }

  return Object.entries(byProject)
    .map(([project, plays]) => ({ project, plays }))
    .sort((a, b) => b.plays - a.plays);
}

export function videoPerformance(metrics: DailyMetric[], videos: Video[]) {
  const stats: Record<string, { plays: number; loads: number; hours: number }> = {};

  for (const m of metrics) {
    if (!m.video_external_id) continue;
    if (!stats[m.video_external_id]) stats[m.video_external_id] = { plays: 0, loads: 0, hours: 0 };
    if (m.metric_name === "plays") stats[m.video_external_id].plays += Number(m.metric_value);
    if (m.metric_name === "page_loads") stats[m.video_external_id].loads += Number(m.metric_value);
    if (m.metric_name === "hours_watched") stats[m.video_external_id].hours += Number(m.metric_value);
  }

  return videos
    .map((v) => ({
      ...v,
      plays: stats[v.external_id]?.plays ?? 0,
      pageLoads: stats[v.external_id]?.loads ?? 0,
      hoursWatched: stats[v.external_id]?.hours ?? 0,
    }))
    .filter((v) => v.plays > 0 || v.pageLoads > 0)
    .sort((a, b) => b.plays - a.plays);
}

export function channelBreakdown(metrics: DailyMetric[], videos: Video[]) {
  const videoChannel: Record<string, string> = {};
  for (const v of videos) {
    videoChannel[v.external_id] = v.channel_name || "Not in a channel";
  }

  const byChannel: Record<string, number> = {};
  for (const m of metrics) {
    if (m.metric_name !== "plays" || !m.video_external_id) continue;
    const channel = videoChannel[m.video_external_id] || "Not in a channel";
    byChannel[channel] = (byChannel[channel] ?? 0) + Number(m.metric_value);
  }

  return Object.entries(byChannel)
    .map(([channel, plays]) => ({ channel, plays }))
    .sort((a, b) => b.plays - a.plays);
}

export type VideoByChannel = {
  channel: string;
  videos: ReturnType<typeof videoPerformance>;
  totalPlays: number;
};

export function videosGroupedByChannel(metrics: DailyMetric[], videos: Video[]): VideoByChannel[] {
  const perf = videoPerformance(metrics, videos);
  const groups: Record<string, typeof perf> = {};

  for (const v of perf) {
    const ch = v.channel_name || "Not in a channel";
    if (!groups[ch]) groups[ch] = [];
    groups[ch].push(v);
  }

  return Object.entries(groups)
    .map(([channel, vids]) => ({
      channel,
      videos: vids.sort((a, b) => b.plays - a.plays),
      totalPlays: vids.reduce((s, v) => s + v.plays, 0),
    }))
    .sort((a, b) => b.totalPlays - a.totalPlays);
}

export function uniqueProjects(videos: Video[]): string[] {
  return [...new Set(videos.map((v) => v.project_name || "Unassigned"))].sort();
}

export function uniqueChannels(videos: Video[]): string[] {
  return [...new Set(videos.map((v) => v.channel_name || "Not in a channel"))].sort();
}

export const SYNC_INTERVAL_HOURS = 6;

export type DataCoverage = {
  totalVideos: number;
  videosWithPlays: number;
  metricRows: number;
  playEvents: number;
  earliestMetric: string | null;
  latestMetric: string | null;
  lastSyncAt: string | null;
  lastSyncStatus: string | null;
  lastSyncRecords: number | null;
  nextSyncAt: string | null;
  syncIntervalHours: number;
};

/** Next scheduled sync (every 6h from last successful run). */
export function nextSyncTime(lastSyncAt: string | null, now = new Date()): Date | null {
  if (!lastSyncAt) return null;
  let next = new Date(new Date(lastSyncAt).getTime() + SYNC_INTERVAL_HOURS * 60 * 60 * 1000);
  while (next <= now) {
    next = new Date(next.getTime() + SYNC_INTERVAL_HOURS * 60 * 60 * 1000);
  }
  return next;
}

export function formatTimeUntil(target: Date, now = new Date()): string {
  const ms = target.getTime() - now.getTime();
  if (ms <= 0) return "soon";
  const totalMinutes = Math.floor(ms / 60_000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours > 0) return `in ${hours}h ${minutes}m`;
  return `in ${minutes}m`;
}

export function dataCoverage(
  metrics: DailyMetric[],
  videos: Video[],
  syncRuns: SyncRun[]
): DataCoverage {
  const playRows = metrics.filter((m) => m.metric_name === "plays" && m.metric_value > 0);
  const videosWithPlays = new Set(playRows.map((m) => m.video_external_id)).size;
  const dates = metrics.map((m) => m.metric_date).sort();
  const last = syncRuns[0];
  const lastSyncAt = last?.started_at ?? null;
  const next = nextSyncTime(lastSyncAt);

  return {
    totalVideos: videos.length,
    videosWithPlays,
    metricRows: metrics.length,
    playEvents: playRows.reduce((s, m) => s + Number(m.metric_value), 0),
    earliestMetric: dates[0] ?? null,
    latestMetric: dates[dates.length - 1] ?? null,
    lastSyncAt,
    lastSyncStatus: last?.status ?? null,
    lastSyncRecords: last?.records_synced ?? null,
    nextSyncAt: next?.toISOString() ?? null,
    syncIntervalHours: SYNC_INTERVAL_HOURS,
  };
}
