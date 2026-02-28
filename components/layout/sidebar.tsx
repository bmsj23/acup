"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import {
  BarChart2,
  Bell,
  FileText,
  LayoutDashboard,
  MessageSquare,
  Shield,
} from "lucide-react";
import type { UserRole } from "@/types/database";
import { createClient } from "@/lib/supabase/client";

type SidebarProps = {
  role: UserRole;
};

export default function Sidebar({ role }: SidebarProps) {
  const pathname = usePathname();
  const [unreadThreadCount, setUnreadThreadCount] = useState(0);

  useEffect(() => {
    async function loadUnreadCount() {
      try {
        const response = await fetch("/api/messaging/unread", {
          method: "GET",
          credentials: "include",
        });

        if (!response.ok) return;

        const payload = (await response.json()) as {
          data?: { total_unread_threads?: number };
        };

        setUnreadThreadCount(payload.data?.total_unread_threads ?? 0);
      } catch {
        setUnreadThreadCount(0);
      }
    }

    void loadUnreadCount();

    const supabase = createClient();
    const channel = supabase
      .channel("sidebar-messaging-unread")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "message_messages" },
        () => void loadUnreadCount(),
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, []);

  const navItems = [
    { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    ...(role === "department_head"
      ? [{ href: "/metrics", label: "Update Metrics", icon: BarChart2 }]
      : []),
    { href: "/announcements", label: "Announcements", icon: Bell },
    { href: "/documents", label: "Documents", icon: FileText },
    { href: "/messaging", label: "Messaging", icon: MessageSquare },
  ];

  return (
    <aside
      aria-label={`Sidebar navigation for ${role}`}
      className="relative z-30 flex w-full flex-col border-r border-transparent bg-transparent md:fixed md:inset-y-0 md:left-0 md:h-screen md:w-72 md:overflow-y-auto">
      {/* Header */}
      <div className="p-8 pb-4">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-800 text-white shadow-sm shadow-blue-200">
            <Shield className="h-5 w-5" />
          </div>
          <div>
            <h2 className="font-serif text-xl font-bold text-zinc-900 tracking-tight">
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
          <p className="px-3 text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-3">
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
                className={`
                   group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200
                   ${
                     isActive
                       ? "bg-blue-800 text-white shadow-md shadow-blue-200"
                       : "text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900"
                   }
                `}>
                <Icon
                  className={`h-4.5 w-4.5 ${isActive ? "text-white" : "text-zinc-400 group-hover:text-zinc-600"}`}
                />
                <span>{item.label}</span>
                {item.href === "/messaging" && unreadThreadCount > 0 ? (
                  <span
                    className={`ml-auto flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[10px] font-bold ${isActive ? "bg-white text-blue-800" : "bg-blue-800/10 text-blue-800"}`}>
                    {unreadThreadCount > 99 ? "99+" : unreadThreadCount}
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
