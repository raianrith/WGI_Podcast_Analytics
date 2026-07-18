"use client";

import { FormEvent, useEffect, useState } from "react";
import { fetchAllMonths, importAppleCsv, saveAppleManualMetrics } from "@/lib/analytics";
import { aggregateAppleEpisodes, parseAppleCsv } from "@/lib/appleCsv";
import { lastDayOfMonth, previousCalendarMonth } from "@/lib/monthEnd";

type Props = {
  onImported: () => void;
};

const inputClass = "field-input";

export function AppleCsvUpload({ onImported }: Props) {
  const [month, setMonth] = useState(() => previousCalendarMonth());

  const [fileName, setFileName] = useState<string | null>(null);
  const [csvText, setCsvText] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);

  const [followers, setFollowers] = useState(0);
  const [hoursListened, setHoursListened] = useState(0);
  const [manualBusy, setManualBusy] = useState(false);
  const [manualOk, setManualOk] = useState<string | null>(null);

  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const months = await fetchAllMonths();
        const monthEnd = lastDayOfMonth(month);
        const row = months.find((m) => m.month_end === monthEnd);
        if (cancelled) return;
        setFollowers(Number(row?.apple_followers ?? 0));
        setHoursListened(Number(row?.apple_hours_listened ?? 0));
      } catch {
        /* ignore */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [month, ok, manualOk]);

  const onFile = async (file: File | null) => {
    setError(null);
    setOk(null);
    setPreview(null);
    if (!file) {
      setFileName(null);
      setCsvText(null);
      return;
    }
    setFileName(file.name);
    const text = await file.text();
    setCsvText(text);
    try {
      const episodes = parseAppleCsv(text);
      const agg = aggregateAppleEpisodes(episodes);
      setPreview(
        `${episodes.length} episodes · ${agg.episodesWithPlays} with plays · ${agg.apple_plays} plays · ${agg.apple_listeners} listeners*`
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not parse CSV");
      setCsvText(null);
    }
  };

  const submitCsv = async (e: FormEvent) => {
    e.preventDefault();
    if (!csvText || !month) return;
    setBusy(true);
    setError(null);
    setOk(null);
    try {
      const monthEnd = lastDayOfMonth(month);
      const { aggregate, episodeCount } = await importAppleCsv(monthEnd, csvText);
      setOk(
        `Imported ${episodeCount} episodes for ${monthEnd}: ${aggregate.apple_plays} plays, top “${aggregate.apple_top_episode || "—"}”`
      );
      onImported();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Import failed");
    } finally {
      setBusy(false);
    }
  };

  const submitManual = async (e: FormEvent) => {
    e.preventDefault();
    if (!month) return;
    setManualBusy(true);
    setManualOk(null);
    setError(null);
    try {
      const monthEnd = lastDayOfMonth(month);
      await saveAppleManualMetrics(monthEnd, {
        apple_followers: followers,
        apple_hours_listened: hoursListened,
      });
      setManualOk(`Saved Followers and Hours Listened for ${monthEnd}`);
      onImported();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setManualBusy(false);
    }
  };

  return (
    <div className="card p-7 space-y-6">
      <div>
        <p className="label text-ink-muted">Apple Podcasts</p>
        <h2 className="font-display text-xl font-medium tracking-tight mt-1.5">Month-end Apple data</h2>
        <p className="text-sm text-ink-muted mt-1.5 leading-relaxed">
          Episode CSV for plays / listeners / engaged, then Followers and Hours Listened manually.
        </p>
      </div>

      <label className="block max-w-xs">
        <span className="label mb-1.5 block">Reporting month</span>
        <input type="month" required value={month} onChange={(e) => setMonth(e.target.value)} className={inputClass} />
      </label>

      <form onSubmit={submitCsv} className="space-y-4 pt-2 border-t border-paper-hairline">
        <h3 className="font-semibold text-sm text-ink">1. Episode CSV</h3>
        <p className="text-xs text-ink-muted">
          Apple Podcasts Connect export with{" "}
          <code className="bg-paper px-1 rounded">Episode Title, Unique Listeners, Unique Engaged Listeners, Plays</code>
        </p>
        <input
          type="file"
          accept=".csv,text/csv"
          onChange={(e) => onFile(e.target.files?.[0] ?? null)}
          className="w-full text-sm file:mr-3 file:px-3 file:py-2 file:rounded-lg file:border-0 file:bg-ink file:text-white file:text-xs file:font-semibold"
        />
        {fileName && <p className="text-xs text-ink-muted">Selected: {fileName}</p>}
        {preview && <p className="text-sm text-ink bg-paper rounded-xl px-3 py-2">{preview}</p>}
        {ok && <p className="text-sm text-spotify bg-green-50 rounded-xl px-3 py-2">{ok}</p>}
        <button
          type="submit"
          disabled={busy || !csvText}
          className="btn-primary disabled:opacity-50"
        >
          {busy ? "Importing…" : "Import episode CSV"}
        </button>
      </form>

      <form onSubmit={submitManual} className="space-y-4 pt-4 border-t border-paper-hairline">
        <div>
          <h3 className="font-semibold text-sm text-ink">2. Manual metrics</h3>
          <p className="text-xs text-ink-muted mt-1">Enter for the reporting month selected above.</p>
        </div>
        <div className="grid sm:grid-cols-2 gap-4 max-w-lg">
          <label className="block">
            <span className="label mb-1.5 block">Followers</span>
            <input
              type="number"
              min={0}
              className={inputClass}
              value={followers}
              onChange={(e) => setFollowers(Number(e.target.value) || 0)}
            />
          </label>
          <label className="block">
            <span className="label mb-1.5 block">Hours Listened</span>
            <input
              type="number"
              min={0}
              step="0.1"
              className={inputClass}
              value={hoursListened}
              onChange={(e) => setHoursListened(Number(e.target.value) || 0)}
            />
          </label>
        </div>
        {manualOk && <p className="text-sm text-spotify bg-green-50 rounded-xl px-3 py-2">{manualOk}</p>}
        <button
          type="submit"
          disabled={manualBusy}
          className="btn-primary disabled:opacity-50"
        >
          {manualBusy ? "Saving…" : "Save Followers · Hours Listened"}
        </button>
      </form>

      {error && <p className="text-sm text-yt bg-red-50/90 rounded-xl px-3.5 py-2.5 border border-red-100">{error}</p>}
    </div>
  );
}
