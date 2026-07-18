-- Podcast Monthly Metrics
-- Run in Supabase SQL Editor: https://supabase.com/dashboard/project/_/sql
-- Replaces the previous Wistia schema for the new monthly-entry dashboard.

create extension if not exists "pgcrypto";

-- Drop old Wistia tables if present (safe for fresh start)
drop table if exists wistia_daily_metrics cascade;
drop table if exists wistia_videos cascade;
drop table if exists wistia_channels cascade;
drop table if exists wistia_projects cascade;
drop table if exists wistia_sync_runs cascade;

create table if not exists podcast_monthly_metrics (
  id uuid primary key default gen_random_uuid(),
  month_end date not null unique,

  -- YouTube
  yt_views integer default 0,
  yt_watch_time_hrs numeric(10,2) default 0,
  yt_avg_view_duration_min numeric(10,2) default 0,
  yt_avg_pct_viewed numeric(6,2) default 0,
  yt_unique_viewers integer default 0,
  yt_clip_views integer default 0,
  yt_top_clip text,
  yt_top_episode text,

  -- Apple Podcasts
  apple_followers integer default 0,
  apple_net_new_followers integer default 0,
  apple_listeners integer default 0,
  apple_engaged_listeners integer default 0,
  apple_plays integer default 0,
  apple_hours_listened numeric(10,2) default 0,
  apple_top_episode text,

  -- Spotify
  spotify_followers integer default 0,
  spotify_net_new_followers integer default 0,
  spotify_plays integer default 0,
  spotify_streams_60s integer default 0,
  spotify_listeners integer default 0,
  spotify_impressions integer default 0,
  spotify_hours_played numeric(10,2) default 0,
  spotify_top_episode text,

  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists idx_podcast_month on podcast_monthly_metrics (month_end desc);

-- Per-video YouTube rows from monthly Studio CSV export (e.g. WGI_YT_June - Table data.csv)
create table if not exists youtube_video_metrics (
  id uuid primary key default gen_random_uuid(),
  month_end date not null,
  video_id text not null,
  title text not null,
  published_at date,
  duration_seconds integer default 0,
  engaged_views integer default 0,
  avg_pct_viewed numeric(8,2) default 0,
  impressions integer default 0,
  ctr numeric(8,2) default 0,
  unique_viewers integer default 0,
  unique_reach integer default 0,
  new_viewers integer default 0,
  returning_viewers integer default 0,
  views integer default 0,
  watch_time_hrs numeric(12,4) default 0,
  avg_view_duration_sec integer default 0,
  subscribers integer default 0,
  is_clip boolean default false,
  created_at timestamptz default now(),
  unique (month_end, video_id)
);

create index if not exists idx_yt_video_month on youtube_video_metrics (month_end desc);
create index if not exists idx_yt_video_views on youtube_video_metrics (month_end, views desc);

-- Per-episode Spotify rows from monthly CSV export (e.g. WGI_SPOT_June.csv)
create table if not exists spotify_episode_metrics (
  id uuid primary key default gen_random_uuid(),
  month_end date not null,
  episode_name text not null,
  plays integer default 0,
  streams integer default 0,
  audience_size integer default 0,
  release_date date,
  created_at timestamptz default now(),
  unique (month_end, episode_name)
);

create index if not exists idx_spotify_ep_month on spotify_episode_metrics (month_end desc);
create index if not exists idx_spotify_ep_plays on spotify_episode_metrics (month_end, plays desc);

-- Per-episode Apple rows from monthly Podcasts Connect CSV export
create table if not exists apple_episode_metrics (
  id uuid primary key default gen_random_uuid(),
  month_end date not null,
  episode_id text not null,
  episode_guid text,
  episode_number text,
  episode_title text not null,
  show_name text,
  release_date date,
  duration_seconds integer default 0,
  unique_listeners integer default 0,
  unique_engaged_listeners integer default 0,
  plays integer default 0,
  average_consumption numeric(8,2) default 0,
  created_at timestamptz default now(),
  unique (month_end, episode_id)
);

create index if not exists idx_apple_ep_month on apple_episode_metrics (month_end desc);
create index if not exists idx_apple_ep_plays on apple_episode_metrics (month_end, plays desc);

-- Daily Spotify impressions (from Creators daily impressions CSV)
create table if not exists spotify_daily_impressions (
  id uuid primary key default gen_random_uuid(),
  impression_date date not null unique,
  impressions integer not null default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists idx_spotify_impressions_date
  on spotify_daily_impressions (impression_date desc);

alter table podcast_monthly_metrics enable row level security;
alter table youtube_video_metrics enable row level security;
alter table spotify_episode_metrics enable row level security;
alter table apple_episode_metrics enable row level security;
alter table spotify_daily_impressions enable row level security;

-- Public read for dashboard
create policy "Public read monthly metrics"
  on podcast_monthly_metrics for select using (true);

create policy "Public read youtube video metrics"
  on youtube_video_metrics for select using (true);

-- Writes for admin (internal tool; tighten with auth later if needed)
create policy "Allow insert monthly metrics"
  on podcast_monthly_metrics for insert with check (true);

create policy "Allow update monthly metrics"
  on podcast_monthly_metrics for update using (true);

create policy "Allow delete monthly metrics"
  on podcast_monthly_metrics for delete using (true);

create policy "Allow insert youtube video metrics"
  on youtube_video_metrics for insert with check (true);

create policy "Allow update youtube video metrics"
  on youtube_video_metrics for update using (true);

create policy "Allow delete youtube video metrics"
  on youtube_video_metrics for delete using (true);

create policy "Public read spotify episode metrics"
  on spotify_episode_metrics for select using (true);

create policy "Allow insert spotify episode metrics"
  on spotify_episode_metrics for insert with check (true);

create policy "Allow update spotify episode metrics"
  on spotify_episode_metrics for update using (true);

create policy "Allow delete spotify episode metrics"
  on spotify_episode_metrics for delete using (true);

create policy "Public read apple episode metrics"
  on apple_episode_metrics for select using (true);

create policy "Allow insert apple episode metrics"
  on apple_episode_metrics for insert with check (true);

create policy "Allow update apple episode metrics"
  on apple_episode_metrics for update using (true);

create policy "Allow delete apple episode metrics"
  on apple_episode_metrics for delete using (true);

create policy "Public read spotify daily impressions"
  on spotify_daily_impressions for select using (true);

create policy "Allow insert spotify daily impressions"
  on spotify_daily_impressions for insert with check (true);

create policy "Allow update spotify daily impressions"
  on spotify_daily_impressions for update using (true);

create policy "Allow delete spotify daily impressions"
  on spotify_daily_impressions for delete using (true);
