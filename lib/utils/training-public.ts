export function getSafeTrainingReturnPath(
  value: string | string[] | null | undefined,
) {
  const candidate = Array.isArray(value) ? value[0] : value;

  if (!candidate || !candidate.startsWith("/") || candidate.startsWith("//")) {
    return null;
  }

  if (candidate.includes("://") || !candidate.startsWith("/training/")) {
    return null;
  }

  return candidate;
}
