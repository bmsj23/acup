"use client";

import { useEffect, useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  WORKSPACE_QUERY_GC_TIME,
  WORKSPACE_QUERY_STALE_TIME,
} from "@/lib/navigation/protected-route-prefetch";
import { scheduleScrollWorkspaceToTop } from "@/lib/navigation/scroll";
import type {
  AnnouncementDetail as AnnouncementDetailType,
  AnnouncementsResponse,
  DepartmentItem,
  Pagination,
  ViewState,
} from "./types";
import AnnouncementDetail from "./announcement-detail";
import AnnouncementCreateForm from "./announcement-create-form";
import AnnouncementList from "./announcement-list";

type AnnouncementsClientProps = {
  role: "avp" | "division_head" | "department_head";
  userDepartmentId: string | null;
  userDepartmentName: string | null;
};

export default function AnnouncementsClient({ role, userDepartmentId, userDepartmentName }: AnnouncementsClientProps) {
  const queryClient = useQueryClient();
  const [view, setView] = useState<ViewState>("list");
  const [page, setPage] = useState(1);
  const [limit] = useState(8);
  const [search, setSearch] = useState("");
  const [priority, setPriority] = useState("all");
  const [scope, setScope] = useState("all");
  const [actionBusyId, setActionBusyId] = useState<string | null>(null);

  const [selectedAnnouncement, setSelectedAnnouncement] = useState<AnnouncementDetailType | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  const queryString = useMemo(() => {
    const params = new URLSearchParams();
    params.set("page", String(page));
    params.set("limit", String(limit));

    if (search.trim()) {
      params.set("search", search.trim());
    }

    if (priority !== "all") {
      params.set("priority", priority);
    }

    if (scope === "system") {
      params.set("is_system_wide", "true");
    } else if (scope === "department") {
      params.set("is_system_wide", "false");
    }

    return params.toString();
  }, [page, limit, priority, scope, search]);

  const {
    data: announcementsData,
    isLoading: loading,
    error: queryError,
    refetch: refetchAnnouncements,
  } = useQuery<AnnouncementsResponse>({
    queryKey: ["announcements", queryString],
    queryFn: async () => {
      const response = await fetch(`/api/announcements?${queryString}`, {
        method: "GET",
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to load announcements.");
      return response.json();
    },
    staleTime: WORKSPACE_QUERY_STALE_TIME,
    gcTime: WORKSPACE_QUERY_GC_TIME,
    refetchOnWindowFocus: false,
    placeholderData: (previous) => previous,
  });

  const announcements = announcementsData?.data ?? [];
  const pagination: Pagination = announcementsData?.pagination ?? { page: 1, limit: 8, total: 0, total_pages: 1 };
  const error = queryError?.message ?? null;

  const { data: departments = [] } = useQuery<DepartmentItem[]>({
    queryKey: ["departments"],
    queryFn: async () => {
      const response = await fetch("/api/departments?limit=200", {
        method: "GET",
        credentials: "include",
      });
      if (!response.ok) return [];
      const payload = (await response.json()) as { data?: DepartmentItem[] };
      return payload.data ?? [];
    },
    staleTime: WORKSPACE_QUERY_STALE_TIME,
    gcTime: WORKSPACE_QUERY_GC_TIME,
    refetchOnWindowFocus: false,
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/announcements/${id}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!response.ok) throw new Error("Delete failed. You may not have access for this action.");
      return id;
    },
    onMutate: (id) => { setActionBusyId(id); },
    onSuccess: () => {
      toast.success("Announcement deleted.");
      setView("list");
      setSelectedAnnouncement(null);
      void queryClient.invalidateQueries({ queryKey: ["announcements"] });
    },
    onError: (err) => { toast.error(err.message); },
    onSettled: () => { setActionBusyId(null); },
  });

  async function handleOpenAnnouncement(id: string) {
    setLoadingDetail(true);
    setView("detail");

    try {
      const response = await fetch(`/api/announcements/${id}`, {
        method: "GET",
        credentials: "include",
      });

      if (!response.ok) {
        toast.error("Failed to load announcement details.");
        setView("list");
        return;
      }

      const payload = (await response.json()) as { data?: AnnouncementDetailType };
      setSelectedAnnouncement(payload.data ?? null);
    } catch {
      toast.error("Failed to load announcement details.");
      setView("list");
    } finally {
      setLoadingDetail(false);
    }
  }

  function handleDelete(id: string) {
    const confirmed = window.confirm("Delete this announcement?");
    if (!confirmed) return;
    deleteMutation.mutate(id);
  }

  function handleBackToList() {
    setView("list");
    setSelectedAnnouncement(null);
  }

  useEffect(() => {
    return scheduleScrollWorkspaceToTop();
  }, [view]);

  let content: React.ReactNode;

  if (view === "detail") {
    content = (
      <AnnouncementDetail
        announcement={selectedAnnouncement}
        loading={loadingDetail}
        error={error}
        actionBusyId={actionBusyId}
        onDelete={(id) => handleDelete(id)}
        onBack={handleBackToList}
      />
    );
  } else if (view === "create") {
    content = (
      <AnnouncementCreateForm
        role={role}
        userDepartmentId={userDepartmentId}
        userDepartmentName={userDepartmentName}
        departments={departments}
        onCreated={() => {
          setView("list");
          void queryClient.invalidateQueries({ queryKey: ["announcements"] });
        }}
        onCancel={handleBackToList}
      />
    );
  } else {
    content = (
      <AnnouncementList
        announcements={announcements}
        pagination={pagination}
        search={search}
        priority={priority}
        scope={scope}
        loading={loading}
        error={error}
        onSearchChange={(val) => {
          setPage(1);
          setSearch(val);
        }}
        onPriorityChange={(val) => {
          setPage(1);
          setPriority(val);
        }}
        onScopeChange={(val) => {
          setPage(1);
          setScope(val);
        }}
        onPageChange={(p) => setPage(p)}
        onRefresh={() => void refetchAnnouncements()}
        onOpenAnnouncement={(id) => void handleOpenAnnouncement(id)}
        onCreateNew={() => setView("create")}
      />
    );
  }

  return (
    <div key={view} className="motion-safe:animate-page-enter">
      {content}
    </div>
  );
}
