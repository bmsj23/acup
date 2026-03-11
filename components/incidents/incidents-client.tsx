"use client";

import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
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
  const queryClient = useQueryClient();
  const [view, setView] = useState<ViewState>("list");
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [departmentFilter, setDepartmentFilter] = useState("all");
  const [actionBusyId, setActionBusyId] = useState<string | null>(null);

  const [selectedIncident, setSelectedIncident] = useState<IncidentItem | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  const queryString = useMemo(() => {
    const params = new URLSearchParams();
    params.set("page", String(page));
    params.set("limit", String(limit));

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
  }, [page, limit, search, statusFilter, departmentFilter]);

  const {
    data: incidentsData,
    isLoading: loading,
    error: queryError,
  } = useQuery<IncidentsResponse>({
    queryKey: ["incidents", queryString],
    queryFn: async () => {
      const response = await fetch(`/api/incidents?${queryString}`, {
        method: "GET",
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to load incidents.");
      return response.json();
    },
    staleTime: 0,
    gcTime: 0,
  });

  const incidents = incidentsData?.data ?? [];
  const pagination: Pagination = incidentsData?.pagination ?? { page: 1, limit: 10, total: 0, total_pages: 1 };
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
    staleTime: 5 * 60 * 1000,
  });

  const resolveMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/incidents/${id}`, {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_resolved: true }),
      });
      if (!response.ok) throw new Error("Failed to resolve incident.");
      return id;
    },
    onMutate: (id) => { setActionBusyId(id); },
    onSuccess: (id) => {
      toast.success("Incident resolved.");
      if (selectedIncident?.id === id) {
        setSelectedIncident({ ...selectedIncident, is_resolved: true });
      }
      void queryClient.invalidateQueries({ queryKey: ["incidents"] });
    },
    onError: (err) => { toast.error(err.message); },
    onSettled: () => { setActionBusyId(null); },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/incidents/${id}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!response.ok) throw new Error("Delete failed. You may not have access for this action.");
      return id;
    },
    onMutate: (id) => { setActionBusyId(id); },
    onSuccess: () => {
      toast.success("Incident deleted.");
      setView("list");
      setSelectedIncident(null);
      void queryClient.invalidateQueries({ queryKey: ["incidents"] });
    },
    onError: (err) => { toast.error(err.message); },
    onSettled: () => { setActionBusyId(null); },
  });

  async function handleOpenIncident(id: string) {
    setLoadingDetail(true);
    setView("detail");

    try {
      const response = await fetch(`/api/incidents/${id}`, {
        method: "GET",
        credentials: "include",
      });

      if (!response.ok) {
        toast.error("Failed to load incident details.");
        setView("list");
        return;
      }

      const payload = (await response.json()) as { data?: IncidentItem };
      setSelectedIncident(payload.data ?? null);
    } catch {
      toast.error("Failed to load incident details.");
      setView("list");
    } finally {
      setLoadingDetail(false);
    }
  }

  function handleResolve(id: string) {
    resolveMutation.mutate(id);
  }

  function handleDelete(id: string) {
    const confirmed = window.confirm(
      "Delete this incident report? This action cannot be undone.",
    );
    if (!confirmed) return;
    deleteMutation.mutate(id);
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
        onResolve={(id) => handleResolve(id)}
        onDelete={(id) => handleDelete(id)}
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
          void queryClient.invalidateQueries({ queryKey: ["incidents"] });
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
        setPage(1);
      }}
      onStatusFilterChange={(val) => {
        setStatusFilter(val);
        setPage(1);
      }}
      onDepartmentFilterChange={(val) => {
        setDepartmentFilter(val);
        setPage(1);
      }}
      onPageChange={(p) => setPage(p)}
      onOpenIncident={(id) => void handleOpenIncident(id)}
      onCreateNew={() => setView("create")}
    />
  );
}