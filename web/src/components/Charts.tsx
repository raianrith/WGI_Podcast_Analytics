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

const GRID = "#EDEAE4";
const TICK = "#9CA3AF";

const tip = {
  borderRadius: 14,
  border: "1px solid rgba(18,24,38,0.06)",
  background: "rgba(255,255,255,0.98)",
  boxShadow: "0 8px 24px rgba(18,24,38,0.08)",
  fontSize: 12,
  color: "#121826",
  padding: "10px 12px",
};

const axisProps = {
  tick: { fontSize: 11, fill: TICK },
  axisLine: false as const,
  tickLine: false as const,
};

export function PlatformTrendChart({
  data,
}: {
  data: { month: string; youtube: number; apple: number; spotify: number }[];
}) {
  return (
    <div className="card p-7 h-[400px]">
      <h3 className="chart-title">Consumption by platform</h3>
      <p className="chart-sub">YouTube views · Apple plays · Spotify plays</p>
      <ResponsiveContainer width="100%" height="82%">
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="2 6" stroke={GRID} vertical={false} strokeOpacity={0.9} />
          <XAxis dataKey="month" {...axisProps} />
          <YAxis {...axisProps} allowDecimals={false} />
          <Tooltip contentStyle={tip} />
          <Legend wrapperStyle={{ fontSize: 12, paddingTop: 10, color: "#6B7280" }} />
          <Line
            type="monotone"
            dataKey="youtube"
            name="YouTube"
            stroke="#E11D48"
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 5, strokeWidth: 0 }}
          />
          <Line
            type="monotone"
            dataKey="apple"
            name="Apple"
            stroke="#737373"
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 5, strokeWidth: 0 }}
          />
          <Line
            type="monotone"
            dataKey="spotify"
            name="Spotify"
            stroke="#1DB954"
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 5, strokeWidth: 0 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

export function ShareDonut({
  data,
}: {
  data: { name: string; value: number; pct: number; color: string }[];
}) {
  const total = data.reduce((s, d) => s + d.value, 0);
  return (
    <div className="card p-7 flex flex-col min-h-[400px] h-full overflow-hidden">
      <h3 className="chart-title shrink-0">Share of total plays</h3>
      <p className="text-xs text-ink-muted mt-1 mb-3 shrink-0">Selected period</p>

      <div className="relative flex-1 min-h-[180px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              dataKey="value"
              nameKey="name"
              innerRadius={60}
              outerRadius={90}
              paddingAngle={3}
              stroke="none"
            >
              {data.map((d) => (
                <Cell key={d.name} fill={d.color} />
              ))}
            </Pie>
            <Tooltip contentStyle={tip} formatter={(v: number, n: string) => [v.toLocaleString(), n]} />
          </PieChart>
        </ResponsiveContainer>
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <p className="text-2xl font-semibold leading-none tracking-tight tabular-nums">
            {total.toLocaleString()}
          </p>
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-ink-muted mt-1.5">
            Total plays
          </p>
        </div>
      </div>

      <ul className="mt-4 shrink-0 w-full space-y-2 border-t border-paper-hairline pt-4">
        {data.map((d) => (
          <li key={d.name} className="flex items-center justify-between gap-3 text-sm w-full min-w-0">
            <span className="flex items-center gap-2.5 min-w-0 truncate">
              <span className="w-2 h-2 rounded-full shrink-0 ring-2 ring-black/[0.03]" style={{ background: d.color }} />
              <span className="truncate text-ink-soft">{d.name}</span>
            </span>
            <span className="font-medium tabular-nums shrink-0 text-ink-muted">
              {d.value.toLocaleString()}
              <span className="text-ink ml-2.5">{d.pct.toFixed(1)}%</span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function TotalTrendChart({ data }: { data: { month: string; total: number; hours: number }[] }) {
  return (
    <div className="card p-7 h-[360px]">
      <h3 className="chart-title">Total monthly plays</h3>
      <p className="chart-sub">All platforms combined</p>
      <ResponsiveContainer width="100%" height="80%">
        <AreaChart data={data}>
          <defs>
            <linearGradient id="totalGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#C45C26" stopOpacity={0.28} />
              <stop offset="100%" stopColor="#C45C26" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="2 6" stroke={GRID} vertical={false} />
          <XAxis dataKey="month" {...axisProps} />
          <YAxis {...axisProps} allowDecimals={false} />
          <Tooltip contentStyle={tip} />
          <Area
            type="monotone"
            dataKey="total"
            name="Plays"
            stroke="#C45C26"
            fill="url(#totalGrad)"
            strokeWidth={2}
            activeDot={{ r: 5, strokeWidth: 0 }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

export function DualBarChart({
  title,
  subtitle,
  data,
  aKey,
  bKey,
  aName,
  bName,
  aColor,
  bColor,
}: {
  title: string;
  subtitle?: string;
  data: Record<string, string | number>[];
  aKey: string;
  bKey: string;
  aName: string;
  bName: string;
  aColor: string;
  bColor: string;
}) {
  return (
    <div className="card p-7 h-[380px] flex flex-col">
      <h3 className="chart-title">{title}</h3>
      {subtitle ? <p className="chart-sub">{subtitle}</p> : <div className="mb-4" />}
      <div className="flex-1 min-h-0">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="2 6" stroke={GRID} vertical={false} />
            <XAxis dataKey="month" {...axisProps} />
            <YAxis {...axisProps} allowDecimals={false} />
            <Tooltip contentStyle={tip} cursor={{ fill: "rgba(18,24,38,0.03)" }} />
            <Legend wrapperStyle={{ fontSize: 12, color: "#6B7280" }} />
            <Bar dataKey={aKey} name={aName} fill={aColor} radius={[6, 6, 0, 0]} maxBarSize={20} />
            <Bar dataKey={bKey} name={bName} fill={bColor} radius={[6, 6, 0, 0]} maxBarSize={20} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

export function SingleLineChart({
  title,
  subtitle,
  data,
  dataKey,
  color,
}: {
  title: string;
  subtitle?: string;
  data: Record<string, string | number>[];
  dataKey: string;
  color: string;
}) {
  const gradId = `lineGrad-${dataKey}-${color.replace("#", "")}`;
  return (
    <div className="card p-7 h-[380px] flex flex-col">
      <h3 className="chart-title">{title}</h3>
      {subtitle ? <p className="chart-sub">{subtitle}</p> : <div className="mb-4" />}
      <div className="flex-1 min-h-0">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data}>
            <defs>
              <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={color} stopOpacity={0.18} />
                <stop offset="100%" stopColor={color} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="2 6" stroke={GRID} vertical={false} />
            <XAxis dataKey="month" {...axisProps} />
            <YAxis {...axisProps} />
            <Tooltip contentStyle={tip} />
            <Area
              type="monotone"
              dataKey={dataKey}
              stroke={color}
              fill={`url(#${gradId})`}
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 5, fill: color, strokeWidth: 0 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

export function HighlightCard({ title, items }: { title: string; items: { label: string; value: string }[] }) {
  return (
    <div className="card p-7">
      <h3 className="chart-title mb-5">{title}</h3>
      <ul className="space-y-5">
        {items.map((item) => (
          <li key={item.label}>
            <p className="label mb-1.5">{item.label}</p>
            <p className="text-sm text-ink leading-relaxed">{item.value || "—"}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}
