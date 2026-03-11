"use client";

import { useEffect } from "react";
import { ClipboardList } from "lucide-react";

export default function AuditError({
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
      <div className="rounded-full bg-amber-100 p-4">
        <ClipboardList className="h-8 w-8 text-amber-600" />
      </div>
      <h2 className="text-lg font-semibold text-zinc-900">Audit Logs Unavailable</h2>
      <p className="max-w-md text-center text-sm text-zinc-500">
        The audit log viewer could not be loaded. Please retry or contact your system administrator if the issue persists.
      </p>
      <button
        type="button"
        onClick={reset}
        className="rounded-lg bg-blue-800 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-blue-900 hover:cursor-pointer"
      >
        Retry
      </button>
    </div>
  );
}