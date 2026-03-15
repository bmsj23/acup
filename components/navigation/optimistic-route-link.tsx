"use client";

import Link from "next/link";
import type { ComponentProps, MouseEvent } from "react";
import { useRouteTransition } from "@/components/providers/route-transition-provider";

type OptimisticRouteLinkProps = Omit<ComponentProps<typeof Link>, "href"> & {
  href: string;
};

function isModifiedEvent(event: MouseEvent<HTMLAnchorElement>) {
  return event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey;
}

export default function OptimisticRouteLink({
  href,
  onClick,
  onFocus,
  onMouseEnter,
  target,
  ...props
}: OptimisticRouteLinkProps) {
  const { beginNavigation, prefetchRoute } = useRouteTransition();

  return (
    <Link
      href={href}
      target={target}
      onClick={(event) => {
        onClick?.(event);

        if (event.defaultPrevented || isModifiedEvent(event) || (target && target !== "_self")) {
          return;
        }

        beginNavigation(href);
      }}
      onFocus={(event) => {
        onFocus?.(event);
        prefetchRoute(href);
      }}
      onMouseEnter={(event) => {
        onMouseEnter?.(event);
        prefetchRoute(href);
      }}
      {...props}
    />
  );
}
