"use client";

import { useEffect } from "react";

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4">
      <h2 className="text-lg font-semibold text-zinc-900">Dashboard Unavailable</h2>
      <p className="text-sm text-zinc-500">
        An error occurred while loading the dashboard. Please try again.
      </p>
      <button
        type="button"
        onClick={reset}
        className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 hover:cursor-pointer"
      >
        Try Again
      </button>
    </div>
  );
}