-- Run if podcast_monthly_metrics already exists and you only need Apple episode storage.

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

alter table apple_episode_metrics enable row level security;

drop policy if exists "Public read apple episode metrics" on apple_episode_metrics;
drop policy if exists "Allow insert apple episode metrics" on apple_episode_metrics;
drop policy if exists "Allow update apple episode metrics" on apple_episode_metrics;
drop policy if exists "Allow delete apple episode metrics" on apple_episode_metrics;

create policy "Public read apple episode metrics"
  on apple_episode_metrics for select using (true);
create policy "Allow insert apple episode metrics"
  on apple_episode_metrics for insert with check (true);
create policy "Allow update apple episode metrics"
  on apple_episode_metrics for update using (true);
create policy "Allow delete apple episode metrics"
  on apple_episode_metrics for delete using (true);
