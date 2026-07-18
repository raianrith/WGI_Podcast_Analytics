/** Parse Spotify for Creators episode CSV exports (name, plays, streams, audience_size, releaseDate) */

export type ParsedSpotifyEpisode = {
  episode_name: string;
  plays: number;
  streams: number;
  audience_size: number;
  release_date: string | null;
};

export type SpotifyCsvAggregate = {
  spotify_plays: number;
  spotify_streams_60s: number;
  spotify_listeners: number;
  spotify_top_episode: string;
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
  if (!v || v === "") return 0;
  const n = Number(String(v).replace(/,/g, ""));
  return Number.isFinite(n) ? n : 0;
}

function parseDate(v: string | undefined): string | null {
  if (!v || !v.trim()) return null;
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString().slice(0, 10);
}

export function parseSpotifyCsv(text: string): ParsedSpotifyEpisode[] {
  const lines = text
    .replace(/^\uFEFF/, "")
    .split(/\r?\n/)
    .filter((l) => l.trim().length > 0);
  if (lines.length < 2) throw new Error("CSV has no data rows");

  const headers = parseCsvLine(lines[0]).map((h) => h.toLowerCase().replace(/^"|"$/g, ""));
  const exact = (name: string) => headers.findIndex((h) => h === name);
  const includes = (name: string) => headers.findIndex((h) => h.includes(name));

  const nameIdx = exact("name") >= 0 ? exact("name") : includes("episode") >= 0 ? includes("episode") : includes("title");
  const playsIdx = exact("plays");
  const streamsIdx = exact("streams");
  const audienceIdx = exact("audience_size") >= 0 ? exact("audience_size") : includes("audience");
  const releaseIdx = exact("releasedate") >= 0 ? exact("releasedate") : includes("release");

  if (nameIdx < 0 || playsIdx < 0) {
    throw new Error('CSV must include "name" and "plays" columns (Spotify for Creators episode export)');
  }

  const episodes: ParsedSpotifyEpisode[] = [];

  for (let i = 1; i < lines.length; i++) {
    const cells = parseCsvLine(lines[i]);
    const episode_name = cells[nameIdx]?.replace(/^"|"$/g, "").trim();
    if (!episode_name) continue;

    episodes.push({
      episode_name,
      plays: toNum(cells[playsIdx]),
      streams: streamsIdx >= 0 ? toNum(cells[streamsIdx]) : 0,
      audience_size: audienceIdx >= 0 ? toNum(cells[audienceIdx]) : 0,
      release_date: releaseIdx >= 0 ? parseDate(cells[releaseIdx]?.replace(/^"|"$/g, "")) : null,
    });
  }

  if (!episodes.length) throw new Error("No episode rows found in CSV");
  return episodes;
}

export function aggregateSpotifyEpisodes(episodes: ParsedSpotifyEpisode[]): SpotifyCsvAggregate {
  const plays = episodes.reduce((s, e) => s + e.plays, 0);
  const streams = episodes.reduce((s, e) => s + e.streams, 0);
  const listeners = episodes.reduce((s, e) => s + e.audience_size, 0);
  const top = [...episodes].sort((a, b) => b.plays - a.plays || b.streams - a.streams)[0];

  return {
    spotify_plays: plays,
    spotify_streams_60s: streams,
    spotify_listeners: listeners,
    spotify_top_episode: top && (top.plays > 0 || top.streams > 0) ? top.episode_name : "",
    episodeCount: episodes.length,
    episodesWithPlays: episodes.filter((e) => e.plays > 0 || e.streams > 0).length,
  };
}
