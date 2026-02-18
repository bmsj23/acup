"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { MessageSquare, Plus, Search, Send } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

type DepartmentItem = {
  id: string;
  name: string;
};

type ThreadItem = {
  id: string;
  title: string;
  department_id: string | null;
  is_system_wide: boolean;
  created_by: string;
  created_at: string;
  updated_at: string;
  latest_message_body: string | null;
  latest_message_at: string | null;
};

type MessageItem = {
  id: string;
  thread_id: string;
  sender_id: string;
  body: string;
  created_at: string;
  profiles: {
    full_name: string | null;
    email: string | null;
  } | null;
};

export default function MessagingClient() {
  const supabase = createClient();
  const [threads, setThreads] = useState<ThreadItem[]>([]);
  const [messages, setMessages] = useState<MessageItem[]>([]);
  const [departments, setDepartments] = useState<DepartmentItem[]>([]);
  const [selectedThreadId, setSelectedThreadId] = useState<string | null>(null);
  const [loadingThreads, setLoadingThreads] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [threadError, setThreadError] = useState<string | null>(null);
  const [messageError, setMessageError] = useState<string | null>(null);
  const [unreadThreadIds, setUnreadThreadIds] = useState<string[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [threadSearch, setThreadSearch] = useState("");
  const [showCreateComposer, setShowCreateComposer] = useState(false);

  const [threadTitle, setThreadTitle] = useState("");
  const [threadBody, setThreadBody] = useState("");
  const [threadScope, setThreadScope] = useState<"system" | "department">("system");
  const [threadDepartmentId, setThreadDepartmentId] = useState("");
  const [creatingThread, setCreatingThread] = useState(false);

  const [newMessageBody, setNewMessageBody] = useState("");
  const [sendingMessage, setSendingMessage] = useState(false);

  const selectedThread = useMemo(
    () => threads.find((item) => item.id === selectedThreadId) ?? null,
    [selectedThreadId, threads],
  );
  const filteredThreads = useMemo(() => {
    if (!threadSearch.trim()) {
      return threads;
    }

    const keyword = threadSearch.trim().toLowerCase();
    return threads.filter((thread) => {
      return (
        thread.title.toLowerCase().includes(keyword) ||
        (thread.latest_message_body ?? "").toLowerCase().includes(keyword)
      );
    });
  }, [threadSearch, threads]);

  const loadThreads = useCallback(async () => {
    setLoadingThreads(true);
    setThreadError(null);

    try {
      const response = await fetch("/api/messaging/threads", {
        method: "GET",
        credentials: "include",
      });

      if (!response.ok) {
        setThreadError("Failed to load threads.");
        setThreads([]);
        return;
      }

      const payload = (await response.json()) as { data: ThreadItem[] };
      const nextThreads = payload.data ?? [];
      setThreads(nextThreads);

      if (!selectedThreadId && nextThreads.length > 0) {
        setSelectedThreadId(nextThreads[0].id);
      }

      if (selectedThreadId && !nextThreads.some((thread) => thread.id === selectedThreadId)) {
        setSelectedThreadId(nextThreads[0]?.id ?? null);
      }
    } catch {
      setThreadError("Failed to load threads.");
      setThreads([]);
    } finally {
      setLoadingThreads(false);
    }
  }, [selectedThreadId]);

  const loadMessages = useCallback(async (threadId: string) => {
    setLoadingMessages(true);
    setMessageError(null);

    try {
      const response = await fetch(`/api/messaging/messages?thread_id=${threadId}`, {
        method: "GET",
        credentials: "include",
      });

      if (!response.ok) {
        setMessageError("Failed to load messages.");
        setMessages([]);
        return;
      }

      const payload = (await response.json()) as { data: MessageItem[] };
      setMessages(payload.data ?? []);
    } catch {
      setMessageError("Failed to load messages.");
      setMessages([]);
    } finally {
      setLoadingMessages(false);
    }
  }, []);

  const loadUnreadState = useCallback(async () => {
    try {
      const response = await fetch("/api/messaging/unread", {
        method: "GET",
        credentials: "include",
      });

      if (!response.ok) {
        return;
      }

      const payload = (await response.json()) as {
        data?: {
          unread_thread_ids?: string[];
        };
      };

      setUnreadThreadIds(payload.data?.unread_thread_ids ?? []);
    } catch {
      setUnreadThreadIds([]);
    }
  }, []);

  const markSelectedThreadAsRead = useCallback(async (threadId: string) => {
    try {
      await fetch("/api/messaging/read", {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ thread_id: threadId }),
      });
    } catch {
      return;
    }
  }, []);

  useEffect(() => {
    void loadThreads();
  }, [loadThreads]);

  useEffect(() => {
    void loadUnreadState();
  }, [loadUnreadState]);

  useEffect(() => {
    async function loadDepartments() {
      try {
        const response = await fetch("/api/departments?limit=200", {
          method: "GET",
          credentials: "include",
        });

        if (!response.ok) {
          return;
        }

        const payload = (await response.json()) as { data?: DepartmentItem[] };
        setDepartments(payload.data ?? []);
      } catch {
        setDepartments([]);
      }
    }

    void loadDepartments();
  }, []);

  useEffect(() => {
    if (!selectedThreadId) {
      setMessages([]);
      return;
    }

    void loadMessages(selectedThreadId);
    void markSelectedThreadAsRead(selectedThreadId);
    setUnreadThreadIds((previous) => previous.filter((item) => item !== selectedThreadId));
  }, [selectedThreadId, loadMessages, markSelectedThreadAsRead]);

  useEffect(() => {
    async function loadCurrentUser() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      setCurrentUserId(user?.id ?? null);
    }

    void loadCurrentUser();
  }, [supabase.auth]);

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel("messaging-live")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "message_messages",
        },
        (payload) => {
          const insertedThreadId = String(payload.new.thread_id ?? "");

          void loadThreads();
          void loadUnreadState();

          if (selectedThreadId && insertedThreadId === selectedThreadId) {
            void loadMessages(selectedThreadId);
            void markSelectedThreadAsRead(selectedThreadId);
          }
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [loadMessages, loadThreads, loadUnreadState, markSelectedThreadAsRead, selectedThreadId]);

  async function handleCreateThread() {
    setThreadError(null);

    if (!threadTitle.trim() || !threadBody.trim()) {
      setThreadError("Thread title and first message are required.");
      return;
    }

    if (threadScope === "department" && !threadDepartmentId) {
      setThreadError("Department is required for department-scoped threads.");
      return;
    }

    setCreatingThread(true);

    try {
      const response = await fetch("/api/messaging/threads", {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title: threadTitle.trim(),
          body: threadBody.trim(),
          is_system_wide: threadScope === "system",
          department_id: threadScope === "department" ? threadDepartmentId : null,
        }),
      });

      if (!response.ok) {
        setThreadError("Failed to create thread.");
        return;
      }

      setThreadTitle("");
      setThreadBody("");
      setThreadScope("system");
      setThreadDepartmentId("");
      await loadThreads();
      await loadUnreadState();
    } catch {
      setThreadError("Failed to create thread.");
    } finally {
      setCreatingThread(false);
    }
  }

  async function handleSendMessage() {
    if (!selectedThreadId) {
      return;
    }

    if (!newMessageBody.trim()) {
      return;
    }

    setSendingMessage(true);
    setMessageError(null);

    try {
      const response = await fetch("/api/messaging/messages", {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          thread_id: selectedThreadId,
          body: newMessageBody.trim(),
        }),
      });

      if (!response.ok) {
        setMessageError("Failed to send message.");
        return;
      }

      setNewMessageBody("");
      await loadMessages(selectedThreadId);
      await loadThreads();
      await loadUnreadState();
      await markSelectedThreadAsRead(selectedThreadId);
    } catch {
      setMessageError("Failed to send message.");
    } finally {
      setSendingMessage(false);
    }
  }

  return (
    <div className="w-full">
      <section className="grid h-[74vh] gap-4 rounded-xl border border-zinc-200 bg-white p-3 shadow-sm lg:grid-cols-[340px_1fr]">
        <article className="flex h-full flex-col overflow-hidden rounded-xl border border-zinc-200 bg-zinc-50/70">
          <div className="border-b border-zinc-200 p-3">
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-zinc-400" />
                <input
                  value={threadSearch}
                  onChange={(event) => setThreadSearch(event.target.value)}
                  placeholder="Search threads"
                  className="w-full rounded-lg border border-zinc-200 bg-white py-2 pl-9 pr-3 text-sm text-zinc-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                />
              </div>
              <button
                type="button"
                onClick={() => setShowCreateComposer((previous) => !previous)}
                className="inline-flex items-center justify-center rounded-lg bg-blue-600 p-2 text-white transition-colors hover:bg-blue-700 hover:cursor-pointer"
                title="Create thread"
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>

            {showCreateComposer ? (
              <div className="mt-3 space-y-2 rounded-lg border border-blue-100 bg-blue-50/60 p-2.5">
                <input
                  value={threadTitle}
                  onChange={(event) => setThreadTitle(event.target.value)}
                  placeholder="Thread title"
                  className="w-full rounded-md border border-blue-200 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                />
                <div className="grid gap-2 sm:grid-cols-2">
                  <select
                    value={threadScope}
                    onChange={(event) =>
                      setThreadScope(event.target.value as "system" | "department")
                    }
                    className="rounded-md border border-blue-200 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 hover:cursor-pointer"
                  >
                    <option value="system">System-wide</option>
                    <option value="department">Department-scoped</option>
                  </select>
                  {threadScope === "department" ? (
                    <select
                      value={threadDepartmentId}
                      onChange={(event) => setThreadDepartmentId(event.target.value)}
                      className="rounded-md border border-blue-200 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 hover:cursor-pointer"
                    >
                      <option value="">Select department</option>
                      {departments.map((department) => (
                        <option key={department.id} value={department.id}>
                          {department.name}
                        </option>
                      ))}
                    </select>
                  ) : null}
                </div>
                <textarea
                  value={threadBody}
                  onChange={(event) => setThreadBody(event.target.value)}
                  rows={2}
                  placeholder="Opening message"
                  className="w-full rounded-md border border-blue-200 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                />
                <div className="flex items-center justify-between">
                  {threadError ? <p className="text-xs font-medium text-red-700">{threadError}</p> : <span />}
                  <button
                    type="button"
                    onClick={() => void handleCreateThread()}
                    disabled={creatingThread}
                    className="rounded-md bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-700 hover:cursor-pointer disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {creatingThread ? "Creating..." : "Create"}
                  </button>
                </div>
              </div>
            ) : null}
          </div>

          <div className="flex-1 space-y-2 overflow-y-auto p-3">
            {loadingThreads ? (
              <p className="text-sm text-zinc-600">Loading threads...</p>
            ) : filteredThreads.length > 0 ? (
              filteredThreads.map((thread) => {
                const isActive = thread.id === selectedThreadId;
                return (
                  <button
                    key={thread.id}
                    type="button"
                    onClick={() => setSelectedThreadId(thread.id)}
                    className={
                      isActive
                        ? "w-full rounded-lg border border-blue-300 bg-blue-50 p-3 text-left shadow-sm hover:cursor-pointer"
                        : "w-full rounded-lg border border-zinc-200 bg-white p-3 text-left transition-colors hover:border-blue-200 hover:bg-blue-50/50 hover:cursor-pointer"
                    }
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p className="line-clamp-1 text-sm font-semibold text-zinc-900">
                        {thread.title}
                      </p>
                      {unreadThreadIds.includes(thread.id) ? (
                        <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-blue-600 px-1.5 text-[10px] font-semibold uppercase tracking-wide text-white">
                          New
                        </span>
                      ) : null}
                    </div>
                    <p className="mt-1 text-xs text-zinc-500">
                      {thread.is_system_wide ? "System-wide" : "Department"}
                    </p>
                    {thread.latest_message_body ? (
                      <p className="mt-1 line-clamp-1 text-xs text-zinc-500">
                        {thread.latest_message_body}
                      </p>
                    ) : null}
                  </button>
                );
              })
            ) : (
              <p className="text-sm text-zinc-600">No messaging threads found.</p>
            )}
          </div>
        </article>

        <article className="flex h-full flex-col overflow-hidden rounded-xl border border-zinc-200 bg-white">
          {selectedThread ? (
            <>
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
                  messages.map((item) => {
                    const isMine = currentUserId === item.sender_id;
                    return (
                      <div
                        key={item.id}
                        className={`flex ${isMine ? "justify-end" : "justify-start"}`}
                      >
                        <div
                          className={`max-w-[78%] rounded-2xl px-3 py-2 ${
                            isMine
                              ? "rounded-br-md bg-blue-600 text-white"
                              : "rounded-bl-md border border-zinc-200 bg-zinc-50 text-zinc-800"
                          }`}
                        >
                          <p className={`text-xs font-medium ${isMine ? "text-blue-100" : "text-blue-700"}`}>
                            {item.profiles?.full_name || item.profiles?.email || "Unknown User"}
                          </p>
                          <p className="mt-0.5 whitespace-pre-wrap text-sm">{item.body}</p>
                          <p className={`mt-1 text-[11px] ${isMine ? "text-blue-100/90" : "text-zinc-500"}`}>
                            {new Date(item.created_at).toLocaleString()}
                          </p>
                        </div>
                      </div>
                    );
                  })
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
                    onChange={(event) => setNewMessageBody(event.target.value)}
                    rows={2}
                    placeholder="Type a message"
                    className="min-h-18 flex-1 rounded-lg border border-blue-200 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                  />
                  <button
                    type="button"
                    onClick={() => void handleSendMessage()}
                    disabled={sendingMessage || !newMessageBody.trim()}
                    className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700 hover:cursor-pointer disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <Send className="h-4 w-4" />
                    {sendingMessage ? "Sending" : "Send"}
                  </button>
                </div>
              </div>
            </>
          ) : (
            <div className="flex h-full flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-blue-200 bg-blue-50/40">
              <MessageSquare className="h-6 w-6 text-blue-500" />
              <p className="text-sm text-zinc-600">Select a thread to start messaging.</p>
            </div>
          )}
        </article>
      </section>
    </div>
  );
}