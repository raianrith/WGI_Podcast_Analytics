"use client";

import { FormEvent, useState } from "react";
import { importYoutubeCsv } from "@/lib/analytics";
import { detectMonthFromFilename, lastDayOfMonth, previousCalendarMonth } from "@/lib/monthEnd";
import { aggregateYoutubeVideos, parseYoutubeStudioCsv } from "@/lib/youtubeCsv";

type Props = {
  onImported: () => void;
};

type Kind = "videos" | "clips";

type UploadSlot = {
  fileName: string | null;
  csvText: string | null;
  preview: string | null;
  busy: boolean;
  ok: string | null;
};

const emptySlot = (): UploadSlot => ({
  fileName: null,
  csvText: null,
  preview: null,
  busy: false,
  ok: null,
});

export function YoutubeCsvUpload({ onImported }: Props) {
  const [month, setMonth] = useState(() => previousCalendarMonth());
  const [videos, setVideos] = useState<UploadSlot>(emptySlot);
  const [clips, setClips] = useState<UploadSlot>(emptySlot);
  const [error, setError] = useState<string | null>(null);

  const onFile = async (kind: Kind, file: File | null) => {
    setError(null);
    const setSlot = kind === "videos" ? setVideos : setClips;
    setSlot((s) => ({ ...s, ok: null, preview: null }));
    if (!file) {
      setSlot(emptySlot());
      return;
    }
    const detected = detectMonthFromFilename(file.name);
    if (detected) setMonth(detected);
    const text = await file.text();
    try {
      const rows = parseYoutubeStudioCsv(text, { kind });
      const agg = aggregateYoutubeVideos(rows);
      setSlot({
        fileName: file.name,
        csvText: text,
        preview:
          kind === "clips"
            ? `${rows.length} clips · ${agg.videosWithViews} with views · ${agg.yt_clip_views} clip views · ${agg.yt_watch_time_hrs} hrs`
            : `${rows.length} videos · ${agg.videosWithViews} with views · ${agg.yt_views} views · ${agg.yt_watch_time_hrs} hrs`,
        busy: false,
        ok: null,
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not parse CSV");
      setSlot(emptySlot());
    }
  };

  const submit = async (e: FormEvent, kind: Kind) => {
    e.preventDefault();
    const slot = kind === "videos" ? videos : clips;
    const setSlot = kind === "videos" ? setVideos : setClips;
    if (!slot.csvText || !month) return;
    setSlot((s) => ({ ...s, busy: true, ok: null }));
    setError(null);
    try {
      const monthEnd = lastDayOfMonth(month);
      const { aggregate, videoCount } = await importYoutubeCsv(monthEnd, slot.csvText, kind);
      setSlot((s) => ({
        ...s,
        busy: false,
        ok:
          kind === "clips"
            ? `Saved ${videoCount} clips to ${monthEnd}: ${aggregate.yt_clip_views} views · top “${aggregate.yt_top_clip || "—"}”`
            : `Saved ${videoCount} videos to ${monthEnd}: ${aggregate.yt_views} views · top “${aggregate.yt_top_episode || "—"}”`,
      }));
      onImported();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Import failed");
      setSlot((s) => ({ ...s, busy: false }));
    }
  };

  return (
    <div className="card p-7 space-y-6 !border-yt/15">
      <div>
        <p className="label text-yt">YouTube</p>
        <h2 className="font-display text-xl font-medium tracking-tight mt-1.5">Month-end YouTube data</h2>
        <p className="text-sm text-ink-muted mt-1.5 leading-relaxed">
          Upload separate Studio <strong>Table data</strong> exports for playlist videos and playlist clips.
          Each import only replaces that content type for the month.
        </p>
      </div>

      <label className="block max-w-xs">
        <span className="label mb-1.5 block">Reporting month</span>
        <input
          type="month"
          required
          value={month}
          onChange={(e) => setMonth(e.target.value)}
          className="field-input"
        />
      </label>

      <form onSubmit={(e) => submit(e, "videos")} className="space-y-4 pt-2 border-t border-paper-hairline">
        <h3 className="font-semibold text-sm text-ink">1. Playlist Videos CSV</h3>
        <p className="text-xs text-ink-muted">Full episodes / long-form playlist export.</p>
        <input
          type="file"
          accept=".csv,text/csv"
          onChange={(e) => onFile("videos", e.target.files?.[0] ?? null)}
          className="w-full text-sm file:mr-3 file:px-3.5 file:py-2 file:rounded-lg file:border-0 file:bg-yt file:text-white file:text-xs file:font-semibold file:transition-opacity file:duration-150 hover:file:opacity-90"
        />
        {videos.fileName && <p className="text-xs text-ink-faint">Selected: {videos.fileName}</p>}
        {videos.preview && (
          <p className="text-sm text-ink bg-paper-warm rounded-xl px-3.5 py-2.5 border border-paper-hairline">
            {videos.preview}
          </p>
        )}
        {videos.ok && (
          <p className="text-sm text-spotify bg-green-50/90 rounded-xl px-3.5 py-2.5 border border-green-100">
            {videos.ok}
          </p>
        )}
        <button
          type="submit"
          disabled={videos.busy || !videos.csvText}
          className="btn-primary !bg-yt hover:!bg-yt/90 disabled:opacity-50"
        >
          {videos.busy ? "Importing…" : `Import playlist videos → ${month ? lastDayOfMonth(month) : "…"}`}
        </button>
      </form>

      <form onSubmit={(e) => submit(e, "clips")} className="space-y-4 pt-4 border-t border-paper-hairline">
        <h3 className="font-semibold text-sm text-ink">2. Playlist Clips CSV</h3>
        <p className="text-xs text-ink-muted">
          Separate clips export (e.g. <code className="bg-paper px-1 rounded">WGI_YT_CLIPS_JUNE - Table data.csv</code>).
        </p>
        <input
          type="file"
          accept=".csv,text/csv"
          onChange={(e) => onFile("clips", e.target.files?.[0] ?? null)}
          className="w-full text-sm file:mr-3 file:px-3.5 file:py-2 file:rounded-lg file:border-0 file:bg-yt file:text-white file:text-xs file:font-semibold file:transition-opacity file:duration-150 hover:file:opacity-90"
        />
        {clips.fileName && <p className="text-xs text-ink-faint">Selected: {clips.fileName}</p>}
        {clips.preview && (
          <p className="text-sm text-ink bg-paper-warm rounded-xl px-3.5 py-2.5 border border-paper-hairline">
            {clips.preview}
          </p>
        )}
        {clips.ok && (
          <p className="text-sm text-spotify bg-green-50/90 rounded-xl px-3.5 py-2.5 border border-green-100">
            {clips.ok}
          </p>
        )}
        <button
          type="submit"
          disabled={clips.busy || !clips.csvText}
          className="btn-primary !bg-yt hover:!bg-yt/90 disabled:opacity-50"
        >
          {clips.busy ? "Importing…" : `Import playlist clips → ${month ? lastDayOfMonth(month) : "…"}`}
        </button>
      </form>

      {error && (
        <p className="text-sm text-yt bg-red-50/90 rounded-xl px-3.5 py-2.5 border border-red-100">{error}</p>
      )}

      <p className="text-[11px] text-ink-faint leading-relaxed">
        Unique viewers are summed from each row (Studio table export has no channel-level unique). Apple and Spotify
        for the same month are left unchanged.
      </p>
    </div>
  );
}
