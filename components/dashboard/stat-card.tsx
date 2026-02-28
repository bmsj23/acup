import { ArrowUpRight, ArrowDownRight, type LucideIcon } from "lucide-react";

type StatCardProps = {
  title: string;
  value: string;
  subValue?: string;
  icon: LucideIcon;
  iconColor: string;
  trend?: string;
  trendUp?: boolean;
};

export default function StatCard({
  title,
  value,
  subValue,
  icon: Icon,
  iconColor,
  trend,
  trendUp,
}: StatCardProps) {
  return (
    <div className="flex h-full flex-col rounded-2xl border border-zinc-200 bg-white p-6 shadow-[0_2px_10px_-4px_rgba(0,0,0,0.05)] transition-all hover:border-zinc-300 hover:shadow-md">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-zinc-500">{title}</p>
          <h3 className="mt-2 text-2xl font-bold text-zinc-900 tracking-tight">
            {value}
          </h3>
        </div>
        <div className={`p-2.5 rounded-xl ${iconColor}`}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
      <div className="mt-4 min-h-6">
        {trend ? (
          <div
            className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-semibold ${
              trendUp
                ? "bg-emerald-50 text-emerald-700"
                : "bg-red-50 text-red-700"
            }`}>
            {trendUp ? (
              <ArrowUpRight className="h-3 w-3" />
            ) : (
              <ArrowDownRight className="h-3 w-3" />
            )}
            {trend}{" "}
            <span className="ml-1 font-normal text-zinc-400">
              vs last month
            </span>
          </div>
        ) : subValue ? (
          <div className="inline-flex items-center gap-1.5 rounded-full bg-violet-50 px-2 py-0.5 text-xs font-semibold text-violet-700">
            {subValue}
          </div>
        ) : null}
      </div>
    </div>
  );
}