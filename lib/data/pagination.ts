export function getPagination(searchParams: URLSearchParams) {
  const pageRaw = Number.parseInt(searchParams.get("page") ?? "1", 10);
  const limitRaw = Number.parseInt(searchParams.get("limit") ?? "20", 10);

  const page = Number.isNaN(pageRaw) || pageRaw < 1 ? 1 : pageRaw;
  const limit = Number.isNaN(limitRaw)
    ? 20
    : Math.min(Math.max(limitRaw, 1), 100);

  const from = (page - 1) * limit;
  const to = from + limit - 1;

  return { page, limit, from, to };
}

export function createPagination(page: number, limit: number, total: number | null) {
  return {
    page,
    limit,
    total: total ?? 0,
    total_pages: Math.max(1, Math.ceil((total ?? 0) / limit)),
  };
}