"use client";

import { FormEvent, useEffect, useState } from "react";
import {
  fetchAllMonths,
  importSpotifyCsv,
  importSpotifyImpressionsCsv,
  saveSpotifyManualMetrics,
} from "@/lib/analytics";
import { detectMonthFromFilename, lastDayOfMonth, previousCalendarMonth } from "@/lib/monthEnd";
import { aggregateSpotifyEpisodes, parseSpotifyCsv } from "@/lib/spotifyCsv";
import { parseSpotifyImpressionsCsv, summarizeImpressions } from "@/lib/spotifyImpressionsCsv";

type Props = {
  onImported: () => void;
};

const inputClass = "field-input";

export function SpotifyCsvUpload({ onImported }: Props) {
  const [month, setMonth] = useState(() => previousCalendarMonth());

  // Episode CSV
  const [fileName, setFileName] = useState<string | null>(null);
  const [csvText, setCsvText] = useState<string | null>(null);
  /** Month locked when the CSV was selected (avoids stale picker if filename auto-set) */
  const [csvMonth, setCsvMonth] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const [monthHint, setMonthHint] = useState<string | null>(null);

  // Impressions CSV
  const [impFileName, setImpFileName] = useState<string | null>(null);
  const [impText, setImpText] = useState<string | null>(null);
  const [impBusy, setImpBusy] = useState(false);
  const [impPreview, setImpPreview] = useState<string | null>(null);
  const [impOk, setImpOk] = useState<string | null>(null);

  // Manual
  const [followers, setFollowers] = useState(0);
  const [hoursPlayed, setHoursPlayed] = useState(0);
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
        setFollowers(Number(row?.spotify_followers ?? 0));
        setHoursPlayed(Number(row?.spotify_hours_played ?? 0));
      } catch {
        /* ignore */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [month, ok, manualOk]);

  const onEpisodeFile = async (file: File | null) => {
    setError(null);
    setOk(null);
    setPreview(null);
    setMonthHint(null);
    if (!file) {
      setFileName(null);
      setCsvText(null);
      setCsvMonth(null);
      return;
    }
    setFileName(file.name);
    const detected = detectMonthFromFilename(file.name);
    const target = detected ?? month;
    if (detected) {
      setMonth(detected);
      setMonthHint(
        `Reporting month set to ${detected} from filename (will save as ${lastDayOfMonth(detected)})`
      );
    }
    setCsvMonth(target);
    const text = await file.text();
    setCsvText(text);
    try {
      const episodes = parseSpotifyCsv(text);
      const agg = aggregateSpotifyEpisodes(episodes);
      setPreview(
        `${episodes.length} episodes · ${agg.episodesWithPlays} with plays · ${agg.spotify_plays} plays · ${agg.spotify_streams_60s} streams → ${lastDayOfMonth(target)}`
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not parse CSV");
      setCsvText(null);
      setCsvMonth(null);
    }
  };

  const onImpFile = async (file: File | null) => {
    setError(null);
    setImpOk(null);
    setImpPreview(null);
    if (!file) {
      setImpFileName(null);
      setImpText(null);
      return;
    }
    setImpFileName(file.name);
    const text = await file.text();
    setImpText(text);
    try {
      const rows = parseSpotifyImpressionsCsv(text);
      const s = summarizeImpressions(rows);
      setImpPreview(`${s.days} days · ${s.total.toLocaleString()} impressions · ${s.start} → ${s.end}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not parse impressions CSV");
      setImpText(null);
    }
  };

  const submitCsv = async (e: FormEvent) => {
    e.preventDefault();
    const targetMonth = csvMonth || month;
    if (!csvText || !targetMonth) return;
    setBusy(true);
    setError(null);
    setOk(null);
    try {
      const monthEnd = lastDayOfMonth(targetMonth);
      const { aggregate, episodeCount } = await importSpotifyCsv(monthEnd, csvText);
      setOk(
        `Saved to ${monthEnd}: ${episodeCount} episodes · ${aggregate.spotify_plays} plays · ${aggregate.spotify_streams_60s} streams · top “${aggregate.spotify_top_episode || "—"}”`
      );
      onImported();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Import failed");
    } finally {
      setBusy(false);
    }
  };

  const submitImpressions = async (e: FormEvent) => {
    e.preventDefault();
    if (!impText) return;
    setImpBusy(true);
    setError(null);
    setImpOk(null);
    try {
      const summary = await importSpotifyImpressionsCsv(impText);
      setImpOk(
        `Saved ${summary.days} days (${summary.total.toLocaleString()} impressions) · ${summary.start} → ${summary.end}`
      );
      onImported();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Impressions import failed");
    } finally {
      setImpBusy(false);
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
      await saveSpotifyManualMetrics(monthEnd, {
        spotify_followers: followers,
        spotify_hours_played: hoursPlayed,
      });
      setManualOk(`Saved Followers and Hours Played for ${monthEnd}`);
      onImported();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setManualBusy(false);
    }
  };

  return (
    <div className="card p-7 space-y-6 !border-spotify/20">
      <div>
        <p className="label text-spotify">Spotify</p>
        <h2 className="font-display text-xl font-medium tracking-tight mt-1.5">Month-end Spotify data</h2>
        <p className="text-sm text-ink-muted mt-1.5 leading-relaxed">
          Episode CSV for plays/streams, daily impressions CSV for the line chart, then Followers and Hours
          Played.
        </p>
      </div>

      <label className="block max-w-xs">
        <span className="label mb-1.5 block">Reporting month (for episode CSV + manual fields)</span>
        <input
          type="month"
          required
          value={month}
          onChange={(e) => {
            setMonth(e.target.value);
            setCsvMonth(e.target.value);
            setMonthHint(null);
          }}
          className={inputClass}
        />
        {monthHint && <p className="text-xs text-spotify mt-1.5">{monthHint}</p>}
      </label>

      <form onSubmit={submitCsv} className="space-y-4 pt-2 border-t border-paper-hairline">
        <h3 className="font-semibold text-sm text-ink">1. Episode CSV</h3>
        <p className="text-xs text-ink-muted">
          Columns: <code className="bg-paper px-1 rounded">name, plays, streams, audience_size, releaseDate</code>
          {" · "}
          Files named like <code className="bg-paper px-1 rounded">2026-05-01_to_2026-05-31.csv</code> auto-select
          May.
        </p>
        <input
          type="file"
          accept=".csv,text/csv"
          onChange={(e) => onEpisodeFile(e.target.files?.[0] ?? null)}
          className="w-full text-sm file:mr-3 file:px-3 file:py-2 file:rounded-lg file:border-0 file:bg-spotify file:text-white file:text-xs file:font-semibold"
        />
        {fileName && <p className="text-xs text-ink-muted">Selected: {fileName}</p>}
        {preview && <p className="text-sm text-ink bg-paper rounded-xl px-3 py-2">{preview}</p>}
        {ok && <p className="text-sm text-spotify bg-green-50 rounded-xl px-3 py-2">{ok}</p>}
        <button
          type="submit"
          disabled={busy || !csvText}
          className="btn-primary !bg-spotify hover:!bg-spotify/90 disabled:opacity-50"
        >
          {busy ? "Importing…" : `Import episode CSV → ${month ? lastDayOfMonth(month) : "…"}`}
        </button>
      </form>

      <form onSubmit={submitImpressions} className="space-y-4 pt-4 border-t border-paper-hairline">
        <h3 className="font-semibold text-sm text-ink">2. Daily impressions CSV</h3>
        <p className="text-xs text-ink-muted">
          Columns: <code className="bg-paper px-1 rounded">Date, Impressions</code> — powers the Spotify impressions
          line chart. Dates in the file are used (no month picker needed).
        </p>
        <input
          type="file"
          accept=".csv,text/csv"
          onChange={(e) => onImpFile(e.target.files?.[0] ?? null)}
          className="w-full text-sm file:mr-3 file:px-3 file:py-2 file:rounded-lg file:border-0 file:bg-spotify file:text-white file:text-xs file:font-semibold"
        />
        {impFileName && <p className="text-xs text-ink-muted">Selected: {impFileName}</p>}
        {impPreview && <p className="text-sm text-ink bg-paper rounded-xl px-3 py-2">{impPreview}</p>}
        {impOk && <p className="text-sm text-spotify bg-green-50 rounded-xl px-3 py-2">{impOk}</p>}
        <button
          type="submit"
          disabled={impBusy || !impText}
          className="btn-primary !bg-spotify hover:!bg-spotify/90 disabled:opacity-50"
        >
          {impBusy ? "Importing…" : "Import daily impressions"}
        </button>
      </form>

      <form onSubmit={submitManual} className="space-y-4 pt-4 border-t border-paper-hairline">
        <div>
          <h3 className="font-semibold text-sm text-ink">3. Manual metrics</h3>
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
            <span className="label mb-1.5 block">Hours Played</span>
            <input
              type="number"
              min={0}
              step="0.1"
              className={inputClass}
              value={hoursPlayed}
              onChange={(e) => setHoursPlayed(Number(e.target.value) || 0)}
            />
          </label>
        </div>
        {manualOk && <p className="text-sm text-spotify bg-green-50 rounded-xl px-3 py-2">{manualOk}</p>}
        <button
          type="submit"
          disabled={manualBusy}
          className="btn-primary disabled:opacity-50"
        >
          {manualBusy ? "Saving…" : "Save Followers · Hours Played"}
        </button>
      </form>

      {error && <p className="text-sm text-yt bg-red-50/90 rounded-xl px-3.5 py-2.5 border border-red-100">{error}</p>}
    </div>
  );
}
