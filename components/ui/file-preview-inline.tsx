"use client";

import { useCallback, useEffect, useState } from "react";
import { ChevronDown, ChevronUp, Download, Loader2 } from "lucide-react";

type FilePreviewInlineProps = {
  fileUrl: string;
  downloadUrl?: string;
  title: string;
  mimeType?: string;
};

export default function FilePreviewInline({
  fileUrl,
  downloadUrl,
  title,
  mimeType,
}: FilePreviewInlineProps) {
  const [expanded, setExpanded] = useState(false);
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [resolvedMimeType, setResolvedMimeType] = useState(mimeType ?? "");

  const isPdf =
    resolvedMimeType === "application/pdf" || fileUrl.toLowerCase().endsWith(".pdf");
  const isImage =
    resolvedMimeType.startsWith("image/") ||
    /\.(jpe?g|png|gif|webp|svg)(\?|$)/i.test(fileUrl);

  const fetchBlob = useCallback(async () => {
    if (!fileUrl || blobUrl) return;
    setIsLoading(true);
    setLoadError(false);

    try {
      const res = await fetch(fileUrl, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch file");
      const blob = await res.blob();
      setBlobUrl(URL.createObjectURL(blob));
      setResolvedMimeType(mimeType ?? blob.type ?? "");
    } catch {
      setLoadError(true);
    } finally {
      setIsLoading(false);
    }
  }, [fileUrl, blobUrl, mimeType]);

  useEffect(() => {
    if (expanded && !blobUrl && !loadError) {
      void fetchBlob();
    }
  }, [expanded, blobUrl, loadError, fetchBlob]);

  useEffect(() => {
    return () => {
      if (blobUrl) URL.revokeObjectURL(blobUrl);
    };
  }, [blobUrl]);

  useEffect(() => {
    setResolvedMimeType(mimeType ?? "");
  }, [mimeType]);

  return (
    <div className="overflow-hidden rounded-lg border border-zinc-200">
      <button
        type="button"
        onClick={() => setExpanded((prev) => !prev)}
        className="flex w-full items-center justify-between gap-3 bg-zinc-50 px-4 py-3 text-left transition-colors hover:cursor-pointer hover:bg-zinc-100"
      >
        <div className="flex items-center gap-2 min-w-0">
          <span className="truncate text-sm font-medium text-zinc-800">{title}</span>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {(downloadUrl || fileUrl) && (
            <a
              href={downloadUrl ?? fileUrl}
              download
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="inline-flex items-center gap-1 rounded-md border border-zinc-300 bg-white px-2.5 py-1 text-xs font-medium text-zinc-700 transition-colors hover:cursor-pointer hover:bg-zinc-50"
            >
              <Download className="h-3.5 w-3.5" />
              Download
            </a>
          )}
          {expanded ? (
            <ChevronUp className="h-4 w-4 text-zinc-500" />
          ) : (
            <ChevronDown className="h-4 w-4 text-zinc-500" />
          )}
        </div>
      </button>

      {expanded && (
        <div className="border-t border-zinc-200 bg-zinc-100">
          {isLoading && (
            <div className="flex items-center justify-center py-16">
              <div className="flex flex-col items-center gap-2">
                <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
                <p className="text-xs text-zinc-500">Loading preview...</p>
              </div>
            </div>
          )}

          {!isLoading && loadError && (
            <div className="flex flex-col items-center justify-center gap-2 py-12">
              <p className="text-sm text-zinc-600">Unable to load preview.</p>
              {(downloadUrl || fileUrl) && (
                <a
                  href={downloadUrl ?? fileUrl}
                  download
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-md bg-blue-800 px-4 py-2 text-sm font-medium text-white hover:cursor-pointer hover:bg-blue-900"
                >
                  <Download className="h-4 w-4" />
                  Download File
                </a>
              )}
            </div>
          )}

          {!isLoading && !loadError && blobUrl && isPdf && (
            <iframe
              src={blobUrl}
              className="h-[80vh] w-full"
              title={title}
            />
          )}

          {!isLoading && !loadError && blobUrl && isImage && (
            <div className="flex items-center justify-center overflow-auto p-4">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={blobUrl}
                alt={title}
                className="max-h-[80vh] max-w-full rounded object-contain"
              />
            </div>
          )}

          {!isLoading && !loadError && blobUrl && !isPdf && !isImage && (
            <div className="flex flex-col items-center justify-center gap-2 py-12">
              <p className="text-sm text-zinc-600">Preview not available for this file type.</p>
              {(downloadUrl || fileUrl) && (
                <a
                  href={downloadUrl ?? fileUrl}
                  download
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-md bg-blue-800 px-4 py-2 text-sm font-medium text-white hover:cursor-pointer hover:bg-blue-900"
                >
                  <Download className="h-4 w-4" />
                  Download File
                </a>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}