"use client";

import {
  createContext,
  useContext,
  useCallback,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { useQueryClient } from "@tanstack/react-query";
import { usePathname, useRouter } from "next/navigation";
import { prefetchProtectedRouteData } from "@/lib/navigation/protected-route-prefetch";

type RouteTransitionContextValue = {
  activePathname: string;
  pendingPathname: string | null;
  isPanelPending: boolean;
  beginNavigation: (href: string) => void;
  prefetchRoute: (href: string) => void;
};

type RouteTransitionProviderProps = {
  children: ReactNode;
  defaultDepartmentId: string | null;
};

const RouteTransitionContext = createContext<RouteTransitionContextValue>({
  activePathname: "",
  pendingPathname: null,
  isPanelPending: false,
  beginNavigation: () => {},
  prefetchRoute: () => {},
});

function matchesRoute(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function RouteTransitionProvider({
  children,
  defaultDepartmentId,
}: RouteTransitionProviderProps) {
  const pathname = usePathname();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [transitionState, setTransitionState] = useState<{
    sourcePathname: string;
    targetPathname: string;
  } | null>(null);

  const prefetchRoute = useCallback((href: string) => {
    if (!href.startsWith("/")) {
      return;
    }

    router.prefetch(href);
    void prefetchProtectedRouteData({
      href,
      queryClient,
      defaultDepartmentId,
    }).catch(() => {});
  }, [defaultDepartmentId, queryClient, router]);

  const beginNavigation = useCallback((href: string) => {
    if (!href.startsWith("/")) {
      return;
    }

    if (matchesRoute(pathname, href)) {
      setTransitionState(null);
      return;
    }

    setTransitionState({
      sourcePathname: pathname,
      targetPathname: href,
    });
    prefetchRoute(href);
  }, [pathname, prefetchRoute]);

  const pendingPathname =
    transitionState?.sourcePathname === pathname
      ? transitionState.targetPathname
      : null;

  useEffect(() => {
    if (!transitionState) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setTransitionState(null);
    }, 15000);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [transitionState]);

  const isPanelPending =
    pendingPathname !== null && !matchesRoute(pathname, pendingPathname);

  return (
    <RouteTransitionContext.Provider
      value={{
        activePathname: isPanelPending ? pendingPathname : pathname,
        pendingPathname,
        isPanelPending,
        beginNavigation,
        prefetchRoute,
      }}
    >
      {children}
    </RouteTransitionContext.Provider>
  );
}

export function useRouteTransition() {
  return useContext(RouteTransitionContext);
}
