"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { DepartmentItem, IncidentItem, IncidentsResponse, Pagination, ViewState } from "./types";
import IncidentDetail from "./incident-detail";
import IncidentCreateForm from "./incident-create-form";
import IncidentList from "./incident-list";

type IncidentsClientProps = {
  role: "avp" | "division_head" | "department_head";
  userDepartmentId: string | null;
  userDepartmentName: string | null;
};

export default function IncidentsClient({ role, userDepartmentId, userDepartmentName }: IncidentsClientProps) {
  const [view, setView] = useState<ViewState>("list");
  const [incidents, setIncidents] = useState<IncidentItem[]>([]);
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    limit: 10,
    total: 0,
    total_pages: 1,
  });
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [departmentFilter, setDepartmentFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionBusyId, setActionBusyId] = useState<string | null>(null);
  const [departments, setDepartments] = useState<DepartmentItem[]>([]);

  const [selectedIncident, setSelectedIncident] = useState<IncidentItem | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  const queryString = useMemo(() => {
    const params = new URLSearchParams();
    params.set("page", String(pagination.page));
    params.set("limit", String(pagination.limit));

    if (search.trim()) {
      params.set("search", search.trim());
    }

    if (statusFilter === "resolved") {
      params.set("is_resolved", "true");
    } else if (statusFilter === "unresolved") {
      params.set("is_resolved", "false");
    }

    if (departmentFilter !== "all") {
      params.set("department_id", departmentFilter);
    }

    return params.toString();
  }, [pagination.page, pagination.limit, search, statusFilter, departmentFilter]);

  const cacheKey = useMemo(
    () => `acup-incidents-cache:${queryString}`,
    [queryString],
  );

  const loadIncidents = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const cached = sessionStorage.getItem(cacheKey);
      if (cached) {
        const parsed = JSON.parse(cached) as IncidentsResponse;
        setIncidents(parsed.data ?? []);
        setPagination(parsed.pagination);
      }

      const response = await fetch(`/api/incidents?${queryString}`, {
        method: "GET",
        credentials: "include",
      });

      if (!response.ok) {
        setError("Failed to load incidents.");
        setIncidents([]);
        return;
      }

      const payload = (await response.json()) as IncidentsResponse;
      setIncidents(payload.data ?? []);
      setPagination(payload.pagination);
      sessionStorage.setItem(cacheKey, JSON.stringify(payload));
    } catch {
      setError("Failed to load incidents.");
      setIncidents([]);
    } finally {
      setLoading(false);
    }
  }, [cacheKey, queryString]);

  useEffect(() => {
    void loadIncidents();
  }, [loadIncidents]);

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

  async function handleOpenIncident(id: string) {
    setLoadingDetail(true);
    setView("detail");

    try {
      const response = await fetch(`/api/incidents/${id}`, {
        method: "GET",
        credentials: "include",
      });

      if (!response.ok) {
        setError("Failed to load incident details.");
        setView("list");
        return;
      }

      const payload = (await response.json()) as { data?: IncidentItem };
      setSelectedIncident(payload.data ?? null);
    } catch {
      setError("Failed to load incident details.");
      setView("list");
    } finally {
      setLoadingDetail(false);
    }
  }

  async function handleResolve(id: string) {
    setActionBusyId(id);
    setError(null);

    try {
      const response = await fetch(`/api/incidents/${id}`, {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_resolved: true }),
      });

      if (!response.ok) {
        setError("Failed to resolve incident.");
        return;
      }

      if (selectedIncident?.id === id) {
        setSelectedIncident({ ...selectedIncident, is_resolved: true });
      }

      await loadIncidents();
    } catch {
      setError("Failed to resolve incident.");
    } finally {
      setActionBusyId(null);
    }
  }

  async function handleDelete(id: string) {
    const confirmed = window.confirm(
      "Delete this incident report? This action cannot be undone.",
    );
    if (!confirmed) return;

    setActionBusyId(id);
    setError(null);

    try {
      const response = await fetch(`/api/incidents/${id}`, {
        method: "DELETE",
        credentials: "include",
      });

      if (!response.ok) {
        setError("Delete failed. You may not have access for this action.");
        return;
      }

      setView("list");
      setSelectedIncident(null);
      await loadIncidents();
    } catch {
      setError("Delete failed. Try again.");
    } finally {
      setActionBusyId(null);
    }
  }

  function handleBackToList() {
    setView("list");
    setSelectedIncident(null);
  }

  if (view === "detail") {
    return (
      <IncidentDetail
        incident={selectedIncident}
        loading={loadingDetail}
        actionBusyId={actionBusyId}
        onResolve={(id) => void handleResolve(id)}
        onDelete={(id) => void handleDelete(id)}
        onBack={handleBackToList}
      />
    );
  }

  if (view === "create") {
    return (
      <IncidentCreateForm
        role={role}
        userDepartmentId={userDepartmentId}
        userDepartmentName={userDepartmentName}
        departments={departments}
        onCreated={() => {
          setView("list");
          void loadIncidents();
        }}
        onCancel={handleBackToList}
      />
    );
  }

  return (
    <IncidentList
      role={role}
      incidents={incidents}
      pagination={pagination}
      search={search}
      statusFilter={statusFilter}
      departmentFilter={departmentFilter}
      loading={loading}
      error={error}
      departments={departments}
      onSearchChange={(val) => {
        setSearch(val);
        setPagination((p) => ({ ...p, page: 1 }));
      }}
      onStatusFilterChange={(val) => {
        setStatusFilter(val);
        setPagination((p) => ({ ...p, page: 1 }));
      }}
      onDepartmentFilterChange={(val) => {
        setDepartmentFilter(val);
        setPagination((p) => ({ ...p, page: 1 }));
      }}
      onPageChange={(page) => setPagination((p) => ({ ...p, page }))}
      onOpenIncident={(id) => void handleOpenIncident(id)}
      onCreateNew={() => setView("create")}
    />
  );
}