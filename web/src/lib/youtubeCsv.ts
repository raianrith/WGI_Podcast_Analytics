/** Parse YouTube Studio "Table data.csv" exports */

export type ParsedYtVideo = {
  video_id: string;
  title: string;
  published_at: string | null;
  duration_seconds: number;
  engaged_views: number;
  avg_pct_viewed: number;
  impressions: number;
  ctr: number;
  unique_viewers: number;
  unique_reach: number;
  new_viewers: number;
  returning_viewers: number;
  views: number;
  watch_time_hrs: number;
  avg_view_duration_sec: number;
  subscribers: number;
  is_clip: boolean;
};

export type YtCsvAggregate = {
  yt_views: number;
  yt_watch_time_hrs: number;
  yt_avg_view_duration_min: number;
  yt_avg_pct_viewed: number;
  yt_unique_viewers: number;
  yt_clip_views: number;
  yt_top_clip: string;
  yt_top_episode: string;
  videoCount: number;
  videosWithViews: number;
};

function parseCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') {
      if (inQuotes && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (c === "," && !inQuotes) {
      out.push(cur);
      cur = "";
    } else {
      cur += c;
    }
  }
  out.push(cur);
  return out.map((s) => s.trim());
}

function toNum(v: string | undefined): number {
  if (!v || v === "") return 0;
  const n = Number(String(v).replace(/,/g, "").replace(/%/g, ""));
  return Number.isFinite(n) ? n : 0;
}

/** "0:06:52" or "6:52" → seconds */
function parseDuration(v: string | undefined): number {
  if (!v || !v.trim()) return 0;
  const parts = v.trim().split(":").map((p) => Number(p));
  if (parts.some((p) => !Number.isFinite(p))) return 0;
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  if (parts.length === 1) return parts[0];
  return 0;
}

/** "Jun 10, 2026" → yyyy-MM-dd */
function parsePublishDate(v: string | undefined): string | null {
  if (!v || !v.trim()) return null;
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString().slice(0, 10);
}

function isClipTitle(title: string, durationSeconds: number): boolean {
  const t = title.toLowerCase();
  if (/\bclip\b/.test(t) || /\bmini\b/.test(t) || /\bicymi\b/.test(t) || /trailer/i.test(t)) {
    return true;
  }
  // Short form under ~3 minutes often treated as clip content
  return durationSeconds > 0 && durationSeconds < 180;
}

export function parseYoutubeStudioCsv(
  text: string,
  options?: { kind?: "videos" | "clips" }
): ParsedYtVideo[] {
  const kind = options?.kind;
  const lines = text
    .replace(/^\uFEFF/, "")
    .split(/\r?\n/)
    .filter((l) => l.trim().length > 0);
  if (lines.length < 2) throw new Error("CSV has no data rows");

  const headers = parseCsvLine(lines[0]).map((h) => h.toLowerCase());
  const exact = (name: string) => headers.findIndex((h) => h === name.toLowerCase());
  const includes = (name: string) => headers.findIndex((h) => h.includes(name.toLowerCase()));
  const idx = (name: string) => {
    const e = exact(name);
    return e >= 0 ? e : includes(name);
  };

  const col = {
    content: idx("content"),
    title: idx("video title"),
    publish: idx("video publish time"),
    duration: exact("duration") >= 0 ? exact("duration") : idx("duration"),
    engaged: idx("engaged views"),
    avgPct: idx("average percentage viewed"),
    impressions: exact("impressions") >= 0 ? exact("impressions") : idx("impressions"),
    ctr: idx("impressions click-through"),
    unique: exact("unique viewers") >= 0 ? exact("unique viewers") : idx("unique viewers"),
    reach: idx("unique reach"),
    newViewers: idx("new viewers"),
    returning: idx("returning viewers"),
    views: exact("views"),
    // Prefer exact "watch time (hours)" — not "playlist watch time (hours)"
    watch: exact("watch time (hours)") >= 0 ? exact("watch time (hours)") : idx("watch time"),
    avgDur: idx("average view duration"),
    subs: exact("subscribers") >= 0 ? exact("subscribers") : idx("subscribers"),
  };

  if (col.content < 0 || col.title < 0 || col.views < 0) {
    throw new Error(
      'CSV must be a YouTube Studio "Table data" export with Content, Video title, and Views columns'
    );
  }

  const videos: ParsedYtVideo[] = [];

  for (let i = 1; i < lines.length; i++) {
    const cells = parseCsvLine(lines[i]);
    const video_id = cells[col.content]?.trim();
    const title = cells[col.title]?.trim();
    if (!video_id || !title) continue;

    const duration_seconds =
      col.duration >= 0 && /^\d+$/.test(cells[col.duration] || "")
        ? toNum(cells[col.duration])
        : parseDuration(cells[col.duration]);

    const is_clip =
      kind === "clips" ? true : kind === "videos" ? false : isClipTitle(title, duration_seconds);

    videos.push({
      video_id,
      title: title.replace(/&amp;/g, "&"),
      published_at: col.publish >= 0 ? parsePublishDate(cells[col.publish]) : null,
      duration_seconds,
      engaged_views: col.engaged >= 0 ? toNum(cells[col.engaged]) : 0,
      avg_pct_viewed: col.avgPct >= 0 ? toNum(cells[col.avgPct]) : 0,
      impressions: col.impressions >= 0 ? toNum(cells[col.impressions]) : 0,
      ctr: col.ctr >= 0 ? toNum(cells[col.ctr]) : 0,
      unique_viewers: col.unique >= 0 ? toNum(cells[col.unique]) : 0,
      unique_reach: col.reach >= 0 ? toNum(cells[col.reach]) : 0,
      new_viewers: col.newViewers >= 0 ? toNum(cells[col.newViewers]) : 0,
      returning_viewers: col.returning >= 0 ? toNum(cells[col.returning]) : 0,
      views: toNum(cells[col.views]),
      watch_time_hrs: col.watch >= 0 ? toNum(cells[col.watch]) : 0,
      avg_view_duration_sec: col.avgDur >= 0 ? parseDuration(cells[col.avgDur]) : 0,
      subscribers: col.subs >= 0 ? toNum(cells[col.subs]) : 0,
      is_clip,
    });
  }

  if (!videos.length) throw new Error("No video rows found in CSV");
  return videos;
}

