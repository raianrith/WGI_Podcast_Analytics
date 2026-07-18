import { format, parseISO } from "date-fns";
import { aggregateAppleEpisodes, parseAppleCsv } from "./appleCsv";
import { aggregateSpotifyEpisodes, parseSpotifyCsv } from "./spotifyCsv";
import {
  monthlyImpressionTotals,
  parseSpotifyImpressionsCsv,
  summarizeImpressions,
} from "./spotifyImpressionsCsv";
import { aggregateYoutubeVideos, parseYoutubeStudioCsv, type ParsedYtVideo } from "./youtubeCsv";
import {
  supabase,
  type AppleEpisodeMetric,
  type MonthlyMetric,
  type MonthlyMetricInput,
  type SpotifyDailyImpression,
  type SpotifyEpisodeMetric,
  type YoutubeVideoMetric,
} from "./supabase";

export async function fetchAllMonths(): Promise<MonthlyMetric[]> {
  const { data, error } = await supabase
    .from("podcast_monthly_metrics")
    .select("*")
    .order("month_end", { ascending: true });

  if (error) throw error;
  return data ?? [];
}

export async function upsertMonth(row: MonthlyMetricInput): Promise<void> {
  const { error } = await supabase.from("podcast_monthly_metrics").upsert(
    { ...row, updated_at: new Date().toISOString() },
    { onConflict: "month_end" }
  );
  if (error) throw error;
}

export async function deleteMonth(monthEnd: string): Promise<void> {
  const { error } = await supabase.from("podcast_monthly_metrics").delete().eq("month_end", monthEnd);
  if (error) throw error;
  await supabase.from("youtube_video_metrics").delete().eq("month_end", monthEnd);
  await supabase.from("spotify_episode_metrics").delete().eq("month_end", monthEnd);
  await supabase.from("apple_episode_metrics").delete().eq("month_end", monthEnd);
}

export async function fetchYoutubeVideos(monthEnd: string): Promise<YoutubeVideoMetric[]> {
  const { data, error } = await supabase
    .from("youtube_video_metrics")
    .select("*")
    .eq("month_end", monthEnd)
    .order("views", { ascending: false });

  if (error) throw error;
  return data ?? [];
}

export async function importYoutubeCsv(
  monthEnd: string,
  csvText: string,
  kind: "videos" | "clips" = "videos"
): Promise<{ aggregate: ReturnType<typeof aggregateYoutubeVideos>; videoCount: number }> {
  const videos = parseYoutubeStudioCsv(csvText, { kind });
  const aggregate = aggregateYoutubeVideos(videos);
  const isClip = kind === "clips";

  // Replace only this kind for the month (videos and clips are uploaded separately)
  const { error: delError } = await supabase
    .from("youtube_video_metrics")
    .delete()
    .eq("month_end", monthEnd)
    .eq("is_clip", isClip);
  if (delError) {
    if (delError.code === "PGRST205" || delError.message?.includes("Could not find the table")) {
      throw new Error(
        "Table youtube_video_metrics is missing. Run supabase/add_youtube_videos.sql in the Supabase SQL Editor, then try again."
      );
    }
    throw delError;
  }

  const payload = videos.map((v: ParsedYtVideo) => ({
    month_end: monthEnd,
    video_id: v.video_id,
    title: v.title,
    published_at: v.published_at,
    duration_seconds: v.duration_seconds,
    engaged_views: v.engaged_views,
    avg_pct_viewed: v.avg_pct_viewed,
    impressions: v.impressions,
    ctr: v.ctr,
    unique_viewers: v.unique_viewers,
    unique_reach: v.unique_reach,
    new_viewers: v.new_viewers,
    returning_viewers: v.returning_viewers,
    views: v.views,
    watch_time_hrs: v.watch_time_hrs,
    avg_view_duration_sec: v.avg_view_duration_sec,
    subscribers: v.subscribers,
    is_clip: isClip,
  }));

  const chunkSize = 200;
  for (let i = 0; i < payload.length; i += chunkSize) {
    const chunk = payload.slice(i, i + chunkSize);
    const { error } = await supabase.from("youtube_video_metrics").insert(chunk);
    if (error) {
      if (error.code === "PGRST205" || error.message?.includes("Could not find the table")) {
        throw new Error(
          "Table youtube_video_metrics is missing. Run supabase/add_youtube_videos.sql in the Supabase SQL Editor, then try again."
        );
      }
      throw error;
    }
  }

  const { data: existing } = await supabase
    .from("podcast_monthly_metrics")
    .select("*")
    .eq("month_end", monthEnd)
    .maybeSingle();

  const ytFields =
    kind === "clips"
      ? {
          yt_clip_views: aggregate.yt_clip_views,
          yt_top_clip: aggregate.yt_top_clip || null,
        }
      : {
          yt_views: aggregate.yt_views,
          yt_watch_time_hrs: aggregate.yt_watch_time_hrs,
          yt_avg_view_duration_min: aggregate.yt_avg_view_duration_min,
          yt_avg_pct_viewed: aggregate.yt_avg_pct_viewed,
          yt_unique_viewers: aggregate.yt_unique_viewers,
          yt_top_episode: aggregate.yt_top_episode || null,
        };

  const base = existing
    ? {
        ...existing,
        ...ytFields,
        updated_at: new Date().toISOString(),
      }
    : {
        ...emptyMonth(monthEnd),
        ...ytFields,
      };

  const { id: _id, created_at: _c, ...rest } = base as MonthlyMetric & MonthlyMetricInput;
  await upsertMonth(rest as MonthlyMetricInput);

  return { aggregate, videoCount: videos.length };
}

