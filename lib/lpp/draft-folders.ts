import { templateDisplayName, lppExportFilename } from "./naming";
import { resolveReportDate } from "./report-date";
import type { LppDraft, LppTemplate } from "@/types/lpp";

export type DraftSummary = Omit<LppDraft, "edits"> & {
  changes?: number;
  photoCount?: number;
};

export type DraftMonthOption = {
  key: string;
  label: string;
};

export type DraftFolder = {
  id: string;
  name: string;
  available: boolean;
  drafts: DraftSummary[];
  months: DraftMonthOption[];
  latestReportDate: string;
  latestUpdatedAt: string;
  totalChanges: number;
  totalPhotos: number;
};

export type DraftViewMode =
  | "extra-large"
  | "large"
  | "medium"
  | "small"
  | "list"
  | "details"
  | "tiles"
  | "content";

export type DraftViewOption = {
  id: DraftViewMode;
  label: string;
  description: string;
};

export const DEFAULT_FOLDER_VIEW_MODE: DraftViewMode = "tiles";
export const DEFAULT_FILE_VIEW_MODE: DraftViewMode = "details";

export const DRAFT_VIEW_OPTIONS: readonly DraftViewOption[] = [
  { id: "extra-large", label: "Ikon ekstra besar", description: "Kartu besar dengan rincian lengkap" },
  { id: "large", label: "Ikon besar", description: "Ikon menonjol dan nama lengkap" },
  { id: "medium", label: "Ikon sedang", description: "Grid seimbang 4–5 kolom" },
  { id: "small", label: "Ikon kecil", description: "Tampilan ringkas banyak item" },
  { id: "list", label: "Daftar", description: "Baris tipis satu baris per item" },
  { id: "details", label: "Detail", description: "Tabel kolom lengkap & waktu simpan" },
  { id: "tiles", label: "Ubin", description: "Kartu informatif dengan badge bulan" },
  { id: "content", label: "Konten", description: "Baris detail dengan ringkasan penuh" },
];

const VIEW_MODE_SET = new Set<string>(DRAFT_VIEW_OPTIONS.map((option) => option.id));

/** Type guard validating persisted or selected draft view modes. */
export function isDraftViewMode(value: unknown): value is DraftViewMode {
  return typeof value === "string" && VIEW_MODE_SET.has(value);
}

const UPDATED_AT_FORMATTER = new Intl.DateTimeFormat("id-ID", {
  timeZone: "Asia/Jakarta",
  day: "numeric",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

/** Formats a draft's ISO updatedAt timestamp in Asia/Jakarta (WIB). */
export function formatDraftUpdatedAt(isoTimestamp: string): string {
  const date = new Date(isoTimestamp);
  if (Number.isNaN(date.valueOf())) return "—";
  return `${UPDATED_AT_FORMATTER.format(date)} WIB`;
}

const MONTH_FORMATTER = new Intl.DateTimeFormat("id-ID", {
  timeZone: "UTC",
  month: "long",
  year: "numeric",
});

/** Extracts a YYYY-MM key and Indonesian month-year label from an ISO report date. */
export function reportMonthOf(dateIso: string): DraftMonthOption {
  const key = dateIso.slice(0, 7);
  const label = MONTH_FORMATTER.format(new Date(`${dateIso}T00:00:00Z`));
  return { key, label };
}

/** Resolves the display title shown for a saved draft inside its folder. */
export function draftDisplayTitle(
  draft: Pick<DraftSummary, "title">,
  templateName?: string
): string {
  if (!templateName) return draft.title;
  const cleanTemplate = templateDisplayName(templateName);
  return templateDisplayName(draft.title) === cleanTemplate ? cleanTemplate : draft.title;
}

/** Resolves the Excel export filename label for a saved draft. */
export function draftExportLabel(
  draft: Pick<DraftSummary, "reportDate" | "createdAt" | "updatedAt">,
  templateName?: string
): string {
  return lppExportFilename(templateName ?? "LPP", draft);
}

/** Groups saved drafts into Google Drive-style folders by template, keeping newest drafts first. */
export function buildDraftFolders(
  drafts: DraftSummary[],
  templates: LppTemplate[]
): DraftFolder[] {
  const templateById = new Map(templates.map((template) => [template.id, template]));
  const grouped = new Map<string, DraftSummary[]>();

  for (const draft of drafts) {
    const existing = grouped.get(draft.templateId);
    if (existing) existing.push(draft);
    else grouped.set(draft.templateId, [draft]);
  }

  const folders: DraftFolder[] = [];
  for (const [templateId, items] of grouped) {
    const template = templateById.get(templateId);
    const sorted = [...items].sort((a, b) => {
      const byDate = resolveReportDate(b).localeCompare(resolveReportDate(a));
      return byDate !== 0 ? byDate : b.updatedAt.localeCompare(a.updatedAt);
    });

    const monthMap = new Map<string, string>();
    let latestReportDate = "";
    let latestUpdatedAt = "";
    let totalChanges = 0;
    let totalPhotos = 0;
    for (const item of sorted) {
      const date = resolveReportDate(item);
      const month = reportMonthOf(date);
      if (!monthMap.has(month.key)) monthMap.set(month.key, month.label);
      if (!latestReportDate || date > latestReportDate) latestReportDate = date;
      if (!latestUpdatedAt || item.updatedAt > latestUpdatedAt) latestUpdatedAt = item.updatedAt;
      totalChanges += item.changes ?? 0;
      totalPhotos += item.photoCount ?? Object.keys(item.photos ?? {}).length;
    }

    const months = [...monthMap.entries()]
      .sort(([a], [b]) => b.localeCompare(a))
      .map(([key, label]) => ({ key, label }));

    folders.push({
      id: templateId,
      name: template ? templateDisplayName(template.name) : "Template tidak tersedia",
      available: Boolean(template),
      drafts: sorted,
      months,
      latestReportDate,
      latestUpdatedAt,
      totalChanges,
      totalPhotos,
    });
  }

  return folders.sort((a, b) => {
    const byUpdated = b.latestUpdatedAt.localeCompare(a.latestUpdatedAt);
    return byUpdated !== 0 ? byUpdated : a.name.localeCompare(b.name, "id");
  });
}

/** Filters drafts within a folder by month key ("all" or YYYY-MM) and optional search query. */
export function filterFolderDrafts(
  drafts: DraftSummary[],
  templateName: string | undefined,
  options: { monthKey?: string; query?: string } = {}
): DraftSummary[] {
  const monthKey = options.monthKey && options.monthKey !== "all" ? options.monthKey : null;
  const query = (options.query ?? "").trim().toLowerCase();

  return drafts.filter((draft) => {
    const date = resolveReportDate(draft);
    const month = reportMonthOf(date);
    if (monthKey && month.key !== monthKey) return false;
    if (!query) return true;

    const haystack = [
      draftDisplayTitle(draft, templateName),
      draftExportLabel(draft, templateName),
      date,
      month.label,
    ]
      .join(" ")
      .toLowerCase();
    return haystack.includes(query);
  });
}
