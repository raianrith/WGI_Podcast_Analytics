-- Run this if you already created podcast_monthly_metrics and only need the YouTube video table.

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

alter table youtube_video_metrics enable row level security;

drop policy if exists "Public read youtube video metrics" on youtube_video_metrics;
drop policy if exists "Allow insert youtube video metrics" on youtube_video_metrics;
drop policy if exists "Allow update youtube video metrics" on youtube_video_metrics;
drop policy if exists "Allow delete youtube video metrics" on youtube_video_metrics;

create policy "Public read youtube video metrics"
  on youtube_video_metrics for select using (true);
create policy "Allow insert youtube video metrics"
  on youtube_video_metrics for insert with check (true);
create policy "Allow update youtube video metrics"
  on youtube_video_metrics for update using (true);
create policy "Allow delete youtube video metrics"
  on youtube_video_metrics for delete using (true);
