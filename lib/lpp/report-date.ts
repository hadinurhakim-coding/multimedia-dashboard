import type { CellEdit, LppDraft } from "@/types/lpp";
import { editKey, type LppForm } from "./form";

export function jakartaDate(instant = new Date()): string {
  if (Number.isNaN(instant.valueOf())) throw new Error("Tanggal pembuatan draf tidak valid.");
  const parts = new Intl.DateTimeFormat("en-US", { timeZone: "Asia/Jakarta", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(instant);
  const part = (type: string) => parts.find((value) => value.type === type)!.value;
  return `${part("year")}-${part("month")}-${part("day")}`;
}
export function validateReportDate(value: unknown): string {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new Error("Tanggal laporan wajib diisi dengan tanggal yang valid.");
  const parsed = new Date(`${value}T00:00:00Z`);
  if (Number.isNaN(parsed.valueOf()) || parsed.toISOString().slice(0, 10) !== value) throw new Error("Tanggal laporan tidak valid.");
  return value;
}
export function formatReportDate(value: string): string {
  const date = new Date(`${validateReportDate(value)}T00:00:00Z`);
  return new Intl.DateTimeFormat("id-ID", { timeZone: "UTC", day: "numeric", month: "long", year: "numeric" }).format(date);
}
export function resolveReportDate(draft?: Pick<LppDraft, "reportDate" | "createdAt" | "updatedAt">, fallback = jakartaDate()): string {
  if (draft?.reportDate !== undefined) return validateReportDate(draft.reportDate);
  // Legacy drafts did not record creation time; use the last recorded save once.
  const timestamp = draft?.createdAt ?? draft?.updatedAt;
  return timestamp ? jakartaDate(new Date(timestamp)) : validateReportDate(fallback);
}
export function applyReportDate(form: LppForm | null, edits: CellEdit[], reportDate: string): CellEdit[] {
  if (!form?.reportHeader) return edits;
  const formatted = formatReportDate(reportDate);
  const replacements = form.reportHeader.dateTargets.map((target) => ({ sheet: target.sheet, address: target.address, value: target.prefix + formatted }));
  const managed = new Set(replacements.map((edit) => editKey(edit.sheet, edit.address)));
  return [...edits.filter((edit) => !managed.has(editKey(edit.sheet, edit.address))), ...replacements];
}
