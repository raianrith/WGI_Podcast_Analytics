import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(url, key);

export type MonthlyMetric = {
  id: string;
  month_end: string;

  yt_views: number;
  yt_watch_time_hrs: number;
  yt_avg_view_duration_min: number;
  yt_avg_pct_viewed: number;
  yt_unique_viewers: number;
  yt_clip_views: number;
  yt_top_clip: string | null;
  yt_top_episode: string | null;

  apple_followers: number;
  apple_net_new_followers: number;
  apple_listeners: number;
  apple_engaged_listeners: number;
  apple_plays: number;
  apple_hours_listened: number;
  apple_top_episode: string | null;

  spotify_followers: number;
  spotify_net_new_followers: number;
  spotify_plays: number;
  spotify_streams_60s: number;
  spotify_listeners: number;
  spotify_impressions: number;
  spotify_hours_played: number;
  spotify_top_episode: string | null;

  notes: string | null;
  created_at?: string;
  updated_at?: string;
};

export type MonthlyMetricInput = Omit<MonthlyMetric, "id" | "created_at" | "updated_at">;

export type YoutubeVideoMetric = {
  id?: string;
  month_end: string;
  video_id: string;
  title: string;
  published_at: string | null;
  duration_seconds: number;
  engaged_views: number;
  avg_pct_viewed: number;
  impressions: number;
  ctr: number;
  unique_viewers: number;
  unique_reach: number;
  new_viewers: number;
  returning_viewers: number;
  views: number;
  watch_time_hrs: number;
  avg_view_duration_sec: number;
  subscribers: number;
  is_clip: boolean;
};

export type SpotifyEpisodeMetric = {
  id?: string;
  month_end: string;
  episode_name: string;
  plays: number;
  streams: number;
  audience_size: number;
  release_date: string | null;
};

export type AppleEpisodeMetric = {
  id?: string;
  month_end: string;
  episode_id: string;
  episode_guid: string | null;
  episode_number: string | null;
  episode_title: string;
  show_name: string | null;
  release_date: string | null;
  duration_seconds: number;
  unique_listeners: number;
  unique_engaged_listeners: number;
  plays: number;
  average_consumption: number;
};

export type SpotifyDailyImpression = {
  id?: string;
  impression_date: string;
  impressions: number;
};