export function aggregateYoutubeVideos(videos: ParsedYtVideo[]): YtCsvAggregate {
  const totalViews = videos.reduce((s, v) => s + v.views, 0);
  const totalWatch = videos.reduce((s, v) => s + v.watch_time_hrs, 0);

  // View-weighted averages (ignore zero-view rows for quality metrics)
  let pctNum = 0;
  let pctDen = 0;
  let durNum = 0;
  let durDen = 0;
  for (const v of videos) {
    if (v.views <= 0) continue;
    if (v.avg_pct_viewed > 0) {
      pctNum += v.avg_pct_viewed * v.views;
      pctDen += v.views;
    }
    if (v.avg_view_duration_sec > 0) {
      durNum += v.avg_view_duration_sec * v.views;
      durDen += v.views;
    }
  }

  const clips = videos.filter((v) => v.is_clip);
  const episodes = videos.filter((v) => !v.is_clip);

  const topClip = [...clips].sort((a, b) => b.views - a.views)[0];
  const topEpisode = [...episodes].sort((a, b) => b.views - a.views)[0];
  const topAny = [...videos].sort((a, b) => b.views - a.views)[0];

  // Unique viewers: sum of per-video uniques (Studio table export has no channel unique).
  const uniqueSum = videos.reduce((s, v) => s + v.unique_viewers, 0);

  return {
    yt_views: totalViews,
    yt_watch_time_hrs: Math.round(totalWatch * 100) / 100,
    yt_avg_view_duration_min:
      durDen > 0
        ? Math.round((durNum / durDen / 60) * 100) / 100
        : totalViews > 0
          ? Math.round(((totalWatch * 60) / totalViews) * 100) / 100
          : 0,
    yt_avg_pct_viewed: pctDen > 0 ? Math.round((pctNum / pctDen) * 100) / 100 : 0,
    yt_unique_viewers: uniqueSum,
    yt_clip_views: clips.length ? clips.reduce((s, v) => s + v.views, 0) : totalViews,
    yt_top_clip: topClip && topClip.views > 0 ? topClip.title : topAny && videos.every((v) => v.is_clip) && topAny.views > 0 ? topAny.title : "",
    yt_top_episode:
      topEpisode && topEpisode.views > 0
        ? topEpisode.title
        : topAny && videos.every((v) => !v.is_clip) && topAny.views > 0
          ? topAny.title
          : "",
    videoCount: videos.length,
    videosWithViews: videos.filter((v) => v.views > 0).length,
  };
}
