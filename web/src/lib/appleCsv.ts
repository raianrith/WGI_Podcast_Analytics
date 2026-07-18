/** Parse Apple Podcasts Connect episode CSV exports */

export type ParsedAppleEpisode = {
  episode_id: string;
  episode_guid: string | null;
  episode_number: string | null;
  episode_title: string;
  show_name: string | null;
  release_date: string | null;
  duration_seconds: number;
  unique_listeners: number;
  unique_engaged_listeners: number;
  plays: number;
  average_consumption: number;
};

export type AppleCsvAggregate = {
  apple_plays: number;
  apple_listeners: number;
  apple_engaged_listeners: number;
  apple_top_episode: string;
  episodeCount: number;
  episodesWithPlays: number;
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
  if (!v || v === "" || v.toLowerCase() === "nan") return 0;
  const n = Number(String(v).replace(/,/g, ""));
  return Number.isFinite(n) ? n : 0;
}

function parseDate(v: string | undefined): string | null {
  if (!v || !v.trim() || v.toLowerCase() === "nan") return null;
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString().slice(0, 10);
}

function cell(cells: string[], idx: number): string {
  return (cells[idx] ?? "").replace(/^"|"$/g, "").trim();
}

export function parseAppleCsv(text: string): ParsedAppleEpisode[] {
  const lines = text
    .replace(/^\uFEFF/, "")
    .split(/\r?\n/)
    .filter((l) => l.trim().length > 0);
  if (lines.length < 2) throw new Error("CSV has no data rows");

  const headers = parseCsvLine(lines[0]).map((h) => h.toLowerCase().replace(/^"|"$/g, ""));
  const exact = (name: string) => headers.findIndex((h) => h === name);
  const includes = (name: string) => headers.findIndex((h) => h.includes(name));

  const showIdx = exact("show name") >= 0 ? exact("show name") : includes("show");
  const idIdx = exact("episode id") >= 0 ? exact("episode id") : includes("episode id");
  const guidIdx = exact("episode guid") >= 0 ? exact("episode guid") : includes("guid");
  const numIdx = exact("episode number") >= 0 ? exact("episode number") : includes("episode number");
  const titleIdx =
    exact("episode title") >= 0 ? exact("episode title") : includes("episode title") >= 0 ? includes("episode title") : includes("title");
  const releaseIdx = exact("release date") >= 0 ? exact("release date") : includes("release");
  const durationIdx = exact("duration");
  const listenersIdx =
    exact("unique listeners") >= 0 ? exact("unique listeners") : includes("unique listeners");
  const engagedIdx =
    exact("unique engaged listeners") >= 0
      ? exact("unique engaged listeners")
      : includes("engaged");
  const playsIdx = exact("plays");
  const consumptionIdx =
    exact("average consumption") >= 0 ? exact("average consumption") : includes("consumption");

  if (idIdx < 0 || titleIdx < 0 || playsIdx < 0) {
    throw new Error(
      'CSV must include "Episode ID", "Episode Title", and "Plays" (Apple Podcasts Connect export)'
    );
  }

  const episodes: ParsedAppleEpisode[] = [];

  for (let i = 1; i < lines.length; i++) {
    const cells = parseCsvLine(lines[i]);
    const episode_id = cell(cells, idIdx);
    const episode_title = cell(cells, titleIdx);
    if (!episode_id || !episode_title) continue;

    episodes.push({
      episode_id,
      episode_guid: guidIdx >= 0 ? cell(cells, guidIdx) || null : null,
      episode_number: numIdx >= 0 ? cell(cells, numIdx) || null : null,
      episode_title,
      show_name: showIdx >= 0 ? cell(cells, showIdx) || null : null,
      release_date: releaseIdx >= 0 ? parseDate(cell(cells, releaseIdx)) : null,
      duration_seconds: durationIdx >= 0 ? Math.round(toNum(cell(cells, durationIdx))) : 0,
      unique_listeners: listenersIdx >= 0 ? Math.round(toNum(cell(cells, listenersIdx))) : 0,
      unique_engaged_listeners: engagedIdx >= 0 ? Math.round(toNum(cell(cells, engagedIdx))) : 0,
      plays: Math.round(toNum(cell(cells, playsIdx))),
      average_consumption: consumptionIdx >= 0 ? toNum(cell(cells, consumptionIdx)) : 0,
    });
  }

  if (!episodes.length) throw new Error("No episode rows found in CSV");
  return episodes;
}

export function aggregateAppleEpisodes(episodes: ParsedAppleEpisode[]): AppleCsvAggregate {
  const plays = episodes.reduce((s, e) => s + e.plays, 0);
  const listeners = episodes.reduce((s, e) => s + e.unique_listeners, 0);
  const engaged = episodes.reduce((s, e) => s + e.unique_engaged_listeners, 0);
  const top = [...episodes].sort(
    (a, b) => b.plays - a.plays || b.unique_listeners - a.unique_listeners
  )[0];

  return {
    apple_plays: plays,
    apple_listeners: listeners,
    apple_engaged_listeners: engaged,
    apple_top_episode: top && top.plays > 0 ? top.episode_title : "",
    episodeCount: episodes.length,
    episodesWithPlays: episodes.filter((e) => e.plays > 0).length,
  };
}
