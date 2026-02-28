"use client";

import { useState } from "react";
import { Download, Loader2, X } from "lucide-react";

type DocumentViewerModalProps = {
  isOpen: boolean;
  onClose: () => void;
  documentId: string | null;
  title: string;
};

export default function DocumentViewerModal({
  isOpen,
  onClose,
  documentId,
  title,
}: DocumentViewerModalProps) {
  const [isLoading, setIsLoading] = useState(true);

  if (!isOpen || !documentId) return null;

  const viewUrl = `/api/documents/${documentId}/view`;
  const downloadUrl = `/api/documents/${documentId}/download`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Custom Overlay (simpler than Modal wrapper for full-screen feel if needed, but reusing Modal logic for consistency)
                 Actually, let's just reuse the Modal but override max-width.
             */}
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      <div className="relative w-full max-w-5xl h-[85vh] bg-white rounded-lg shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-zinc-200 px-4 py-3 bg-zinc-50">
          <div className="flex flex-col">
            <h3 className="font-poppins text-lg font-semibold text-zinc-900">
              {title}
            </h3>
            <p className="text-xs text-zinc-500">Secure Internal Preview</p>
          </div>

          <div className="flex items-center gap-2">
            <a
              href={downloadUrl}
              download
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-sm font-medium text-zinc-700 hover:bg-zinc-50 hover:cursor-pointer">
              <Download className="h-4 w-4" />
              Download
            </a>
            <button
              onClick={onClose}
              className="rounded-full p-1.5 text-zinc-400 hover:bg-zinc-200 hover:text-zinc-600 transition-colors hover:cursor-pointer">
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 relative bg-zinc-100">
          {isLoading && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="flex flex-col items-center gap-2">
                <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
                <p className="text-sm font-medium text-zinc-500">
                  Generating secure preview...
                </p>
              </div>
            </div>
          )}
          <iframe
            src={viewUrl}
            className="w-full h-full"
            onLoad={() => setIsLoading(false)}
            title="Document Preview"
            sandbox="allow-scripts allow-same-origin"
          />
        </div>
      </div>
    </div>
  );
}
