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

export function scrollWorkspaceToTop() {
  if (typeof window === "undefined") {
    return;
  }

  window.scrollTo({
    top: 0,
    left: 0,
    behavior: "auto",
  });

  const targets = new Set<HTMLElement>();

  scrollElementToTop(document.scrollingElement as HTMLElement | null);
  scrollElementToTop(document.documentElement);
  scrollElementToTop(document.body);

  document
    .querySelectorAll("[data-page-shell], [data-scroll-root], main")
    .forEach((element) => {
      if (element instanceof HTMLElement) {
        targets.add(element);
      }
    });

  targets.forEach((element) => {
    scrollElementToTop(element);
  });
}

export function scheduleScrollWorkspaceToTop() {
  if (typeof window === "undefined") {
    return () => {};
  }

  const timeouts: number[] = [];
  const frameIds: number[] = [];
  const runScrollReset = () => {
    scrollWorkspaceToTop();
  };

  runScrollReset();
  frameIds.push(window.requestAnimationFrame(runScrollReset));
  frameIds.push(window.requestAnimationFrame(() => {
    window.requestAnimationFrame(runScrollReset);
  }));
  timeouts.push(window.setTimeout(runScrollReset, 140));

  return () => {
    frameIds.forEach((frameId) => window.cancelAnimationFrame(frameId));
    timeouts.forEach((timeoutId) => window.clearTimeout(timeoutId));
  };
}
