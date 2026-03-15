"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

function scrollElementToTop(element: HTMLElement | null) {
  if (!element) {
    return;
  }

  element.scrollTo({
    top: 0,
    left: 0,
    behavior: "auto",
  });
}

export default function RouteScrollReset() {
  const pathname = usePathname();

  useEffect(() => {
    const frameId = window.requestAnimationFrame(() => {
      window.scrollTo({
        top: 0,
        left: 0,
        behavior: "auto",
      });

      scrollElementToTop(document.scrollingElement as HTMLElement | null);
      scrollElementToTop(document.documentElement);
      scrollElementToTop(document.body);

      const pageShell = document.querySelector("[data-page-shell]");
      scrollElementToTop(pageShell instanceof HTMLElement ? pageShell : null);
    });

    return () => {
      window.cancelAnimationFrame(frameId);
    };
  }, [pathname]);

  return null;
}
