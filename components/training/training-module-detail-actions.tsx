"use client";

import { Copy, ExternalLink } from "lucide-react";
import { toast } from "sonner";

type TrainingModuleDetailActionsProps = {
  moduleId: string;
  qrToken: string;
  publishedAt: string | null;
};

function buildAccessUrl(qrToken: string) {
  return `/training/${qrToken}`;
}

export default function TrainingModuleDetailActions({
  moduleId,
  qrToken,
  publishedAt,
}: TrainingModuleDetailActionsProps) {
  async function copyValue(value: string, message: string) {
    const copyTarget = value.startsWith("/")
      ? new URL(value, window.location.origin).toString()
      : value;
    await navigator.clipboard.writeText(copyTarget);
    toast.success(message);
  }

  const accessUrl = buildAccessUrl(qrToken);

  return (
    <div className="flex flex-col gap-3">
      <a
        href={`/api/training/modules/${moduleId}/material`}
        target="_blank"
        rel="noreferrer"
        className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full bg-blue-800 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-blue-900"
      >
        <ExternalLink className="h-4 w-4" />
        Open material
      </a>
      {publishedAt ? (
        <>
          <a
            href={accessUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full border border-blue-200 bg-blue-50 px-4 py-3 text-sm font-semibold text-blue-800 transition-colors hover:bg-blue-100"
          >
            <ExternalLink className="h-4 w-4" />
            Open public page
          </a>
          <button
            type="button"
            onClick={() => void copyValue(accessUrl, "Access link copied.")}
            className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full border border-zinc-200 bg-white px-4 py-3 text-sm font-semibold text-zinc-700 transition-colors hover:bg-zinc-50"
          >
            <Copy className="h-4 w-4" />
            Copy public link
          </button>
        </>
      ) : null}
    </div>
  );
}
