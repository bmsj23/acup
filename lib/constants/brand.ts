export const APP_BRAND = {
  fullName: "Ancillary Services Management System",
  shortName: "ASMS",
  legalOwner: "Mary Mediatrix Medical Center",
} as const;

export function buildBrandTitle(page?: string) {
  if (!page) {
    return APP_BRAND.fullName;
  }

  return `${APP_BRAND.shortName} | ${page}`;
}
