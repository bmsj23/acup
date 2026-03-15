"use client";

import { ChevronDown, LogOut } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { APP_BRAND } from "@/lib/constants/brand";

type HeaderProps = {
  email: string;
  roleLabel: string;
  displayLabel: string;
};

export default function Header({ email, roleLabel, displayLabel }: HeaderProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [openProfileMenu, setOpenProfileMenu] = useState(false);
  const profileMenuRef = useRef<HTMLDivElement>(null);

  const roleTag = useMemo(() => {
    if (roleLabel.toLowerCase().includes("avp")) {
      return "A";
    }
    if (roleLabel.toLowerCase().includes("division")) {
      return "D";
    }
    return "H";
  }, [roleLabel]);

  useEffect(() => {
    function handleOutsideClick(event: MouseEvent) {
      if (!openProfileMenu) {
        return;
      }

      if (
        profileMenuRef.current &&
        !profileMenuRef.current.contains(event.target as Node)
      ) {
        setOpenProfileMenu(false);
      }
    }

    window.addEventListener("mousedown", handleOutsideClick);
    return () => {
      window.removeEventListener("mousedown", handleOutsideClick);
    };
  }, [openProfileMenu]);

  let activeRouteLabel = "Protected workspace";

  if (pathname === "/dashboard") {
    activeRouteLabel = "Operations workspace";
  } else if (pathname === "/equipment") {
    activeRouteLabel = "Monitoring workspace";
  } else if (pathname === "/productivity") {
    activeRouteLabel = "Monitoring workspace";
  } else if (pathname.startsWith("/training/modules")) {
    activeRouteLabel = "Learning workspace";
  } else if (pathname === "/training") {
    activeRouteLabel = "Learning workspace";
  } else if (pathname === "/turnaround-time") {
    activeRouteLabel = "Monitoring workspace";
  } else if (pathname === "/announcements") {
    activeRouteLabel = "Communication workspace";
  }

  async function handleLogout() {
    const { createClient } = await import("@/lib/supabase/client");
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login", { scroll: true });
    router.refresh();
  }

  return (
    <header className="relative px-0 py-4">
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div className="min-w-0">
          <div className="inline-flex max-w-full items-center gap-2 rounded-full border border-zinc-200 bg-white px-3 py-1.5 text-[0.68rem] font-semibold uppercase tracking-[0.24em] text-zinc-500 shadow-sm">
            <span className="truncate">{APP_BRAND.shortName}</span>
            <span className="h-1 w-1 shrink-0 rounded-full bg-zinc-300" />
            <span className="truncate">{activeRouteLabel}</span>
          </div>
        </div>
        <div ref={profileMenuRef} className="relative">
          <button
            type="button"
            onClick={() => setOpenProfileMenu((previous) => !previous)}
            className="inline-flex items-center gap-3 rounded-xl border border-zinc-200 bg-white px-3 py-2 text-left shadow-sm transition-colors hover:bg-zinc-50 hover:cursor-pointer"
          >
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-blue-800 text-sm font-bold text-white">
              {roleTag}
            </span>
            <span className="min-w-0">
              <span className="block truncate text-sm font-semibold text-zinc-900">{displayLabel}</span>
              <span className="block truncate text-xs text-zinc-500">{email}</span>
            </span>
            <ChevronDown className="h-4 w-4 text-zinc-500" />
          </button>

          {openProfileMenu ? (
            <div className="absolute right-0 z-20 mt-2 w-48 rounded-xl border border-zinc-200 bg-white p-1.5 shadow-sm">
              <button
                type="button"
                onClick={() => void handleLogout()}
                className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-100 hover:cursor-pointer"
              >
                <LogOut className="h-4 w-4" />
                Logout
              </button>
            </div>
          ) : null}
          <span className="sr-only">{roleLabel}</span>
        </div>
      </div>
      <div className="absolute -left-6 -right-6 bottom-0 h-px bg-zinc-200" aria-hidden />
    </header>
  );
}
