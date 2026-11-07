// Same rules as normalizeJoinCode in lib/store-join.ts (that file is server-only, so client code uses this copy).
export function normalizeJoinCodeClient(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  const code = raw.toUpperCase().replace(/[^A-Z0-9]/g, '');
  return /^[A-Z0-9]{6,12}$/.test(code) ? code : null;
}
