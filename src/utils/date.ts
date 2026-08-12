/**
 * Safely format date strings (e.g., '2026-08-12T00:00:00.000Z' -> '2026-08-12')
 */
export function formatDateStr(dateVal?: string | Date | null): string {
  if (!dateVal) return '';
  const str = String(dateVal);
  if (str.includes('T')) {
    return str.split('T')[0];
  }
  return str;
}

/**
 * Format match time cleanly (e.g. '08:45:00' or '08:45')
 */
export function formatTimeStr(timeVal?: string | null): string {
  if (!timeVal) return '';
  const str = String(timeVal);
  // If HH:MM:SS, we can keep HH:MM or keep full string if already clean
  return str;
}
