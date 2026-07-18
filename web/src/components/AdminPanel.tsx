"use client";

import Link from "next/link";
import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { deleteMonth, emptyMonth, fetchAllMonths, monthLabel, upsertMonth } from "@/lib/analytics";
import { SEED_MONTHS } from "@/lib/seed";
import type { MonthlyMetric, MonthlyMetricInput } from "@/lib/supabase";
import { YoutubeCsvUpload } from "./YoutubeCsvUpload";
import { AppleCsvUpload } from "./AppleCsvUpload";
import { SpotifyCsvUpload } from "./SpotifyCsvUpload";

const ADMIN_KEY = "wgi-podcast-admin";

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="label mb-1.5 block">{label}</span>
      {children}
    </label>
  );
}

const inputClass = "field-input";

export default function AdminPanel() {
  const [authed, setAuthed] = useState(false);
  const [password, setPassword] = useState("");
  const [authError, setAuthError] = useState("");
  const [rows, setRows] = useState<MonthlyMetric[]>([]);
  const [form, setForm] = useState<MonthlyMetricInput>(emptyMonth(""));
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window !== "undefined" && sessionStorage.getItem(ADMIN_KEY) === "1") {
      setAuthed(true);
    }
  }, []);

  const load = useCallback(async () => {
    try {
      setRows(await fetchAllMonths());
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Load failed");
    }
  }, []);

  useEffect(() => {
    if (authed) load();
  }, [authed, load]);

  const expectedPassword = process.env.NEXT_PUBLIC_ADMIN_PASSWORD || "weidert";

  const login = (e: FormEvent) => {
    e.preventDefault();
    if (password === expectedPassword) {
      sessionStorage.setItem(ADMIN_KEY, "1");
      setAuthed(true);
      setAuthError("");
    } else {
      setAuthError("Incorrect password");
    }
  };

  const setNum = (key: keyof MonthlyMetricInput, value: string) => {
    const n = value === "" ? 0 : Number(value);
    setForm((f) => ({ ...f, [key]: Number.isFinite(n) ? n : 0 }));
  };

  const setText = (key: keyof MonthlyMetricInput, value: string) => {
    setForm((f) => ({ ...f, [key]: value }));
  };

  const editRow = (row: MonthlyMetric) => {
    const { id: _id, created_at: _c, updated_at: _u, ...rest } = row;
    setForm({
      ...rest,
      yt_top_clip: rest.yt_top_clip || "",
      yt_top_episode: rest.yt_top_episode || "",
      apple_top_episode: rest.apple_top_episode || "",
      spotify_top_episode: rest.spotify_top_episode || "",
      notes: rest.notes || "",
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const save = async (e: FormEvent) => {
    e.preventDefault();
    if (!form.month_end) {
      setError("Month end date is required");
      return;
    }
    setSaving(true);
    setMessage(null);
    setError(null);
    try {
      await upsertMonth(form);
      setMessage(`Saved ${monthLabel(form.month_end)}`);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const remove = async (monthEnd: string) => {
    if (!confirm(`Delete ${monthLabel(monthEnd)}?`)) return;
    try {
      await deleteMonth(monthEnd);
      await load();
      setMessage(`Deleted ${monthLabel(monthEnd)}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Delete failed");
    }
  };

  const seedAll = async () => {
    if (!confirm(`Import ${SEED_MONTHS.length} months from the Google Sheet history?`)) return;
    setSaving(true);
    setError(null);
    try {
      for (const row of SEED_MONTHS) {
        await upsertMonth(row);
      }
      await load();
      setMessage(`Imported ${SEED_MONTHS.length} months`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Seed failed");
    } finally {
      setSaving(false);
    }
  };

  const sorted = useMemo(() => [...rows].reverse(), [rows]);

  if (!authed) {
    return (
      <div className="min-h-screen flex items-center justify-center px-6">
        <form onSubmit={login} className="card p-9 w-full max-w-sm space-y-5">
          <div>
            <p className="label">Admin</p>
            <h1 className="font-display text-2xl font-medium tracking-tight mt-1.5">Sign in</h1>
          </div>
          <Field label="Password">
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={inputClass}
              autoFocus
            />
          </Field>
          {authError && <p className="text-sm text-yt">{authError}</p>}
          <button type="submit" className="btn-primary w-full">
            Continue
          </button>
          <Link
            href="/"
            className="block text-center text-xs text-ink-faint hover:text-ink transition-colors duration-150"
          >
            ← Back to dashboard
          </Link>
        </form>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <header className="border-b border-paper-hairline bg-white/75 backdrop-blur-md sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-6 py-5 flex items-center justify-between gap-4">
          <div>
            <p className="label">Admin</p>
            <h1 className="font-display text-2xl font-medium tracking-tight">Monthly data entry</h1>
          </div>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={seedAll}
              disabled={saving}
              className="btn-ghost disabled:opacity-50"
            >
              Import sheet history
            </button>
            <Link href="/" className="btn-primary !px-4 !py-2">
              View dashboard
            </Link>
          </div>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-6 py-10 space-y-8">
        {message && (
          <div className="card p-4 text-sm text-spotify !bg-green-50/90 !border-green-100">{message}</div>
        )}
        {error && <div className="card p-4 text-sm text-yt !bg-red-50/90 !border-red-100">{error}</div>}

        <YoutubeCsvUpload
          onImported={() => {
            load();
            setMessage("YouTube CSV imported — monthly YouTube fields updated");
          }}
        />

        <AppleCsvUpload
          onImported={() => {
            load();
            setMessage("Apple data saved — monthly Apple fields updated");
          }}
        />

        <SpotifyCsvUpload
          onImported={() => {
            load();
            setMessage("Spotify data saved — monthly Spotify fields updated");
          }}
        />

        <form onSubmit={save} className="card p-8 space-y-8">
          <div>
            <p className="label">Optional overrides</p>
            <h2 className="font-display text-xl font-medium tracking-tight mt-1.5">Manual edits & notes</h2>
            <p className="text-sm text-ink-muted mt-1.5 leading-relaxed">
              Prefer the platform cards above for monthly CSV + Followers / Hours. Use this form only to
              override values or add notes.
            </p>
          </div>

          <div className="flex flex-wrap items-end gap-4">
            <Field label="Month end date">
              <input
                type="date"
                required
                value={form.month_end}
                onChange={(e) => setText("month_end", e.target.value)}
                className={inputClass}
              />
            </Field>
            <p className="text-xs text-ink-muted pb-2">Use the last day of the month (e.g. 2026-06-30)</p>
          </div>

          <section>
            <h2 className="font-display text-xl mb-4 text-yt">YouTube</h2>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <Field label="Views">
                <input type="number" className={inputClass} value={form.yt_views} onChange={(e) => setNum("yt_views", e.target.value)} />
              </Field>
              <Field label="Watch time (hrs)">
                <input type="number" step="0.1" className={inputClass} value={form.yt_watch_time_hrs} onChange={(e) => setNum("yt_watch_time_hrs", e.target.value)} />
              </Field>
              <Field label="Avg view duration (min)">
                <input type="number" step="0.01" className={inputClass} value={form.yt_avg_view_duration_min} onChange={(e) => setNum("yt_avg_view_duration_min", e.target.value)} />
              </Field>
              <Field label="Avg % viewed">
                <input type="number" step="0.1" className={inputClass} value={form.yt_avg_pct_viewed} onChange={(e) => setNum("yt_avg_pct_viewed", e.target.value)} />
              </Field>
              <Field label="Unique viewers">
                <input type="number" className={inputClass} value={form.yt_unique_viewers} onChange={(e) => setNum("yt_unique_viewers", e.target.value)} />
              </Field>
              <Field label="Clip views">
                <input type="number" className={inputClass} value={form.yt_clip_views} onChange={(e) => setNum("yt_clip_views", e.target.value)} />
              </Field>
              <Field label="Top clip">
                <input type="text" className={inputClass} value={form.yt_top_clip || ""} onChange={(e) => setText("yt_top_clip", e.target.value)} />
              </Field>
              <Field label="Top episode">
                <input type="text" className={inputClass} value={form.yt_top_episode || ""} onChange={(e) => setText("yt_top_episode", e.target.value)} />
              </Field>
            </div>
          </section>

          <section>
            <h2 className="font-display text-xl mb-4 text-ink-muted">Apple (optional overrides)</h2>
            <p className="text-xs text-ink-muted mb-3">
              Prefer the Apple card above for CSV + Followers / Hours Listened.
            </p>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <Field label="Followers">
                <input type="number" className={inputClass} value={form.apple_followers} onChange={(e) => setNum("apple_followers", e.target.value)} />
              </Field>
              <Field label="Hours listened">
                <input type="number" step="0.1" className={inputClass} value={form.apple_hours_listened} onChange={(e) => setNum("apple_hours_listened", e.target.value)} />
              </Field>
              <Field label="Plays">
                <input type="number" className={inputClass} value={form.apple_plays} onChange={(e) => setNum("apple_plays", e.target.value)} />
              </Field>
              <Field label="Listeners">
                <input type="number" className={inputClass} value={form.apple_listeners} onChange={(e) => setNum("apple_listeners", e.target.value)} />
              </Field>
              <Field label="Engaged listeners">
                <input type="number" className={inputClass} value={form.apple_engaged_listeners} onChange={(e) => setNum("apple_engaged_listeners", e.target.value)} />
              </Field>
            </div>
          </section>

          <section>
            <h2 className="font-display text-xl mb-4 text-spotify">Spotify (optional overrides)</h2>
            <p className="text-xs text-ink-muted mb-3">
              Prefer the Spotify card above for CSV + Followers / Hours / Impressions. These fields are here if you need to edit plays or streams manually.
            </p>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <Field label="Followers">
                <input type="number" className={inputClass} value={form.spotify_followers} onChange={(e) => setNum("spotify_followers", e.target.value)} />
              </Field>
              <Field label="Hours played">
                <input type="number" step="0.1" className={inputClass} value={form.spotify_hours_played} onChange={(e) => setNum("spotify_hours_played", e.target.value)} />
              </Field>
              <Field label="Plays">
                <input type="number" className={inputClass} value={form.spotify_plays} onChange={(e) => setNum("spotify_plays", e.target.value)} />
              </Field>
              <Field label="Streams (>60s)">
                <input type="number" className={inputClass} value={form.spotify_streams_60s} onChange={(e) => setNum("spotify_streams_60s", e.target.value)} />
              </Field>
              <Field label="Listeners">
                <input type="number" className={inputClass} value={form.spotify_listeners} onChange={(e) => setNum("spotify_listeners", e.target.value)} />
              </Field>
            </div>
          </section>

          <Field label="Notes">
            <textarea
              rows={2}
              className={inputClass}
              value={form.notes || ""}
              onChange={(e) => setText("notes", e.target.value)}
            />
          </Field>

          <div className="flex gap-3">
            <button
              type="submit"
              disabled={saving}
              className="btn-primary !bg-accent hover:!bg-accent/90 disabled:opacity-50"
            >
              {saving ? "Saving…" : "Save month"}
            </button>
            <button
              type="button"
              onClick={() => setForm(emptyMonth(""))}
              className="btn-ghost"
            >
              Clear form
            </button>
          </div>
        </form>

        <div className="card overflow-hidden">
          <div className="px-7 py-5 border-b border-paper-hairline bg-paper-warm/50">
            <h2 className="font-display text-xl font-medium tracking-tight">Saved months ({rows.length})</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-[10px] font-semibold uppercase tracking-[0.14em] text-ink-muted bg-paper-warm/80">
                  <th className="px-7 py-3.5">Month</th>
                  <th className="px-4 py-3.5 text-right">YT</th>
                  <th className="px-4 py-3.5 text-right">Apple</th>
                  <th className="px-4 py-3.5 text-right">Spotify</th>
                  <th className="px-4 py-3.5" />
                </tr>
              </thead>
              <tbody className="divide-y divide-paper-hairline">
                {sorted.map((r) => (
                  <tr key={r.id} className="hover:bg-paper-warm/60 transition-colors duration-150">
                    <td className="px-7 py-3.5 font-medium text-ink-soft">{monthLabel(r.month_end)}</td>
                    <td className="px-4 py-3.5 text-right text-yt tabular-nums">{r.yt_views}</td>
                    <td className="px-4 py-3.5 text-right tabular-nums">{r.apple_plays}</td>
                    <td className="px-4 py-3.5 text-right text-spotify tabular-nums">{r.spotify_plays}</td>
                    <td className="px-4 py-3.5 text-right space-x-3">
                      <button
                        type="button"
                        onClick={() => editRow(r)}
                        className="text-accent hover:underline transition-colors duration-150"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => remove(r.month_end)}
                        className="text-ink-faint hover:text-yt transition-colors duration-150"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
