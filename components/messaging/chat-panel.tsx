"use client";

import { MessageSquare, Send } from "lucide-react";
import type { MessageItem, ThreadItem } from "./types";

type ChatPanelProps = {
  selectedThread: ThreadItem | null;
  messages: MessageItem[];
  currentUserId: string | null;
  loadingMessages: boolean;
  messageError: string | null;
  hasMoreMessages: boolean;
  loadingOlder: boolean;
  newMessageBody: string;
  sendingMessage: boolean;
  onLoadOlder: () => void;
  onMessageChange: (value: string) => void;
  onSend: () => void;
};

export default function ChatPanel({
  selectedThread,
  messages,
  currentUserId,
  loadingMessages,
  messageError,
  hasMoreMessages,
  loadingOlder,
  newMessageBody,
  sendingMessage,
  onLoadOlder,
  onMessageChange,
  onSend,
}: ChatPanelProps) {
  if (!selectedThread) {
    return (
      <article className="flex h-full flex-col overflow-hidden rounded-xl border border-zinc-200 bg-white">
        <div className="flex h-full flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-blue-200 bg-blue-50">
          <MessageSquare className="h-6 w-6 text-blue-800" />
          <p className="text-sm text-zinc-600">Select a thread to start messaging.</p>
        </div>
      </article>
    );
  }

  return (
    <article className="flex h-full flex-col overflow-hidden rounded-xl border border-zinc-200 bg-white">
      <div className="border-b border-zinc-200 px-4 py-3">
        <h3 className="font-serif text-lg font-semibold text-zinc-900">
          {selectedThread.title}
        </h3>
        <p className="mt-1 text-xs text-zinc-500">
          {selectedThread.is_system_wide
            ? "System-wide conversation"
            : "Department conversation"}
        </p>
      </div>

      <div className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
        {loadingMessages ? (
          <p className="text-sm text-zinc-600">Loading messages...</p>
        ) : messages.length > 0 ? (
          <>
            {hasMoreMessages && (
              <div className="flex justify-center pb-2">
                <button
                  type="button"
                  onClick={onLoadOlder}
                  disabled={loadingOlder}
                  className="rounded-md bg-zinc-100 px-3 py-1.5 text-xs font-medium text-zinc-600 transition-colors hover:bg-zinc-200 hover:cursor-pointer disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {loadingOlder ? "Loading..." : "Load older messages"}
                </button>
              </div>
            )}
            {messages.map((item) => {
              const isMine = currentUserId === item.sender_id;
              return (
                <div
                  key={item.id}
                  className={`flex ${isMine ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[78%] rounded-2xl px-3 py-2 ${
                      isMine
                        ? "rounded-br-md bg-blue-800 text-white"
                        : "rounded-bl-md border border-zinc-200 bg-zinc-50 text-zinc-800"
                    }`}
                  >
                    <p className={`text-xs font-medium ${isMine ? "text-white" : "text-(--deep-royal)"}`}>
                      {item.profiles?.full_name || item.profiles?.email || "Unknown User"}
                    </p>
                    <p className="mt-0.5 whitespace-pre-wrap text-sm">{item.body}</p>
                    <p className={`mt-1 text-[11px] ${isMine ? "text-white/90" : "text-zinc-500"}`}>
                      {new Date(item.created_at).toLocaleString()}
                    </p>
                  </div>
                </div>
              );
            })}
          </>
        ) : (
          <div className="flex h-full items-center justify-center text-sm text-zinc-600">
            No messages in this thread yet.
          </div>
        )}
      </div>

      {messageError ? (
        <p className="px-4 pb-2 text-sm font-medium text-red-700">{messageError}</p>
      ) : null}

      <div className="border-t border-zinc-200 px-4 py-3">
        <div className="flex items-end gap-2">
          <textarea
            value={newMessageBody}
            onChange={(event) => onMessageChange(event.target.value)}
            rows={2}
            placeholder="Type a message"
            className="min-h-18 flex-1 rounded-lg border border-blue-200 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:border-blue-800 focus:ring-2 focus:ring-blue-200"
          />
          <button
            type="button"
            onClick={onSend}
            disabled={sendingMessage || !newMessageBody.trim()}
            className="inline-flex items-center gap-2 rounded-lg bg-blue-800 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-900 hover:cursor-pointer disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Send className="h-4 w-4" />
            {sendingMessage ? "Sending" : "Send"}
          </button>
        </div>
      </div>
    </article>
  );
}