export async function fetchAppleEpisodes(monthEnd: string): Promise<AppleEpisodeMetric[]> {
  const { data, error } = await supabase
    .from("apple_episode_metrics")
    .select("*")
    .eq("month_end", monthEnd)
    .order("plays", { ascending: false });

  if (error) throw error;
  return data ?? [];
}

export async function importAppleCsv(
  monthEnd: string,
  csvText: string
): Promise<{ aggregate: ReturnType<typeof aggregateAppleEpisodes>; episodeCount: number }> {
  const episodes = parseAppleCsv(csvText);
  const aggregate = aggregateAppleEpisodes(episodes);

  const { error: delError } = await supabase.from("apple_episode_metrics").delete().eq("month_end", monthEnd);
  if (delError) {
    if (delError.code === "PGRST205" || delError.message?.includes("Could not find the table")) {
      throw new Error(
        "Table apple_episode_metrics is missing. Run supabase/add_apple_episodes.sql in the Supabase SQL Editor, then try again."
      );
    }
    throw delError;
  }

  const payload = episodes.map((e) => ({
    month_end: monthEnd,
    episode_id: e.episode_id,
    episode_guid: e.episode_guid,
    episode_number: e.episode_number,
    episode_title: e.episode_title,
    show_name: e.show_name,
    release_date: e.release_date,
    duration_seconds: e.duration_seconds,
    unique_listeners: e.unique_listeners,
    unique_engaged_listeners: e.unique_engaged_listeners,
    plays: e.plays,
    average_consumption: e.average_consumption,
  }));

  const chunkSize = 200;
  for (let i = 0; i < payload.length; i += chunkSize) {
    const chunk = payload.slice(i, i + chunkSize);
    const { error } = await supabase.from("apple_episode_metrics").insert(chunk);
    if (error) {
      if (error.code === "PGRST205" || error.message?.includes("Could not find the table")) {
        throw new Error(
          "Table apple_episode_metrics is missing. Run supabase/add_apple_episodes.sql in the Supabase SQL Editor, then try again."
        );
      }
      throw error;
    }
  }

  const { data: existing } = await supabase
    .from("podcast_monthly_metrics")
    .select("*")
    .eq("month_end", monthEnd)
    .maybeSingle();

  const base = existing
    ? {
        ...existing,
        apple_plays: aggregate.apple_plays,
        apple_listeners: aggregate.apple_listeners,
        apple_engaged_listeners: aggregate.apple_engaged_listeners,
        apple_top_episode: aggregate.apple_top_episode || null,
        updated_at: new Date().toISOString(),
      }
    : {
        ...emptyMonth(monthEnd),
        apple_plays: aggregate.apple_plays,
        apple_listeners: aggregate.apple_listeners,
        apple_engaged_listeners: aggregate.apple_engaged_listeners,
        apple_top_episode: aggregate.apple_top_episode,
      };

  const { id: _id, created_at: _c, ...rest } = base as MonthlyMetric & MonthlyMetricInput;
  await upsertMonth(rest as MonthlyMetricInput);

  return { aggregate, episodeCount: episodes.length };
}

