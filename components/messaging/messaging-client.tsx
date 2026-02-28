"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { DepartmentItem, MessageItem, ThreadItem } from "./types";
import ThreadList from "./thread-list";
import ChatPanel from "./chat-panel";

export default function MessagingClient() {
  const supabaseRef = useRef(createClient());
  const supabase = supabaseRef.current;
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
  const [hasMoreMessages, setHasMoreMessages] = useState(false);
  const [loadingOlder, setLoadingOlder] = useState(false);

  const selectedThread = useMemo(
    () => threads.find((item) => item.id === selectedThreadId) ?? null,
    [selectedThreadId, threads],
  );
  const filteredThreads = useMemo(() => {
    if (!threadSearch.trim()) return threads;
    const keyword = threadSearch.trim().toLowerCase();
    return threads.filter(
      (t) =>
        t.title.toLowerCase().includes(keyword) ||
        (t.latest_message_body ?? "").toLowerCase().includes(keyword),
    );
  }, [threadSearch, threads]);

  const loadThreads = useCallback(async () => {
    setLoadingThreads(true);
    setThreadError(null);
    try {
      const response = await fetch("/api/messaging/threads", { method: "GET", credentials: "include" });
      if (!response.ok) { setThreadError("Failed to load threads."); setThreads([]); return; }
      const payload = (await response.json()) as { data: ThreadItem[] };
      const nextThreads = payload.data ?? [];
      setThreads(nextThreads);
      if (!selectedThreadId && nextThreads.length > 0) setSelectedThreadId(nextThreads[0].id);
      if (selectedThreadId && !nextThreads.some((t) => t.id === selectedThreadId))
        setSelectedThreadId(nextThreads[0]?.id ?? null);
    } catch { setThreadError("Failed to load threads."); setThreads([]); }
    finally { setLoadingThreads(false); }
  }, [selectedThreadId]);

  const loadMessages = useCallback(async (threadId: string) => {
    setLoadingMessages(true);
    setMessageError(null);
    try {
      const response = await fetch(`/api/messaging/messages?thread_id=${threadId}&limit=50`, { method: "GET", credentials: "include" });
      if (!response.ok) { setMessageError("Failed to load messages."); setMessages([]); setHasMoreMessages(false); return; }
      const payload = (await response.json()) as { data: MessageItem[]; meta?: { has_more?: boolean } };
      setMessages(payload.data ?? []);
      setHasMoreMessages(payload.meta?.has_more ?? false);
    } catch { setMessageError("Failed to load messages."); setMessages([]); setHasMoreMessages(false); }
    finally { setLoadingMessages(false); }
  }, []);

  const loadOlderMessages = useCallback(async () => {
    if (!selectedThreadId || messages.length === 0) return;
    setLoadingOlder(true);
    const oldestTimestamp = messages[0]?.created_at;
    try {
      const response = await fetch(
        `/api/messaging/messages?thread_id=${selectedThreadId}&limit=50&before=${encodeURIComponent(oldestTimestamp)}`,
        { method: "GET", credentials: "include" },
      );
      if (!response.ok) return;
      const payload = (await response.json()) as { data: MessageItem[]; meta?: { has_more?: boolean } };
      setMessages((previous) => [...(payload.data ?? []), ...previous]);
      setHasMoreMessages(payload.meta?.has_more ?? false);
    } catch { /* noop */ }
    finally { setLoadingOlder(false); }
  }, [selectedThreadId, messages]);

  const loadUnreadState = useCallback(async () => {
    try {
      const response = await fetch("/api/messaging/unread", { method: "GET", credentials: "include" });
      if (!response.ok) return;
      const payload = (await response.json()) as { data?: { unread_thread_ids?: string[] } };
      setUnreadThreadIds(payload.data?.unread_thread_ids ?? []);
    } catch { setUnreadThreadIds([]); }
  }, []);

  const markSelectedThreadAsRead = useCallback(async (threadId: string) => {
    try {
      await fetch("/api/messaging/read", {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ thread_id: threadId }),
      });
    } catch { return; }
  }, []);

  useEffect(() => { void loadThreads(); }, [loadThreads]);
  useEffect(() => { void loadUnreadState(); }, [loadUnreadState]);

  useEffect(() => {
    async function loadDepartments() {
      try {
        const response = await fetch("/api/departments?limit=200", { method: "GET", credentials: "include" });
        if (!response.ok) return;
        const payload = (await response.json()) as { data?: DepartmentItem[] };
        setDepartments(payload.data ?? []);
      } catch { setDepartments([]); }
    }
    void loadDepartments();
  }, []);

  useEffect(() => {
    if (!selectedThreadId) { setMessages([]); return; }
    void loadMessages(selectedThreadId);
    void markSelectedThreadAsRead(selectedThreadId);
    setUnreadThreadIds((prev) => prev.filter((item) => item !== selectedThreadId));
  }, [selectedThreadId, loadMessages, markSelectedThreadAsRead]);

  useEffect(() => {
    async function loadCurrentUser() {
      const { data: { user } } = await supabase.auth.getUser();
      setCurrentUserId(user?.id ?? null);
    }
    void loadCurrentUser();
  }, [supabase.auth]);

  // realtime subscription for new messages
  useEffect(() => {
    const channel = supabase
      .channel("messaging-live")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "message_messages" }, (payload) => {
        const newMessage = payload.new as MessageItem & { profiles?: MessageItem["profiles"] };
        const insertedThreadId = String(newMessage.thread_id ?? "");
        void loadThreads();
        if (selectedThreadId && insertedThreadId === selectedThreadId) {
          setMessages((prev) => [...prev, newMessage]);
          void markSelectedThreadAsRead(selectedThreadId);
        } else {
          void loadUnreadState();
        }
      })
      .subscribe();
    return () => { void supabase.removeChannel(channel); };
  }, [supabase, loadMessages, loadThreads, loadUnreadState, markSelectedThreadAsRead, selectedThreadId]);

  async function handleCreateThread() {
    setThreadError(null);
    if (!threadTitle.trim() || !threadBody.trim()) { setThreadError("Thread title and first message are required."); return; }
    if (threadScope === "department" && !threadDepartmentId) { setThreadError("Department is required for department-scoped threads."); return; }
    setCreatingThread(true);
    try {
      const response = await fetch("/api/messaging/threads", {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: threadTitle.trim(), body: threadBody.trim(),
          is_system_wide: threadScope === "system",
          department_id: threadScope === "department" ? threadDepartmentId : null,
        }),
      });
      if (!response.ok) { setThreadError("Failed to create thread."); return; }
      setThreadTitle(""); setThreadBody(""); setThreadScope("system"); setThreadDepartmentId("");
      await loadThreads(); await loadUnreadState();
    } catch { setThreadError("Failed to create thread."); }
    finally { setCreatingThread(false); }
  }

  async function handleSendMessage() {
    if (!selectedThreadId || !newMessageBody.trim()) return;
    setSendingMessage(true);
    setMessageError(null);
    try {
      const response = await fetch("/api/messaging/messages", {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ thread_id: selectedThreadId, body: newMessageBody.trim() }),
      });
      if (!response.ok) { setMessageError("Failed to send message."); return; }
      setNewMessageBody("");
      await loadMessages(selectedThreadId); await loadThreads();
      await loadUnreadState(); await markSelectedThreadAsRead(selectedThreadId);
    } catch { setMessageError("Failed to send message."); }
    finally { setSendingMessage(false); }
  }

  return (
    <div className="w-full">
      <section className="grid h-[74vh] gap-4 rounded-xl border border-zinc-200 bg-white p-3 shadow-sm lg:grid-cols-[340px_1fr]">
        <ThreadList
          threads={filteredThreads}
          selectedThreadId={selectedThreadId}
          unreadThreadIds={unreadThreadIds}
          threadSearch={threadSearch}
          loadingThreads={loadingThreads}
          showCreateComposer={showCreateComposer}
          threadTitle={threadTitle}
          threadBody={threadBody}
          threadScope={threadScope}
          threadDepartmentId={threadDepartmentId}
          threadError={threadError}
          creatingThread={creatingThread}
          departments={departments}
          onSearchChange={setThreadSearch}
          onToggleComposer={() => setShowCreateComposer((prev) => !prev)}
          onSelectThread={setSelectedThreadId}
          onTitleChange={setThreadTitle}
          onBodyChange={setThreadBody}
          onScopeChange={setThreadScope}
          onDepartmentIdChange={setThreadDepartmentId}
          onCreateThread={() => void handleCreateThread()}
        />
        <ChatPanel
          selectedThread={selectedThread}
          messages={messages}
          currentUserId={currentUserId}
          loadingMessages={loadingMessages}
          messageError={messageError}
          hasMoreMessages={hasMoreMessages}
          loadingOlder={loadingOlder}
          newMessageBody={newMessageBody}
          sendingMessage={sendingMessage}
          onLoadOlder={() => void loadOlderMessages()}
          onMessageChange={setNewMessageBody}
          onSend={() => void handleSendMessage()}
        />
      </section>
    </div>
  );
}