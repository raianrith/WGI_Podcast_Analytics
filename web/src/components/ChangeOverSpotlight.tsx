"use client";

import { CHANGEOVER_CHANNEL } from "@/lib/analytics";

type Props = {
  plays: number;
  activeVideos: number;
  hoursWatched: number;
  topVideos: { title: string; plays: number; url: string | null }[];
  onFocus: () => void;
  isFocused: boolean;
};

export function ChangeOverSpotlight({ plays, activeVideos, hoursWatched, topVideos, onFocus, isFocused }: Props) {
  if (isFocused) return null;

  return (
    <div className="relative overflow-hidden rounded-2xl border border-teal/20 bg-gradient-to-br from-navy-dark via-navy to-navy-light text-white p-6 md:p-8 mb-6">
      <div className="absolute top-0 right-0 w-64 h-64 bg-teal/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3" />
      <div className="relative flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div className="max-w-xl">
          <p className="text-teal-light text-xs font-bold uppercase tracking-widest">Featured channel</p>
          <h2 className="font-display text-2xl md:text-3xl mt-2">{CHANGEOVER_CHANNEL}</h2>
          <p className="text-white/60 text-sm mt-2 leading-relaxed">
            {activeVideos} episodes with plays · {plays.toLocaleString()} total plays · {hoursWatched.toFixed(1)} hours
            watched in the selected period.
          </p>
          <button
            type="button"
            onClick={onFocus}
            className="mt-4 inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-teal text-white text-sm font-semibold hover:bg-teal-light transition shadow-lg shadow-teal/25"
          >
            View ChangeOver analytics
          </button>
        </div>

        {topVideos.length > 0 && (
          <div className="lg:w-80 shrink-0 rounded-xl bg-white/5 border border-white/10 p-4 backdrop-blur-sm">
            <p className="text-[10px] uppercase tracking-widest text-white/50 font-semibold mb-3">Top episodes</p>
            <ul className="space-y-2.5">
              {topVideos.slice(0, 4).map((v, i) => (
                <li key={i} className="flex items-start justify-between gap-3 text-sm">
                  <span className="text-white/80 line-clamp-2 leading-snug">
                    {v.url ? (
                      <a href={v.url} target="_blank" rel="noopener noreferrer" className="hover:text-teal-light">
                        {v.title}
                      </a>
                    ) : (
                      v.title
                    )}
                  </span>
                  <span className="font-semibold text-teal-light shrink-0">{v.plays}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