export async function saveAppleManualMetrics(
  monthEnd: string,
  fields: {
    apple_followers: number;
    apple_hours_listened: number;
    apple_net_new_followers?: number;
  }
): Promise<void> {
  const { data: existing } = await supabase
    .from("podcast_monthly_metrics")
    .select("*")
    .eq("month_end", monthEnd)
    .maybeSingle();

  const base = existing
    ? {
        ...existing,
        apple_followers: fields.apple_followers,
        apple_hours_listened: fields.apple_hours_listened,
        ...(fields.apple_net_new_followers !== undefined
          ? { apple_net_new_followers: fields.apple_net_new_followers }
          : {}),
        updated_at: new Date().toISOString(),
      }
    : {
        ...emptyMonth(monthEnd),
        apple_followers: fields.apple_followers,
        apple_hours_listened: fields.apple_hours_listened,
        apple_net_new_followers: fields.apple_net_new_followers ?? 0,
      };

  const { id: _id, created_at: _c, ...rest } = base as MonthlyMetric & MonthlyMetricInput;
  await upsertMonth(rest as MonthlyMetricInput);
}

export async function fetchSpotifyEpisodes(monthEnd: string): Promise<SpotifyEpisodeMetric[]> {
  const { data, error } = await supabase
    .from("spotify_episode_metrics")
    .select("*")
    .eq("month_end", monthEnd)
    .order("plays", { ascending: false });

  if (error) throw error;
  return data ?? [];
}

export async function importSpotifyCsv(
  monthEnd: string,
  csvText: string
): Promise<{ aggregate: ReturnType<typeof aggregateSpotifyEpisodes>; episodeCount: number }> {
  const episodes = parseSpotifyCsv(csvText);
  const aggregate = aggregateSpotifyEpisodes(episodes);

  const { error: delError } = await supabase.from("spotify_episode_metrics").delete().eq("month_end", monthEnd);
  if (delError) {
    if (delError.code === "PGRST205" || delError.message?.includes("Could not find the table")) {
      throw new Error(
        "Table spotify_episode_metrics is missing. Run supabase/add_spotify_episodes.sql in the Supabase SQL Editor, then try again."
      );
    }
    throw delError;
  }

  const payload = episodes.map((e) => ({
    month_end: monthEnd,
    episode_name: e.episode_name,
    plays: e.plays,
    streams: e.streams,
    audience_size: e.audience_size,
    release_date: e.release_date,
  }));

  const chunkSize = 200;
  for (let i = 0; i < payload.length; i += chunkSize) {
    const chunk = payload.slice(i, i + chunkSize);
    const { error } = await supabase.from("spotify_episode_metrics").insert(chunk);
    if (error) {
      if (error.code === "PGRST205" || error.message?.includes("Could not find the table")) {
        throw new Error(
          "Table spotify_episode_metrics is missing. Run supabase/add_spotify_episodes.sql in the Supabase SQL Editor, then try again."
        );
      }
      throw error;
    }
  }

  // Merge Spotify CSV fields; keep followers / impressions / hours if already entered
  const { data: existing } = await supabase
    .from("podcast_monthly_metrics")
    .select("*")
    .eq("month_end", monthEnd)
    .maybeSingle();

  const base = existing
    ? {
        ...existing,
        spotify_plays: aggregate.spotify_plays,
        spotify_streams_60s: aggregate.spotify_streams_60s,
        spotify_listeners: aggregate.spotify_listeners,
        spotify_top_episode: aggregate.spotify_top_episode || null,
        updated_at: new Date().toISOString(),
      }
    : {
        ...emptyMonth(monthEnd),
        spotify_plays: aggregate.spotify_plays,
        spotify_streams_60s: aggregate.spotify_streams_60s,
        spotify_listeners: aggregate.spotify_listeners,
        spotify_top_episode: aggregate.spotify_top_episode,
      };

  const { id: _id, created_at: _c, ...rest } = base as MonthlyMetric & MonthlyMetricInput;
  await upsertMonth(rest as MonthlyMetricInput);

  return { aggregate, episodeCount: episodes.length };
}

