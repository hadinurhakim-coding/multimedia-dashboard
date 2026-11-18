export const DEFAULT_PAGE_SIZE = 20;
export const PAGE_SIZE_OPTIONS = [5, 10, 20, 50, 100] as const;

export type PageToken = number | "ellipsis-left" | "ellipsis-right";

export type PaginatedResult<T> = {
  items: T[];
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
  startIndex: number;
  endIndex: number;
};

/**
 * Slices a row collection for the requested 1-based page and size, clamping
 * out-of-range page numbers safely without requiring client-side effects.
 */
export function paginateRows<T>(
  rows: readonly T[],
  requestedPage: number,
  pageSize = DEFAULT_PAGE_SIZE
): PaginatedResult<T> {
  const safeSize = Number.isFinite(pageSize) && pageSize >= 1 ? Math.floor(pageSize) : DEFAULT_PAGE_SIZE;
  const totalItems = rows.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / safeSize));
  const parsedPage = Number.isFinite(requestedPage) ? Math.floor(requestedPage) : 1;
  const page = Math.min(Math.max(1, parsedPage), totalPages);
  const startIndex = (page - 1) * safeSize;
  const endIndex = Math.min(totalItems, startIndex + safeSize);
  return {
    items: rows.slice(startIndex, endIndex),
    page,
    pageSize: safeSize,
    totalItems,
    totalPages,
    startIndex,
    endIndex,
  };
}

/** Builds Radix/shadcn-style page number buttons with compact ellipsis tokens. */
export function visiblePageTokens(page: number, totalPages: number): PageToken[] {
  const safeTotal = Math.max(1, Math.floor(totalPages));
  const safePage = Math.min(Math.max(1, Math.floor(page)), safeTotal);
  if (safeTotal <= 7) {
    return Array.from({ length: safeTotal }, (_, index) => index + 1);
  }
  if (safePage <= 4) {
    return [1, 2, 3, 4, 5, "ellipsis-right", safeTotal];
  }
  if (safePage >= safeTotal - 3) {
    return [
      1,
      "ellipsis-left",
      safeTotal - 4,
      safeTotal - 3,
      safeTotal - 2,
      safeTotal - 1,
      safeTotal,
    ];
  }
  return [1, "ellipsis-left", safePage - 1, safePage, safePage + 1, "ellipsis-right", safeTotal];
}
