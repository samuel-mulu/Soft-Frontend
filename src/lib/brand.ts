/** Platform & owner branding (override via env for white-label). */
export const BRAND_OWNER = 'Brhane GebreCherkos';
export const BRAND_MARK = 'BG Stock';
export const BRAND_TAGLINE = 'Distribution & bottle ledger';

export function getBusinessName(): string {
  return (process.env.NEXT_PUBLIC_BUSINESS_NAME || BRAND_OWNER).trim();
}

export function getLogoPath(): string {
  const path = process.env.NEXT_PUBLIC_LOGO_PATH || '/logo.svg';
  return path.startsWith('/') ? path : `/${path}`;
}

export function getLogoUrl(origin?: string): string {
  const path = getLogoPath();
  if (origin) return `${origin}${path}`;
  if (typeof window !== 'undefined') return `${window.location.origin}${path}`;
  return path;
}