export async function saveSpotifyManualMetrics(
  monthEnd: string,
  fields: {
    spotify_followers: number;
    spotify_hours_played: number;
    spotify_net_new_followers?: number;
  }
): Promise<void> {
  const { data: existing } = await supabase
    .from("podcast_monthly_metrics")
    .select("*")
    .eq("month_end", monthEnd)
    .maybeSingle();

  const base = existing
    ? {
        ...existing,
        spotify_followers: fields.spotify_followers,
        spotify_hours_played: fields.spotify_hours_played,
        ...(fields.spotify_net_new_followers !== undefined
          ? { spotify_net_new_followers: fields.spotify_net_new_followers }
          : {}),
        updated_at: new Date().toISOString(),
      }
    : {
        ...emptyMonth(monthEnd),
        spotify_followers: fields.spotify_followers,
        spotify_hours_played: fields.spotify_hours_played,
        spotify_net_new_followers: fields.spotify_net_new_followers ?? 0,
      };

  const { id: _id, created_at: _c, ...rest } = base as MonthlyMetric & MonthlyMetricInput;
  await upsertMonth(rest as MonthlyMetricInput);
}

export async function fetchSpotifyDailyImpressions(
  start?: string,
  end?: string
): Promise<SpotifyDailyImpression[]> {
  let q = supabase
    .from("spotify_daily_impressions")
    .select("impression_date, impressions")
    .order("impression_date", { ascending: true });

  if (start) q = q.gte("impression_date", start);
  if (end) q = q.lte("impression_date", end);

  const { data, error } = await q;
  if (error) {
    if (error.code === "PGRST205" || error.message?.includes("Could not find the table")) {
      return [];
    }
    throw error;
  }
  return data ?? [];
}

export async function importSpotifyImpressionsCsv(csvText: string): Promise<{
  days: number;
  total: number;
  start: string | null;
  end: string | null;
}> {
  const rows = parseSpotifyImpressionsCsv(csvText);
  const summary = summarizeImpressions(rows);

  const payload = rows.map((r) => ({
    impression_date: r.impression_date,
    impressions: r.impressions,
    updated_at: new Date().toISOString(),
  }));

  const chunkSize = 200;
  for (let i = 0; i < payload.length; i += chunkSize) {
    const chunk = payload.slice(i, i + chunkSize);
    const { error } = await supabase.from("spotify_daily_impressions").upsert(chunk, {
      onConflict: "impression_date",
    });
    if (error) {
      if (error.code === "PGRST205" || error.message?.includes("Could not find the table")) {
        throw new Error(
          "Table spotify_daily_impressions is missing. Run supabase/add_spotify_impressions.sql in the Supabase SQL Editor, then try again."
        );
      }
      throw error;
    }
  }

  // Roll daily totals into monthly spotify_impressions for months touched
  const byMonth = monthlyImpressionTotals(rows);
  for (const [monthEnd, total] of Object.entries(byMonth)) {
    const { data: existing } = await supabase
      .from("podcast_monthly_metrics")
      .select("*")
      .eq("month_end", monthEnd)
      .maybeSingle();

    // Recompute month total from all daily rows for that month (accurate on re-upload)
    const monthStart = `${monthEnd.slice(0, 8)}01`;
    const { data: daily } = await supabase
      .from("spotify_daily_impressions")
      .select("impressions")
      .gte("impression_date", monthStart)
      .lte("impression_date", monthEnd);

    const monthTotal = (daily ?? []).reduce((s, r) => s + Number(r.impressions), 0);

    const base = existing
      ? { ...existing, spotify_impressions: monthTotal, updated_at: new Date().toISOString() }
      : { ...emptyMonth(monthEnd), spotify_impressions: monthTotal };

    const { id: _id, created_at: _c, ...rest } = base as MonthlyMetric & MonthlyMetricInput;
    await upsertMonth(rest as MonthlyMetricInput);
  }

  return summary;
}

