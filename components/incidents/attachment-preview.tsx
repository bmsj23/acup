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
    <div className="space-y-3">
      {isImage && blobUrl && !loadError && (
        <div className="overflow-hidden rounded-lg border border-zinc-200 bg-white">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={blobUrl}
            alt={fileName}
            className="max-h-[80vh] w-full object-contain"
          />
        </div>
      )}

      {isPdf && blobUrl && !loadError && (
        <div className="overflow-hidden rounded-lg border border-zinc-200 bg-white">
          <iframe
            src={blobUrl}
            title={fileName}
            className="h-[80vh] w-full"
          />
        </div>
      )}

      <div className="flex items-center gap-3">
        <a
          href={fileUrl}
          download={fileName}
          className="inline-flex items-center gap-2 rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm font-medium text-zinc-700 transition-colors hover:cursor-pointer hover:bg-zinc-50"
        >
          <Download className="h-4 w-4" />
          Download
        </a>
        <span className="text-sm text-zinc-600">{fileName}</span>
        {fileSize && (
          <span className="text-xs text-zinc-400">({formatFileSize(fileSize)})</span>
        )}
      </div>
    </div>
  );
}