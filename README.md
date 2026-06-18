# WGI Wistia Analytics

Automated Wistia → Supabase pipeline with a Weidert-themed web dashboard.

## Architecture

```
Wistia API  →  Python sync (scheduled)  →  Supabase  →  Next.js dashboard
```

## 1. Supabase setup

1. Open your [Supabase SQL Editor](https://supabase.com/dashboard)
2. Run the contents of `supabase/schema.sql`
3. Copy your **anon key** (dashboard) and optionally **service_role key** (sync writes)

## 2. Python sync

```bash
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
# Add WISTIA_API_TOKEN and SUPABASE_KEY
python scripts/sync.py
```

Schedule automatic sync:

```bash
python scripts/scheduler.py   # every 6 hours
```

## 3. Web dashboard

```bash
cd web
cp .env.example .env.local
# Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY
npm install
npm run dev
```

Open http://localhost:3000

## Environment variables

| Variable | Purpose |
|----------|---------|
| `WISTIA_API_TOKEN` | Wistia API access |
| `SUPABASE_URL` | `https://hnkgyxpsobjsjxfvhycb.supabase.co` |
| `SUPABASE_KEY` | Anon key (sync + read) |
| `SUPABASE_SERVICE_ROLE_KEY` | Optional — preferred for sync writes |
| `NEXT_PUBLIC_SUPABASE_*` | Same URL/key for the web app |

## Notes

- First sync with ~780 videos takes ~5–10 minutes
- Date filters on the dashboard read from Supabase daily metrics
- For production, use the **service_role** key only in the sync script (never in the browser)
