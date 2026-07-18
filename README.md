# ChangeOver Podcast Analytics

Monthly podcast performance dashboard for **YouTube**, **Apple Podcasts**, and **Spotify**.

Data is entered manually each month via the admin panel (replacing the Google Sheet / Databox workflow).

## Architecture

```
Admin form (monthly entry) → Supabase → Next.js dashboard
```

## 1. Supabase

1. Open [Supabase SQL Editor](https://supabase.com/dashboard)
2. Run `supabase/schema.sql` (creates `podcast_monthly_metrics`)
3. Copy project URL + anon key

## 2. Web app

```bash
cd web
cp .env.example .env.local
# fill in NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY
npm install
npm run dev
```

- Dashboard: http://localhost:3000
- Admin: http://localhost:3000/admin

Default admin password: `weidert` (override with `NEXT_PUBLIC_ADMIN_PASSWORD`)

## 3. Import historical sheet data

In Admin → **Import sheet history** to load months from the old Google Sheet (Sep 2024–Nov 2025).

## Dashboard structure

| Tab | What you see |
|-----|----------------|
| **Overview** | Total plays, platform share, multi-line trends, top episodes |
| **YouTube** | Views vs unique, watch time, % viewed, clips |
| **Apple** | Plays, listeners vs engaged, followers, hours |
| **Spotify** | Plays vs streams (>60s), listeners, impressions, hours |

## Monthly workflow

1. **YouTube** — Export Studio **Table data** CSV → Admin → **Upload Studio CSV**
2. **Spotify** — Upload episode CSV (`name, plays, streams, audience_size, releaseDate`) → Admin → **Upload episode CSV**
3. **Apple + Spotify extras** — Enter Apple totals and Spotify followers / impressions / hours in the manual form
4. Dashboard updates after each save/import

YouTube and Spotify CSV imports store episode/video rows and roll totals into that month’s metrics.
