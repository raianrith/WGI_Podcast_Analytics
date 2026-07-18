-- Run if podcast_monthly_metrics already exists and you only need Spotify episode storage.

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

alter table spotify_episode_metrics enable row level security;

drop policy if exists "Public read spotify episode metrics" on spotify_episode_metrics;
drop policy if exists "Allow insert spotify episode metrics" on spotify_episode_metrics;
drop policy if exists "Allow update spotify episode metrics" on spotify_episode_metrics;
drop policy if exists "Allow delete spotify episode metrics" on spotify_episode_metrics;

create policy "Public read spotify episode metrics"
  on spotify_episode_metrics for select using (true);
create policy "Allow insert spotify episode metrics"
  on spotify_episode_metrics for insert with check (true);
create policy "Allow update spotify episode metrics"
  on spotify_episode_metrics for update using (true);
create policy "Allow delete spotify episode metrics"
  on spotify_episode_metrics for delete using (true);
