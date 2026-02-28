"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type {
  AnnouncementDetail as AnnouncementDetailType,
  AnnouncementItem,
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
  const [view, setView] = useState<ViewState>("list");
  const [announcements, setAnnouncements] = useState<AnnouncementItem[]>([]);
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    limit: 8,
    total: 0,
    total_pages: 1,
  });
  const [search, setSearch] = useState("");
  const [priority, setPriority] = useState("all");
  const [scope, setScope] = useState("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionBusyId, setActionBusyId] = useState<string | null>(null);
  const [departments, setDepartments] = useState<DepartmentItem[]>([]);

  const [selectedAnnouncement, setSelectedAnnouncement] = useState<AnnouncementDetailType | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  const queryString = useMemo(() => {
    const params = new URLSearchParams();
    params.set("page", String(pagination.page));
    params.set("limit", String(pagination.limit));

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
  }, [pagination.page, pagination.limit, priority, scope, search]);

  const cacheKey = useMemo(
    () => `acup-announcements-cache:${queryString}`,
    [queryString],
  );

  const loadAnnouncements = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const cached = sessionStorage.getItem(cacheKey);
      if (cached) {
        const parsed = JSON.parse(cached) as AnnouncementsResponse;
        setAnnouncements(parsed.data ?? []);
        setPagination(parsed.pagination);
      }

      const response = await fetch(`/api/announcements?${queryString}`, {
        method: "GET",
        credentials: "include",
      });

      if (!response.ok) {
        setError("Failed to load announcements.");
        setAnnouncements([]);
        return;
      }

      const payload = (await response.json()) as AnnouncementsResponse;
      setAnnouncements(payload.data ?? []);
      setPagination(payload.pagination);
      sessionStorage.setItem(cacheKey, JSON.stringify(payload));
    } catch {
      setError("Failed to load announcements.");
      setAnnouncements([]);
    } finally {
      setLoading(false);
    }
  }, [cacheKey, queryString]);

  useEffect(() => {
    void loadAnnouncements();
  }, [loadAnnouncements]);

  useEffect(() => {
    async function loadDepartments() {
      try {
        const response = await fetch("/api/departments?limit=200", {
          method: "GET",
          credentials: "include",
        });

        if (!response.ok) return;

        const payload = (await response.json()) as { data?: DepartmentItem[] };
        setDepartments(payload.data ?? []);
      } catch {
        setDepartments([]);
      }
    }

    void loadDepartments();
  }, []);

  async function handleOpenAnnouncement(id: string) {
    setLoadingDetail(true);
    setView("detail");

    try {
      const response = await fetch(`/api/announcements/${id}`, {
        method: "GET",
        credentials: "include",
      });

      if (!response.ok) {
        setError("Failed to load announcement details.");
        setView("list");
        return;
      }

      const payload = (await response.json()) as { data?: AnnouncementDetailType };
      setSelectedAnnouncement(payload.data ?? null);
    } catch {
      setError("Failed to load announcement details.");
      setView("list");
    } finally {
      setLoadingDetail(false);
    }
  }

  async function handleDelete(id: string) {
    const confirmed = window.confirm("Delete this announcement?");
    if (!confirmed) return;

    setActionBusyId(id);
    setError(null);

    try {
      const response = await fetch(`/api/announcements/${id}`, {
        method: "DELETE",
        credentials: "include",
      });

      if (!response.ok) {
        setError("Delete failed. You may not have access for this action.");
        return;
      }

      setView("list");
      setSelectedAnnouncement(null);
      await loadAnnouncements();
    } catch {
      setError("Delete failed. Try again.");
    } finally {
      setActionBusyId(null);
    }
  }

  function handleBackToList() {
    setView("list");
    setSelectedAnnouncement(null);
  }

  if (view === "detail") {
    return (
      <AnnouncementDetail
        announcement={selectedAnnouncement}
        loading={loadingDetail}
        error={error}
        actionBusyId={actionBusyId}
        onDelete={(id) => void handleDelete(id)}
        onBack={handleBackToList}
      />
    );
  }

  if (view === "create") {
    return (
      <AnnouncementCreateForm
        role={role}
        userDepartmentId={userDepartmentId}
        userDepartmentName={userDepartmentName}
        departments={departments}
        onCreated={() => {
          setView("list");
          void loadAnnouncements();
        }}
        onCancel={handleBackToList}
      />
    );
  }

  return (
    <AnnouncementList
      announcements={announcements}
      pagination={pagination}
      search={search}
      priority={priority}
      scope={scope}
      loading={loading}
      error={error}
      onSearchChange={(val) => {
        setPagination((p) => ({ ...p, page: 1 }));
        setSearch(val);
      }}
      onPriorityChange={(val) => {
        setPagination((p) => ({ ...p, page: 1 }));
        setPriority(val);
      }}
      onScopeChange={(val) => {
        setPagination((p) => ({ ...p, page: 1 }));
        setScope(val);
      }}
      onPageChange={(page) => setPagination((p) => ({ ...p, page }))}
      onRefresh={() => void loadAnnouncements()}
      onOpenAnnouncement={(id) => void handleOpenAnnouncement(id)}
      onCreateNew={() => setView("create")}
    />
  );
}
