import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(url, key);

export type DailyMetric = {
  metric_date: string;
  metric_name: string;
  metric_value: number;
  video_external_id: string | null;
  project_id: string | null;
};

export type Video = {
  external_id: string;
  title: string;
  project_name: string | null;
  channel_name: string | null;
  published_at: string | null;
  duration_seconds: number | null;
  url: string | null;
};

export type Project = {
  external_id: string;
  name: string;
  media_count: number;
};

export type Channel = {
  external_id: string;
  name: string;
  episode_count: number;
};

export type SyncRun = {
  status: string;
  records_synced: number;
  started_at: string;
  completed_at: string | null;
  error_message: string | null;
};
