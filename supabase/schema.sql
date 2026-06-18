-- Run this in Supabase SQL Editor: https://supabase.com/dashboard/project/_/sql

create extension if not exists "pgcrypto";

create table if not exists wistia_projects (
  id uuid primary key default gen_random_uuid(),
  external_id text unique not null,
  name text not null,
  media_count integer default 0,
  updated_at timestamptz default now()
);

create table if not exists wistia_channels (
  id uuid primary key default gen_random_uuid(),
  external_id text unique not null,
  name text not null,
  episode_count integer default 0,
  updated_at timestamptz default now()
);

create table if not exists wistia_videos (
  id uuid primary key default gen_random_uuid(),
  external_id text unique not null,
  title text not null,
  published_at timestamptz,
  duration_seconds integer,
  url text,
  project_id text,
  project_name text,
  channel_id text,
  channel_name text,
  raw_metadata jsonb,
  updated_at timestamptz default now()
);

create table if not exists wistia_daily_metrics (
  id uuid primary key default gen_random_uuid(),
  metric_date date not null,
  metric_name text not null,
  metric_value numeric not null,
  video_external_id text,
  project_id text,
  channel_id text,
  dimensions jsonb,
  unique (metric_date, metric_name, video_external_id)
);

create table if not exists wistia_sync_runs (
  id uuid primary key default gen_random_uuid(),
  status text not null,
  records_synced integer default 0,
  error_message text,
  started_at timestamptz default now(),
  completed_at timestamptz
);

create index if not exists idx_metrics_date on wistia_daily_metrics (metric_date);
create index if not exists idx_metrics_video on wistia_daily_metrics (video_external_id);
create index if not exists idx_metrics_name on wistia_daily_metrics (metric_name);
create index if not exists idx_videos_project on wistia_videos (project_name);

alter table wistia_projects enable row level security;
alter table wistia_channels enable row level security;
alter table wistia_videos enable row level security;
alter table wistia_daily_metrics enable row level security;
alter table wistia_sync_runs enable row level security;

create policy "Allow public read projects" on wistia_projects for select using (true);
create policy "Allow public read channels" on wistia_channels for select using (true);
create policy "Allow public read videos" on wistia_videos for select using (true);
create policy "Allow public read metrics" on wistia_daily_metrics for select using (true);
create policy "Allow public read sync_runs" on wistia_sync_runs for select using (true);

-- Sync writes: use service_role key in Python, or add these for anon (internal tools only)
create policy "Allow insert projects" on wistia_projects for insert with check (true);
create policy "Allow update projects" on wistia_projects for update using (true);
create policy "Allow insert channels" on wistia_channels for insert with check (true);
create policy "Allow update channels" on wistia_channels for update using (true);
create policy "Allow insert videos" on wistia_videos for insert with check (true);
create policy "Allow update videos" on wistia_videos for update using (true);
create policy "Allow insert metrics" on wistia_daily_metrics for insert with check (true);
create policy "Allow update metrics" on wistia_daily_metrics for update using (true);
create policy "Allow delete metrics" on wistia_daily_metrics for delete using (true);
create policy "Allow insert sync_runs" on wistia_sync_runs for insert with check (true);
create policy "Allow update sync_runs" on wistia_sync_runs for update using (true);
