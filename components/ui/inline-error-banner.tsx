"use client";

import { AlertTriangle, RefreshCw } from "lucide-react";

type InlineErrorBannerProps = {
  message: string;
  onRetry?: () => void;
  severity?: "default" | "critical";
};

export default function InlineErrorBanner({
  message,
  onRetry,
  severity = "default",
}: InlineErrorBannerProps) {
  const isCritical = severity === "critical";

  return (
    <div
      className={`flex items-center gap-3 rounded-xl border px-4 py-3 text-sm ${
        isCritical
          ? "border-red-200 bg-red-50 text-red-800"
          : "border-amber-200 bg-amber-50 text-amber-800"
      }`}
      role="alert"
    >
      <AlertTriangle
        className={`h-4 w-4 shrink-0 ${isCritical ? "text-red-500" : "text-amber-500"}`}
      />
      <span className="flex-1">{message}</span>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors hover:cursor-pointer ${
            isCritical
              ? "bg-red-100 text-red-700 hover:bg-red-200"
              : "bg-amber-100 text-amber-700 hover:bg-amber-200"
          }`}
        >
          <RefreshCw className="h-3 w-3" />
          Retry
        </button>
      )}
    </div>
  );
}