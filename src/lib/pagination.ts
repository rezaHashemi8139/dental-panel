/** Rows per page of the panel's lists (the server allows up to 100). */
export const PAGE_SIZE = 20;

/** Same limit as the server's list queries (admin.proto). */
const QUERY_MAX_LENGTH = 100;

/** A page number from the address bar (?page=2); page 1 is left out, so anything else reads as none. */
export function parsePage(value: unknown): number | undefined {
  const page = typeof value === "number" ? value : typeof value === "string" ? Number(value) : NaN;
  return Number.isInteger(page) && page > 1 && page <= 100_000 ? page : undefined;
}

/** A search text from the address bar (?q=…), trimmed; empty reads as none. */
export function parseQuery(value: unknown): string | undefined {
  const text = typeof value === "number" ? String(value) : typeof value === "string" ? value.trim() : "";
  return text ? [...text].slice(0, QUERY_MAX_LENGTH).join("") : undefined;
}

/** How many pages `total` rows fill; at least 1. */
export function pageCount(total: number, pageSize = PAGE_SIZE): number {
  return Math.max(1, Math.ceil(total / pageSize));
}
