"use client";

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { COLORS, NonZeroTooltip } from "./chart-utils";

const TEAL = "#0D9488";
const NAVY = "#1B2A41";
const PREV = "#94A3B8";

export function PlaysChart({ data, title = "Daily Plays" }: { data: { date: string; plays: number }[]; title?: string }) {
  return (
    <div className="card p-6 h-[360px]">
      <h3 className="font-display text-lg text-navy mb-4">{title}</h3>
      <ResponsiveContainer width="100%" height="85%">
        <AreaChart data={data}>
          <defs>
            <linearGradient id="playsGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={TEAL} stopOpacity={0.35} />
              <stop offset="100%" stopColor={TEAL} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
          <XAxis dataKey="date" tick={{ fontSize: 11, fill: "#64748B" }} tickFormatter={(d) => d.slice(5)} />
          <YAxis tick={{ fontSize: 11, fill: "#64748B" }} />
          <Tooltip contentStyle={{ borderRadius: 8, border: "1px solid #E2E8F0" }} />
          <Area type="monotone" dataKey="plays" stroke={TEAL} fill="url(#playsGrad)" strokeWidth={2} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

export function PeriodTrendChart({
  data,
  title,
}: {
  data: { label: string; plays: number }[];
  title: string;
}) {
  return (
    <div className="card p-6 h-[360px]">
      <h3 className="font-display text-lg text-navy mb-4">{title}</h3>
      <ResponsiveContainer width="100%" height="85%">
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
          <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#64748B" }} />
          <YAxis tick={{ fontSize: 11, fill: "#64748B" }} />
          <Tooltip contentStyle={{ borderRadius: 8, border: "1px solid #E2E8F0" }} />
          <Line type="monotone" dataKey="plays" stroke={TEAL} strokeWidth={2.5} dot={{ fill: TEAL, r: 4 }} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

export function ComparisonChart({
  data,
  currentLabel,
  previousLabel,
  title,
}: {
  data: { metric: string; current: number; previous: number }[];
  currentLabel: string;
  previousLabel: string;
  title: string;
}) {
  return (
    <div className="card p-6 h-[380px]">
      <h3 className="font-display text-lg text-navy mb-4">{title}</h3>
      <ResponsiveContainer width="100%" height="85%">
        <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
          <XAxis dataKey="metric" tick={{ fontSize: 11, fill: NAVY }} />
          <YAxis tick={{ fontSize: 11, fill: "#64748B" }} />
          <Tooltip contentStyle={{ borderRadius: 8, border: "1px solid #E2E8F0" }} />
          <Legend />
          <Bar dataKey="current" name={currentLabel} fill={TEAL} radius={[4, 4, 0, 0]} />
          <Bar dataKey="previous" name={previousLabel} fill={PREV} radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function ProjectPie({ data }: { data: { project: string; plays: number }[] }) {
  const top = data.slice(0, 6);
  return (
    <div className="card p-6 h-[360px]">
      <h3 className="font-display text-lg text-navy mb-4">Plays by Project</h3>
      <ResponsiveContainer width="100%" height="85%">
        <PieChart>
          <Pie data={top} dataKey="plays" nameKey="project" cx="50%" cy="50%" innerRadius={55} outerRadius={90} paddingAngle={2}>
            {top.map((_, i) => (
              <Cell key={i} fill={COLORS[i % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip contentStyle={{ borderRadius: 8, border: "1px solid #E2E8F0" }} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}

export function BarRanking({
  data,
  title,
  labelKey,
}: {
  data: Record<string, number | string>[];
  title: string;
  labelKey: string;
}) {
  return (
    <div className="card p-6 h-[360px]">
      <h3 className="font-display text-lg text-navy mb-4">{title}</h3>
      <ResponsiveContainer width="100%" height="85%">
        <BarChart data={data.slice(0, 8)} layout="vertical" margin={{ left: 20 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" horizontal={false} />
          <XAxis type="number" tick={{ fontSize: 11, fill: "#64748B" }} />
          <YAxis type="category" dataKey={labelKey} width={140} tick={{ fontSize: 10, fill: NAVY }} />
          <Tooltip contentStyle={{ borderRadius: 8, border: "1px solid #E2E8F0" }} />
          <Bar dataKey="plays" fill={TEAL} radius={[0, 4, 4, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function VideoMonthlyPlaysChart({
  rows,
  seriesKeys,
  seriesLabels,
  title = "Month over Month Plays by Video",
}: {
  rows: ({ label: string } & Record<string, number | string | null>)[];
  seriesKeys: string[];
  seriesLabels: Record<string, string>;
  title?: string;
}) {
  if (rows.length === 0 || seriesKeys.length === 0) {
    return (
      <div className="card p-6 h-[420px] flex items-center justify-center text-navy/40 text-sm">
        No video play data for the selected period.
      </div>
    );
  }

  return (
    <div className="card p-6 h-[500px]">
      <h3 className="font-display text-lg text-navy mb-1">{title}</h3>
      <p className="text-xs text-navy/50 mb-4">
        Top {seriesKeys.length} videos · bars &amp; tooltips hide zero-play months
      </p>
      <ResponsiveContainer width="100%" height="88%">
        <BarChart data={rows} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
          <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#64748B" }} />
          <YAxis tick={{ fontSize: 11, fill: "#64748B" }} allowDecimals={false} />
          <Tooltip
            cursor={{ fill: "rgba(15, 28, 46, 0.04)" }}
            content={<NonZeroTooltip seriesLabels={seriesLabels} />}
          />
          <Legend
            wrapperStyle={{ fontSize: 10, paddingTop: 16 }}
            formatter={(key: string) => seriesLabels[key] ?? key}
          />
          {seriesKeys.map((key, i) => (
            <Bar
              key={key}
              dataKey={key}
              name={key}
              fill={COLORS[i % COLORS.length]}
              radius={[4, 4, 0, 0]}
              maxBarSize={28}
            />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
