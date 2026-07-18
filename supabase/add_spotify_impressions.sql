-- Daily Spotify impressions (from Spotify for Creators daily export)

create table if not exists spotify_daily_impressions (
  id uuid primary key default gen_random_uuid(),
  impression_date date not null unique,
  impressions integer not null default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists idx_spotify_impressions_date
  on spotify_daily_impressions (impression_date desc);

alter table spotify_daily_impressions enable row level security;

drop policy if exists "Public read spotify daily impressions" on spotify_daily_impressions;
drop policy if exists "Allow insert spotify daily impressions" on spotify_daily_impressions;
drop policy if exists "Allow update spotify daily impressions" on spotify_daily_impressions;
drop policy if exists "Allow delete spotify daily impressions" on spotify_daily_impressions;

create policy "Public read spotify daily impressions"
  on spotify_daily_impressions for select using (true);
create policy "Allow insert spotify daily impressions"
  on spotify_daily_impressions for insert with check (true);
create policy "Allow update spotify daily impressions"
  on spotify_daily_impressions for update using (true);
create policy "Allow delete spotify daily impressions"
  on spotify_daily_impressions for delete using (true);
