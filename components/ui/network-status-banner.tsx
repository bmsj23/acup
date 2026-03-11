"use client";

import { useSyncExternalStore } from "react";
import { WifiOff } from "lucide-react";

function subscribe(callback: () => void) {
  window.addEventListener("online", callback);
  window.addEventListener("offline", callback);
  return () => {
    window.removeEventListener("online", callback);
    window.removeEventListener("offline", callback);
  };
}

function getSnapshot() {
  return !navigator.onLine;
}

function getServerSnapshot() {
  return false;
}

export default function NetworkStatusBanner() {
  const isOffline = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  if (!isOffline) return null;

  return (
    <div
      className="flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-2.5 text-sm text-amber-800"
      role="alert"
    >
      <WifiOff className="h-4 w-4 shrink-0 text-amber-500" />
      <span>Connection lost — showing last known data. Will auto-retry when connection restores.</span>
    </div>
  );
}