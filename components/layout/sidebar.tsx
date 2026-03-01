"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import {
  AlertTriangle,
  BarChart2,
  Bell,
  LayoutDashboard,
} from "lucide-react";
import type { UserRole } from "@/types/database";
import { createClient } from "@/lib/supabase/client";

type SidebarProps = {
  role: UserRole;
};

export default function Sidebar({ role }: SidebarProps) {
  const pathname = usePathname();
  const [unresolvedIncidentCount, setUnresolvedIncidentCount] = useState(0);

  useEffect(() => {
    async function loadIncidentCount() {
      try {
        const response = await fetch("/api/incidents?is_resolved=false&limit=1", {
          method: "GET",
          credentials: "include",
        });

        if (!response.ok) return;

        const payload = (await response.json()) as {
          pagination?: { total?: number };
        };

        setUnresolvedIncidentCount(payload.pagination?.total ?? 0);
      } catch {
        setUnresolvedIncidentCount(0);
      }
    }

    void loadIncidentCount();

    const supabase = createClient();
    const channel = supabase
      .channel("sidebar-incidents-unresolved")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "incidents" },
        () => void loadIncidentCount(),
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, []);

  const navItems = [
    { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { href: "/announcements", label: "Announcements", icon: Bell },
    ...(role === "department_head"
      ? [{ href: "/metrics", label: "Update Metrics", icon: BarChart2 }]
      : []),
    { href: "/incidents", label: "Incidents", icon: AlertTriangle },
  ];

  return (
    <aside
      aria-label={`Sidebar navigation for ${role}`}
      className="relative z-30 flex w-full flex-col border-r border-transparent bg-transparent md:fixed md:inset-y-0 md:left-0 md:h-screen md:w-72 md:overflow-y-auto">
      {/* Header */}
      <div className="p-13 pb-4">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 items-center">
            <Link href="/">
              <Image src="/assets/logo.png" alt="ACUP logo" width={44} height={44} className="h-11 w-11 object-contain" />
            </Link>
          </div>
          <div>
            <h2 className="font-poppins text-3xl font-bold text-zinc-900 tracking-tight">
              ACUP
            </h2>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav
        className="flex-1 px-4 py-6 space-y-8"
        aria-label="Primary navigation">
        <div className="space-y-1">
          <p className="px-3 text-xs font-semibold text-zinc-600 uppercase tracking-wider mb-3">
            Menu
          </p>
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive =
              pathname === item.href || pathname.startsWith(`${item.href}/`);

            return (
              <Link
                key={item.href}
                href={item.href}
                className={
                  `group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200 ` +
                  (isActive
                    ? "bg-blue-50 text-blue-900 border-l-4 border-blue-800"
                    : "text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900")
                }>
                <Icon
                  className={`h-4.5 w-4.5 ${isActive ? "text-blue-800" : "text-zinc-500 group-hover:text-zinc-600"}`}
                />
                <span>{item.label}</span>
                {item.href === "/incidents" && unresolvedIncidentCount > 0 ? (
                  <span className="ml-auto flex items-center gap-1.5">
                    <span className="relative flex h-2.5 w-2.5">
                      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75" />
                      <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-red-500" />
                    </span>
                    <span
                      className={`flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[10px] font-bold ${isActive ? "bg-white text-red-700" : "bg-red-100 text-red-700"}`}>
                      {unresolvedIncidentCount > 99 ? "99+" : unresolvedIncidentCount}
                    </span>
                  </span>
                ) : null}
              </Link>
            );
          })}
        </div>
      </nav>
    </aside>
  );
}
