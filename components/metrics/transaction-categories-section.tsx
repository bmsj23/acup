"use client";

import { MEDICAL_RECORDS_TRANSACTION_CATEGORIES } from "@/lib/constants/departments";

type TransactionCategoriesSectionProps = {
  selectedCategories: Set<string>;
  categoryCounts: Record<string, string>;
  onToggle: (category: string) => void;
  onCountChange: (category: string, value: string) => void;
};

export default function TransactionCategoriesSection({
  selectedCategories,
  categoryCounts,
  onToggle,
  onCountChange,
}: TransactionCategoriesSectionProps) {
  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
      <p className="mb-4 text-xs font-semibold uppercase tracking-wider text-zinc-400">Transaction Categories</p>
      <p className="mb-3 text-xs text-zinc-500">Select the categories you handled for this date and enter the count for each.</p>
      <div className="space-y-1.5">
        {MEDICAL_RECORDS_TRANSACTION_CATEGORIES.map((category) => {
          const isChecked = selectedCategories.has(category);
          return (
            <div
              key={category}
              className={`flex items-center gap-3 rounded-lg border px-4 py-3 transition-colors ${
                isChecked
                  ? "border-blue-200 bg-blue-50/50"
                  : "border-zinc-100 bg-white hover:border-zinc-200 hover:bg-zinc-50/50"
              }`}
            >
              <button
                type="button"
                role="checkbox"
                aria-checked={isChecked}
                onClick={() => onToggle(category)}
                className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md border-2 transition-colors hover:cursor-pointer ${
                  isChecked
                    ? "border-blue-800 bg-blue-800"
                    : "border-zinc-300 bg-white hover:border-zinc-400"
                }`}
              >
                {isChecked && (
                  <svg className="h-3 w-3 text-white" viewBox="0 0 12 12" fill="none">
                    <path d="M2.5 6L5 8.5L9.5 3.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
              </button>
              <label
                onClick={() => onToggle(category)}
                className={`flex-1 text-sm hover:cursor-pointer ${isChecked ? "font-medium text-zinc-900" : "text-zinc-500"}`}
              >
                {category}
              </label>
              {isChecked && (
                <input
                  type="number"
                  min="0"
                  // eslint-disable-next-line security/detect-object-injection
                  value={categoryCounts[category] ?? "0"}
                  onChange={(e) => onCountChange(category, e.target.value)}
                  className="w-24 rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-sm text-zinc-900 outline-none focus:border-blue-800 focus:ring-4 focus:ring-blue-500/10"
                  placeholder="Count"
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}