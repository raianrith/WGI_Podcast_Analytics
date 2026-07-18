/** Parse Spotify for Creators daily impressions CSV: Date,Impressions */

export type DailyImpression = {
  impression_date: string; // yyyy-MM-dd
  impressions: number;
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

/** Accepts M/D/YYYY or YYYY-MM-DD */
function parseDate(v: string | undefined): string | null {
  if (!v || !v.trim()) return null;
  const raw = v.trim().replace(/^"|"$/g, "");
  const mdy = raw.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (mdy) {
    const [, m, d, y] = mdy;
    return `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
  }
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString().slice(0, 10);
}

export function parseSpotifyImpressionsCsv(text: string): DailyImpression[] {
  const lines = text
    .replace(/^\uFEFF/, "")
    .split(/\r?\n/)
    .filter((l) => l.trim().length > 0);
  if (lines.length < 2) throw new Error("CSV has no data rows");

  const headers = parseCsvLine(lines[0]).map((h) => h.toLowerCase().replace(/^"|"$/g, ""));
  const dateIdx = headers.findIndex((h) => h === "date");
  const impIdx = headers.findIndex((h) => h === "impressions" || h.includes("impression"));

  if (dateIdx < 0 || impIdx < 0) {
    throw new Error('CSV must include "Date" and "Impressions" columns');
  }

  const rows: DailyImpression[] = [];
  for (let i = 1; i < lines.length; i++) {
    const cells = parseCsvLine(lines[i]);
    const impression_date = parseDate(cells[dateIdx]);
    if (!impression_date) continue;
    rows.push({
      impression_date,
      impressions: toNum(cells[impIdx]),
    });
  }

  if (!rows.length) throw new Error("No impression rows found in CSV");
  return rows.sort((a, b) => a.impression_date.localeCompare(b.impression_date));
}

export function summarizeImpressions(rows: DailyImpression[]) {
  const total = rows.reduce((s, r) => s + r.impressions, 0);
  return {
    days: rows.length,
    total,
    start: rows[0]?.impression_date ?? null,
    end: rows[rows.length - 1]?.impression_date ?? null,
  };
}

/** Sum impressions by calendar month (month_end = last day of month) */
export function monthlyImpressionTotals(rows: DailyImpression[]): Record<string, number> {
  const byMonth: Record<string, number> = {};
  for (const r of rows) {
    const [y, m] = r.impression_date.split("-").map(Number);
    const monthEnd = new Date(Date.UTC(y, m, 0)).toISOString().slice(0, 10);
    byMonth[monthEnd] = (byMonth[monthEnd] ?? 0) + r.impressions;
  }
  return byMonth;
}