export function monthLabel(monthEnd: string) {
  return format(parseISO(monthEnd), "MMM yyyy");
}

export function shortMonth(monthEnd: string) {
  return format(parseISO(monthEnd), "MMM ''yy");
}

export function num(v: number | null | undefined) {
  return Number(v ?? 0);
}

export function momChange(current: number, previous: number | null | undefined) {
  if (previous === null || previous === undefined) return null;
  if (previous === 0) return current > 0 ? 100 : 0;
  return ((current - previous) / Math.abs(previous)) * 100;
}

export type OverviewTotals = {
  ytViews: number;
  applePlays: number;
  spotifyPlays: number;
  totalPlays: number;
  ytHours: number;
  appleHours: number;
  spotifyHours: number;
  totalHours: number;
};

export function sumRange(rows: MonthlyMetric[]): OverviewTotals {
  return rows.reduce(
    (acc, r) => ({
      ytViews: acc.ytViews + num(r.yt_views),
      applePlays: acc.applePlays + num(r.apple_plays),
      spotifyPlays: acc.spotifyPlays + num(r.spotify_plays),
      totalPlays: acc.totalPlays + num(r.yt_views) + num(r.apple_plays) + num(r.spotify_plays),
      ytHours: acc.ytHours + num(r.yt_watch_time_hrs),
      appleHours: acc.appleHours + num(r.apple_hours_listened),
      spotifyHours: acc.spotifyHours + num(r.spotify_hours_played),
      totalHours:
        acc.totalHours + num(r.yt_watch_time_hrs) + num(r.apple_hours_listened) + num(r.spotify_hours_played),
    }),
    {
      ytViews: 0,
      applePlays: 0,
      spotifyPlays: 0,
      totalPlays: 0,
      ytHours: 0,
      appleHours: 0,
      spotifyHours: 0,
      totalHours: 0,
    }
  );
}

export function trendSeries(rows: MonthlyMetric[]) {
  return rows.map((r) => ({
    month: shortMonth(r.month_end),
    monthEnd: r.month_end,
    youtube: num(r.yt_views),
    apple: num(r.apple_plays),
    spotify: num(r.spotify_plays),
    total: num(r.yt_views) + num(r.apple_plays) + num(r.spotify_plays),
    hours: num(r.yt_watch_time_hrs) + num(r.apple_hours_listened) + num(r.spotify_hours_played),
  }));
}

export function channelShare(totals: OverviewTotals) {
  const total = totals.totalPlays || 1;
  return [
    { name: "YouTube", value: totals.ytViews, pct: (totals.ytViews / total) * 100, color: "#E11D48" },
    { name: "Apple", value: totals.applePlays, pct: (totals.applePlays / total) * 100, color: "#737373" },
    { name: "Spotify", value: totals.spotifyPlays, pct: (totals.spotifyPlays / total) * 100, color: "#1DB954" },
  ];
}

export function latestSnapshot(rows: MonthlyMetric[]) {
  if (!rows.length) return null;
  const latest = rows[rows.length - 1];
  const prev = rows.length > 1 ? rows[rows.length - 2] : null;
  return { latest, prev };
}

export function emptyMonth(monthEnd: string): MonthlyMetricInput {
  return {
    month_end: monthEnd,
    yt_views: 0,
    yt_watch_time_hrs: 0,
    yt_avg_view_duration_min: 0,
    yt_avg_pct_viewed: 0,
    yt_unique_viewers: 0,
    yt_clip_views: 0,
    yt_top_clip: "",
    yt_top_episode: "",
    apple_followers: 0,
    apple_net_new_followers: 0,
    apple_listeners: 0,
    apple_engaged_listeners: 0,
    apple_plays: 0,
    apple_hours_listened: 0,
    apple_top_episode: "",
    spotify_followers: 0,
    spotify_net_new_followers: 0,
    spotify_plays: 0,
    spotify_streams_60s: 0,
    spotify_listeners: 0,
    spotify_impressions: 0,
    spotify_hours_played: 0,
    spotify_top_episode: "",
    notes: "",
  };
}
