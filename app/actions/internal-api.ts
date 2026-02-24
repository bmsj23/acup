import "server-only";
import { cookies, headers } from "next/headers";

function resolveOrigin(host: string | null, proto: string | null) {
  if (!host) {
    return "http://localhost:3000";
  }

  // default to https in non-local environments when the header is absent
  const isLocal = process.env.NODE_ENV === "development";
  const fallback = isLocal ? "http" : "https";
  const scheme = proto && proto.length > 0 ? proto : fallback;
  return `${scheme}://${host}`;
}

export async function internalApiFetch(
  path: string,
  init: Omit<RequestInit, "headers"> & {
    headers?: Record<string, string>;
  } = {},
) {
  const headerStore = await headers();
  const cookieStore = await cookies();

  const host = headerStore.get("x-forwarded-host") ?? headerStore.get("host");
  const proto = headerStore.get("x-forwarded-proto");
  const origin = resolveOrigin(host, proto);

  const response = await fetch(`${origin}${path}`, {
    ...init,
    headers: {
      ...(init.body ? { "Content-Type": "application/json" } : {}),
      ...init.headers,
      Cookie: cookieStore.toString(),
    },
    cache: "no-store",
  });

  if (response.status === 204) {
    return { ok: true, status: 204, data: null };
  }

  let data: unknown = null;
  try {
    data = await response.json();
  } catch {
    data = null;
  }

  return {
    ok: response.ok,
    status: response.status,
    data,
  };
}