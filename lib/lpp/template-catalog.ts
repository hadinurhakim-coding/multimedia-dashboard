import type { DraftSummary } from "@/lib/lpp/draft-folders";
import type { LppTemplate } from "@/types/lpp";

export type TemplateFormatKind = "documentation-table" | "installation-form" | "spreadsheet";
export type TemplateSortOrder = "default" | "asc" | "desc";

export type TemplateCatalogRow = LppTemplate & {
  index: number;
  formatKind: TemplateFormatKind;
  formatLabel: string;
  draftCount: number;
};

/** Returns a human-readable Indonesian format label and category for an LPP template. */
export function describeTemplateFormat(template: Pick<LppTemplate, "documentationTableAvailable" | "formAvailable">): {
  kind: TemplateFormatKind;
  label: string;
} {
  if (template.documentationTableAvailable) {
    return { kind: "documentation-table", label: "Tabel dokumentasi" };
  }
  if (template.formAvailable) {
    return { kind: "installation-form", label: "Form input" };
  }
  return { kind: "spreadsheet", label: "Spreadsheet" };
}

/** Enriches the catalog template list with stable row index, format badge info, and saved draft count. */
export function buildTemplateCatalogRows(
  templates: LppTemplate[],
  drafts: Pick<DraftSummary, "templateId">[]
): TemplateCatalogRow[] {
  const draftCounts = new Map<string, number>();
  for (const draft of drafts) {
    draftCounts.set(draft.templateId, (draftCounts.get(draft.templateId) ?? 0) + 1);
  }
  return templates.map((template, idx) => {
    const format = describeTemplateFormat(template);
    return {
      ...template,
      index: idx + 1,
      formatKind: format.kind,
      formatLabel: format.label,
      draftCount: draftCounts.get(template.id) ?? 0,
    };
  });
}

/** Filters catalog rows by search query and format kind, then applies optional name sorting. */
export function filterTemplateCatalogRows(
  rows: TemplateCatalogRow[],
  options: {
    query?: string;
    format?: "all" | TemplateFormatKind;
    sort?: TemplateSortOrder;
  } = {}
): TemplateCatalogRow[] {
  const query = (options.query ?? "").trim().toLowerCase();
  const format = options.format ?? "all";
  const sort = options.sort ?? "default";

  const filtered = rows.filter((row) => {
    if (format !== "all" && row.formatKind !== format) return false;
    if (!query) return true;
    const haystack = `${row.index} ${row.name} ${row.formatLabel}`.toLowerCase();
    return haystack.includes(query);
  });

  if (sort === "asc") {
    return [...filtered].sort((a, b) => a.name.localeCompare(b.name, "id"));
  }
  if (sort === "desc") {
    return [...filtered].sort((a, b) => b.name.localeCompare(a.name, "id"));
  }
  return filtered;
}
