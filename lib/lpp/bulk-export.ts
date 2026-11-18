import { jakartaDate } from "./report-date";

const ILLEGAL_FILENAME_CHARS = /[\x00-\x1f\x7f<>:"/\\|?*]/g;

/** Extracts the attachment filename from a Content-Disposition header. */
export function parseExportFilename(
  contentDisposition: string | null,
  fallback = "LPP.xlsx"
): string {
  if (!contentDisposition) return fallback;
  const utf8Match = contentDisposition.match(/filename\*=UTF-8''([^;]+)/i);
  if (utf8Match?.[1]) {
    try {
      const decoded = decodeURIComponent(utf8Match[1]).replace(ILLEGAL_FILENAME_CHARS, "_").trim();
      if (decoded) return decoded;
    } catch {
      // Fall through to quoted filename or fallback.
    }
  }
  const quotedMatch = contentDisposition.match(/filename="([^"]+)"/i);
  if (quotedMatch?.[1]) {
    const cleaned = quotedMatch[1].replace(ILLEGAL_FILENAME_CHARS, "_").trim();
    if (cleaned) return cleaned;
  }
  return fallback;
}

/** Deduplicates ZIP archive entry filenames while preserving the extension. */
export function uniqueZipEntryName(desiredName: string, usedLowercase: Set<string>): string {
  const sanitized = desiredName.replace(ILLEGAL_FILENAME_CHARS, "_").trim() || "LPP.xlsx";
  const dotIndex = sanitized.lastIndexOf(".");
  const base = dotIndex > 0 ? sanitized.slice(0, dotIndex) : sanitized;
  const ext = dotIndex > 0 ? sanitized.slice(dotIndex) : "";

  let candidate = sanitized;
  let suffix = 2;
  while (usedLowercase.has(candidate.toLowerCase())) {
    candidate = `${base} (${suffix})${ext}`;
    suffix++;
  }
  usedLowercase.add(candidate.toLowerCase());
  return candidate;
}

/** Generates a sanitized Jakarta-dated ZIP archive name for bulk LPP exports. */
export function bulkExportArchiveName(
  folderName: string | null | undefined,
  count: number,
  now = new Date()
): string {
  const date = jakartaDate(now);
  const safeCount = Math.max(1, Math.floor(count));
  const cleanFolder = (folderName ?? "").replace(ILLEGAL_FILENAME_CHARS, "_").trim();
  if (cleanFolder) {
    return `${date} ${cleanFolder} (${safeCount} file).zip`;
  }
  return `${date} Ekspor Excel LPP (${safeCount} file).zip`;
}

/** Returns a new selection set with target IDs added or removed. */
export function toggleSelectionSet(
  current: ReadonlySet<string>,
  targetIds: readonly string[],
  checked: boolean
): Set<string> {
  const next = new Set(current);
  for (const id of targetIds) {
    if (checked) next.add(id);
    else next.delete(id);
  }
  return next;
}

/** Computes checked/indeterminate counts for a visible list of IDs. */
export function summarizeSelection(
  selectedIds: ReadonlySet<string>,
  visibleIds: readonly string[]
): {
  visibleSelectedCount: number;
  allVisibleSelected: boolean;
  someVisibleSelected: boolean;
} {
  let visibleSelectedCount = 0;
  for (const id of visibleIds) {
    if (selectedIds.has(id)) visibleSelectedCount++;
  }
  return {
    visibleSelectedCount,
    allVisibleSelected: visibleIds.length > 0 && visibleSelectedCount === visibleIds.length,
    someVisibleSelected: visibleSelectedCount > 0 && visibleSelectedCount < visibleIds.length,
  };
}
