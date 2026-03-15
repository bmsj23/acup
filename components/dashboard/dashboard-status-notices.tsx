"use client";

import { X } from "lucide-react";

type DashboardStatusNoticesProps = {
  newDataAvailable: boolean;
  onRefresh: () => void;
  onDismissNewData: () => void;
};

export default function DashboardStatusNotices({
  newDataAvailable,
  onRefresh,
  onDismissNewData,
}: DashboardStatusNoticesProps) {
  if (!newDataAvailable) {
    return null;
  }

  return (
    <div className="flex items-center gap-2 rounded-xl border border-blue-200 bg-blue-50 px-4 py-2.5 text-sm text-blue-800">
      <span>New metrics data is available.</span>
      <button
        type="button"
        onClick={onRefresh}
        className="ml-auto rounded-lg bg-blue-800 px-3 py-1 text-xs font-semibold text-white transition-colors hover:cursor-pointer hover:bg-blue-900"
      >
        Refresh
      </button>
      <button
        type="button"
        onClick={onDismissNewData}
        className="rounded-md p-1 text-blue-400 transition-colors hover:cursor-pointer hover:bg-blue-100 hover:text-blue-600"
        aria-label="Dismiss"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
