import type { LppDraft } from "@/types/lpp";
import { formatReportDate, resolveReportDate } from "./report-date";

// Display names are separate from private filenames and their stable template IDs.
export function templateDisplayName(name: string): string {
  return name.replace(/\s*\(new\)\s*$/i, "").trim();
}

export function lppPhotoWatermark(templateName: string, reportDate: string): string {
  return `${templateDisplayName(templateName)} · ${formatReportDate(reportDate)}`;
}

export function lppExportFilename(templateName: string, draft: Pick<LppDraft, "reportDate" | "createdAt" | "updatedAt">): string {
  const name = templateDisplayName(templateName).replace(/^LPP(?:\s+|$)/i, "").replace(/[\x00-\x1f\x7f<>:"/\\|?*]/g, "_").trim();
  return `${resolveReportDate(draft)} LPP${name ? ` ${name}` : ""}.xlsx`;
}
