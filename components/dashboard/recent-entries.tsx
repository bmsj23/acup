"use client";

import { useState } from "react";
import { CalendarDays } from "lucide-react";
import type { DailyTrend } from "./types";
import { formatCurrency } from "./utils";

type RecentEntriesProps = {
  dailyTrend: DailyTrend[];
};

const ENTRIES_PER_PAGE = 5;

export default function RecentEntries({ dailyTrend }: RecentEntriesProps) {
  const [recentPage, setRecentPage] = useState(0);

  const sorted = [...dailyTrend].reverse();
  const totalPages = Math.max(1, Math.ceil(sorted.length / ENTRIES_PER_PAGE));
  const page = Math.min(recentPage, totalPages - 1);
  const pageItems = sorted.slice(page * ENTRIES_PER_PAGE, (page + 1) * ENTRIES_PER_PAGE);

  return (
    <section>
      <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
        <h3 className="font-serif text-lg font-bold text-zinc-900 mb-4">Recent Entries</h3>
        <div className="space-y-3">
          {pageItems.length > 0 ? (
            pageItems.map((item) => (
              <div
                key={item.date}
                className="flex items-center justify-between rounded-lg border border-zinc-100 bg-zinc-50/50 p-3 hover:bg-zinc-50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded-full bg-blue-100 text-blue-800 flex items-center justify-center">
                    <CalendarDays className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-zinc-900">
                      {new Date(item.date).toLocaleDateString()}
                    </p>
                    <p className="text-xs text-zinc-500">
                      Census: {item.census_total} &bull; Inputs: {item.monthly_input_count}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-zinc-900">
                    {formatCurrency(item.revenue_total)}
                  </p>
                  <p className="text-xs text-zinc-500">
                    Equip: {item.equipment_utilization_pct.toFixed(1)}%
                  </p>
                </div>
              </div>
            ))
          ) : (
            <p className="text-sm text-zinc-500">No entries available.</p>
          )}

          {sorted.length > ENTRIES_PER_PAGE && (
            <div className="flex items-center justify-between pt-2">
              <button
                type="button"
                disabled={page === 0}
                onClick={() => setRecentPage((p) => Math.max(0, p - 1))}
                className="rounded-lg border border-zinc-200 px-3 py-1.5 text-xs font-medium text-zinc-600 transition-colors hover:bg-zinc-100 hover:cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Previous
              </button>
              <span className="text-xs text-zinc-500">
                Page {page + 1} of {totalPages}
              </span>
              <button
                type="button"
                disabled={page >= totalPages - 1}
                onClick={() => setRecentPage((p) => Math.min(totalPages - 1, p + 1))}
                className="rounded-lg border border-zinc-200 px-3 py-1.5 text-xs font-medium text-zinc-600 transition-colors hover:bg-zinc-100 hover:cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}