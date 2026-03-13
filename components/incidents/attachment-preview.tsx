"use client";

import { useEffect, useState } from "react";
import { Download, Loader2 } from "lucide-react";
import { formatFileSize } from "./utils";

type AttachmentPreviewProps = {
  incidentId: string;
  fileName: string;
  mimeType: string | null;
  fileSize: number | null;
};

export default function AttachmentPreview({
  incidentId,
  fileName,
  mimeType,
  fileSize,
}: AttachmentPreviewProps) {
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [loading, setLoading] = useState(true);
  const fileUrl = `/api/incidents/${incidentId}/file`;
  const isImage = mimeType?.startsWith("image/") ?? false;
  const isPdf = mimeType === "application/pdf";

  useEffect(() => {
    let revoked = false;

    async function fetchBlob() {
      setLoading(true);
      setLoadError(false);

      try {
        const res = await fetch(fileUrl, { credentials: "include" });
        if (!res.ok) { setLoadError(true); return; }
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        if (!revoked) setBlobUrl(url);
      } catch {
        setLoadError(true);
      } finally {
        setLoading(false);
      }
    }

    if (isImage || isPdf) {
      void fetchBlob();
    } else {
      setLoading(false);
    }

    return () => {
      revoked = true;
      if (blobUrl) URL.revokeObjectURL(blobUrl);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fileUrl, isImage, isPdf]);

  if (loading) {
    return (
      <div className="flex items-center gap-2 py-4 text-sm text-zinc-500">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading preview...
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {isImage && blobUrl && !loadError && (
        <div className="overflow-hidden rounded-[1.5rem] border border-blue-100/80 bg-white/90 shadow-[0_24px_60px_-36px_rgba(30,64,175,0.14)]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={blobUrl}
            alt={fileName}
            className="max-h-[70vh] w-full object-contain bg-[linear-gradient(180deg,rgba(255,255,255,0.99),rgba(245,249,255,0.94))] p-3"
          />
        </div>
      )}

      {isPdf && blobUrl && !loadError && (
        <div className="overflow-hidden rounded-[1.5rem] border border-blue-100/80 bg-white/90 shadow-[0_24px_60px_-36px_rgba(30,64,175,0.14)]">
          <iframe
            src={blobUrl}
            title={fileName}
            className="h-[70vh] w-full bg-white"
          />
        </div>
      )}

      {loadError ? (
        <div className="rounded-[1.35rem] border border-blue-100/80 bg-blue-50/70 p-4 text-sm text-blue-900">
          Preview unavailable. You can still download the file securely below.
        </div>
      ) : null}

      <div className="flex flex-col gap-3 rounded-[1.5rem] border border-blue-100/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.99),rgba(245,249,255,0.94))] p-4 shadow-[0_18px_40px_-34px_rgba(30,64,175,0.14)] sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-slate-900">{fileName}</p>
          <div className="mt-1 flex flex-wrap items-center gap-2 text-xs tracking-[0.18em] text-slate-500 uppercase">
            <span>{mimeType ?? "Attachment"}</span>
            {fileSize ? <span>{formatFileSize(fileSize)}</span> : null}
          </div>
        </div>
        <a
          href={fileUrl}
          download={fileName}
          className="inline-flex items-center justify-center gap-2 rounded-full border border-blue-200 bg-blue-800 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:cursor-pointer hover:bg-blue-900"
        >
          <Download className="h-4 w-4" />
          Download File
        </a>
      </div>
    </div>
  );
}
