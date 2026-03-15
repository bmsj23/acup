"use client";

import { useEffect } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { scheduleScrollWorkspaceToTop } from "@/lib/navigation/scroll";

export default function RouteScrollReset() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const routeKey = `${pathname}?${searchParams.toString()}`;

  useEffect(() => {
    return scheduleScrollWorkspaceToTop();
  }, [routeKey]);

  return null;
}
