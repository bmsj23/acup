"use client";

import { useEffect } from "react";
import { AlertTriangle } from "lucide-react";

export default function IncidentsError({
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
      <div className="rounded-full bg-red-100 p-4">
        <AlertTriangle className="h-8 w-8 text-red-600" />
      </div>
      <h2 className="text-lg font-semibold text-zinc-900">Incident Reports Unavailable</h2>
      <p className="max-w-md text-center text-sm text-zinc-500">
        The incident reporting system could not be loaded. This is safety-critical data — please retry or contact your system administrator if the issue persists.
      </p>
      <button
        type="button"
        onClick={reset}
        className="rounded-lg bg-red-600 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-red-700 hover:cursor-pointer"
      >
        Retry Loading Incidents
      </button>
    </div>
  );
}