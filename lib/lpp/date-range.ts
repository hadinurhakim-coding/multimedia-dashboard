import { formatReportDate, validateReportDate } from "./report-date";

export type DraftDateFilter =
  | { kind: "month"; monthKey: string }
  | { kind: "range"; from: string; to: string }
  | null;

const COMPACT_DATE_FORMATTER = new Intl.DateTimeFormat("id-ID", {
  timeZone: "UTC",
  day: "numeric",
  month: "short",
  year: "numeric",
});

const MONTH_LABEL_FORMATTER = new Intl.DateTimeFormat("id-ID", {
  timeZone: "UTC",
  month: "long",
  year: "numeric",
});

/** Formats a local Calendar Date into a timezone-safe YYYY-MM-DD string. */
export function formatCalendarIsoDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/** Parses a validated YYYY-MM-DD string into a local calendar Date at midnight. */
export function parseCalendarIsoDate(iso: string): Date {
  const valid = validateReportDate(iso);
  const [year, month, day] = valid.split("-").map(Number);
  return new Date(year, month - 1, day);
}

/** Parses an encoded filter token ("all", "YYYY-MM", "YYYY-MM-DD", or "YYYY-MM-DD..YYYY-MM-DD"). */
export function parseDraftDateFilter(raw: unknown): DraftDateFilter {
  if (typeof raw !== "string") return null;
  const trimmed = raw.trim();
  if (!trimmed || trimmed === "all") return null;

  if (/^\d{4}-\d{2}$/.test(trimmed)) {
    try {
      validateReportDate(`${trimmed}-01`);
      return { kind: "month", monthKey: trimmed };
    } catch {
      return null;
    }
  }

  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    try {
      const valid = validateReportDate(trimmed);
      return { kind: "range", from: valid, to: valid };
    } catch {
      return null;
    }
  }

  const rangeMatch = trimmed.match(/^(\d{4}-\d{2}-\d{2})\.\.(\d{4}-\d{2}-\d{2})$/);
  if (!rangeMatch) return null;
  try {
    const a = validateReportDate(rangeMatch[1]);
    const b = validateReportDate(rangeMatch[2]);
    return a <= b
      ? { kind: "range", from: a, to: b }
      : { kind: "range", from: b, to: a };
  } catch {
    return null;
  }
}

/** Normalizes any untrusted date filter string to canonical persistence format. */
export function normalizeDraftDateFilterValue(raw: unknown): string {
  const parsed = parseDraftDateFilter(raw);
  if (!parsed) return "all";
  if (parsed.kind === "month") return parsed.monthKey;
  return parsed.from === parsed.to ? parsed.from : `${parsed.from}..${parsed.to}`;
}

/** Serializes a react-day-picker DateRange into the stored string filter token. */
export function serializeDraftDateRange(
  range: { from?: Date; to?: Date } | undefined | null
): string {
  if (!range?.from) return "all";
  const fromIso = formatCalendarIsoDate(range.from);
  if (!range.to) return fromIso;
  const toIso = formatCalendarIsoDate(range.to);
  if (fromIso === toIso) return fromIso;
  return fromIso <= toIso ? `${fromIso}..${toIso}` : `${toIso}..${fromIso}`;
}

/** Converts a parsed DraftDateFilter into react-day-picker selected range dates. */
export function draftDateFilterToRange(
  filter: DraftDateFilter
): { from: Date; to?: Date } | undefined {
  if (!filter) return undefined;
  if (filter.kind === "range") {
    return {
      from: parseCalendarIsoDate(filter.from),
      to: parseCalendarIsoDate(filter.to),
    };
  }
  const [year, month] = filter.monthKey.split("-").map(Number);
  const start = new Date(year, month - 1, 1);
  const end = new Date(year, month, 0);
  return { from: start, to: end };
}

/** Checks whether an ISO report date matches the parsed date filter. */
export function matchesDraftDateFilter(dateIso: string, filter: DraftDateFilter): boolean {
  if (!filter) return true;
  if (filter.kind === "month") return dateIso.slice(0, 7) === filter.monthKey;
  return dateIso >= filter.from && dateIso <= filter.to;
}

/** Formats an active DraftDateFilter for the calendar trigger button and dialog footer. */
export function formatDraftDateFilterLabel(filter: DraftDateFilter): string {
  if (!filter) return "Pilih rentang tanggal";
  if (filter.kind === "month") {
    return MONTH_LABEL_FORMATTER.format(new Date(`${filter.monthKey}-01T00:00:00Z`));
  }
  if (filter.from === filter.to) {
    return formatReportDate(filter.from);
  }
  const fromText = COMPACT_DATE_FORMATTER.format(new Date(`${filter.from}T00:00:00Z`));
  const toText = COMPACT_DATE_FORMATTER.format(new Date(`${filter.to}T00:00:00Z`));
  return `${fromText} – ${toText}`;
}

/** Picks an intuitive initial calendar month showing existing drafts or the selected range. */
export function resolveInitialCalendarMonth(
  draftDates: readonly string[],
  activeRange: { from?: Date } | undefined,
  numberOfMonths = 2,
  now = new Date()
): Date {
  if (activeRange?.from) {
    return new Date(activeRange.from.getFullYear(), activeRange.from.getMonth(), 1);
  }
  const validDates = draftDates.filter((d) => /^\d{4}-\d{2}-\d{2}$/.test(d)).sort();
  if (validDates.length > 0) {
    const latest = parseCalendarIsoDate(validDates[validDates.length - 1]);
    if (numberOfMonths >= 2) {
      return new Date(latest.getFullYear(), latest.getMonth() - 1, 1);
    }
    return new Date(latest.getFullYear(), latest.getMonth(), 1);
  }
  return new Date(now.getFullYear(), now.getMonth(), 1);
}
