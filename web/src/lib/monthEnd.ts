/** Calendar helpers that avoid local-timezone shifts from Date#toISOString */

/** "2026-05" → "2026-05-31" */
export function lastDayOfMonth(yyyyMm: string): string {
  const [y, m] = yyyyMm.split("-").map(Number);
  if (!y || !m || m < 1 || m > 12) throw new Error(`Invalid month: ${yyyyMm}`);
  return new Date(Date.UTC(y, m, 0)).toISOString().slice(0, 10);
}

/** Prefer a YYYY-MM from common Spotify/Apple export filenames */
export function detectMonthFromFilename(fileName: string): string | null {
  const base = fileName.replace(/^.*[\\/]/, "");

  // 2026-05-01_to_2026-05-31.csv (or similar range)
  const range = base.match(
    /(\d{4})-(\d{2})-\d{2}.*?to.*?(\d{4})-(\d{2})-\d{2}/i
  );
  if (range) return `${range[3]}-${range[4]}`;

  // 2026-05.csv / ..._2026-05_...
  const yyyyMm = base.match(/(?<!\d)(\d{4})-(\d{2})(?!\d)/);
  if (yyyyMm) return `${yyyyMm[1]}-${yyyyMm[2]}`;

  // WGI_YT_CLIPS_JUNE / ..._May_2026 / June 2026
  const named = base.match(
    /(?:^|[^a-z])(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:t(?:ember)?)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)(?:[^a-z]|$)/i
  );
  if (named) {
    const map: Record<string, string> = {
      jan: "01",
      january: "01",
      feb: "02",
      february: "02",
      mar: "03",
      march: "03",
      apr: "04",
      april: "04",
      may: "05",
      jun: "06",
      june: "06",
      jul: "07",
      july: "07",
      aug: "08",
      august: "08",
      sep: "09",
      sept: "09",
      september: "09",
      oct: "10",
      october: "10",
      nov: "11",
      november: "11",
      dec: "12",
      december: "12",
    };
    const mon = map[named[1].toLowerCase()];
    const yearMatch = base.match(/(20\d{2})/);
    const year = yearMatch?.[1] || String(new Date().getFullYear());
    if (mon) return `${year}-${mon}`;
  }

  return null;
}

/** Default reporting month = previous calendar month (YYYY-MM) */
export function previousCalendarMonth(now = new Date()): string {
  const y = now.getFullYear();
  const m = now.getMonth(); // 0-based local
  const prev = m === 0 ? { y: y - 1, m: 12 } : { y, m };
  return `${prev.y}-${String(prev.m).padStart(2, "0")}`;
}
