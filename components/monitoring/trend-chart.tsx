"use client";

import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

type TrendSeries = {
  key: string;
  label: string;
  color: string;
};

type TrendChartProps<TData extends Record<string, string | number>> = {
  title: string;
  description: string;
  data: TData[];
  series: TrendSeries[];
  valueFormatter?: (value: number) => string;
};

export default function TrendChart<TData extends Record<string, string | number>>({
  title,
  description,
  data,
  series,
  valueFormatter = (value) => String(value),
}: TrendChartProps<TData>) {
  return (
    <section className="rounded-[1.75rem] border border-blue-100/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.99),rgba(244,248,252,0.95))] p-5 shadow-[0_28px_70px_-46px_rgba(30,64,175,0.16)]">
      <div className="mb-5">
        <p className="text-[0.68rem] font-semibold uppercase tracking-[0.28em] text-slate-500">
          Trend
        </p>
        <h2 className="mt-2 text-2xl font-semibold text-slate-950 [font-family:var(--font-playfair)]">
          {title}
        </h2>
        <p className="mt-2 text-sm leading-7 text-slate-600">{description}</p>
      </div>

      <div className="h-72">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 12, right: 12, bottom: 0, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#dbe6f3" />
            <XAxis
              dataKey="month"
              tick={{ fill: "#64748b", fontSize: 12 }}
              axisLine={{ stroke: "#dbe6f3" }}
              tickLine={false}
            />
            <YAxis
              tick={{ fill: "#64748b", fontSize: 12 }}
              axisLine={{ stroke: "#dbe6f3" }}
              tickLine={false}
              tickFormatter={(value) => valueFormatter(Number(value))}
            />
            <Tooltip
              formatter={(value) => valueFormatter(Number(value ?? 0))}
              contentStyle={{
                borderRadius: "1rem",
                borderColor: "#dbe6f3",
                boxShadow: "0 18px 40px -28px rgba(15,23,42,0.45)",
              }}
            />
            {series.map((item) => (
              <Line
                key={item.key}
                type="monotone"
                dataKey={item.key}
                name={item.label}
                stroke={item.color}
                strokeWidth={2.5}
                dot={{ r: 3, strokeWidth: 0 }}
                activeDot={{ r: 5 }}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}
