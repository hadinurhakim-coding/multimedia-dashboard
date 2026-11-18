import type { CellEdit, CellValue, LppWorkbook } from "@/types/lpp";

export type FormTarget = { sheet: string; address: string; prefix: string };
export type LppFormField = {
  id: string; label: string; kind: "text" | "textarea" | "date";
  required?: boolean; targets: FormTarget[];
};
export type LppForm = {
  kind: "installation-v1" | "documentation-table-v1"; information: LppFormField[]; signatures: LppFormField[];
  items: { id: string; number: number; fields: LppFormField[] }[];
  photoSlots?: LppPhotoSlot[];
  photoFormat?: "jpeg";
  reportHeader?: {
    title: FormTarget; projectId: FormTarget; fields: LppFormField[];
    dateTargets: FormTarget[];
  };
};
export type LppPhotoSlot = { id: string; itemId: string; sheet: string; row: number; column: number; anchorId?: string };
export function formPhotoSlots(form: LppForm): LppPhotoSlot[] {
  return form.photoSlots ?? form.items.map((item) => {
    const target = item.fields[3].targets[0];
    return { id: item.id, itemId: item.id, sheet: target.sheet, row: Number(target.address.match(/\d+$/)?.[0]) - 1, column: 3 };
  });
}
export const editKey = (sheet: string, address: string) => JSON.stringify([sheet, address]);
const months = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
export function readCell(workbook: LppWorkbook, edits: Record<string, CellEdit>, target: FormTarget): CellValue {
  const edit = edits[editKey(target.sheet, target.address)];
  return edit ? edit.value : workbook.sheets.find((s) => s.name === target.sheet)?.cells.find((c) => c.address === target.address)?.value ?? null;
}
export function readFormField(field: LppFormField, workbook: LppWorkbook, edits: Record<string, CellEdit>): string {
  const target = field.targets[0], raw = String(readCell(workbook, edits, target) ?? "");
  let value = target.prefix && raw.startsWith(target.prefix) ? raw.slice(target.prefix.length) : raw;
  if (!edits[editKey(target.sheet, target.address)] || field.kind === "date") value = value.trim();
  if (field.id === "projectId") value = value.replace(/^\s*:\s?/, "");
  if (field.kind !== "date" || !value) return value;
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  const match = /^(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})$/.exec(value);
  if (!match) return "";
  const month = months.findIndex((m) => m.toLowerCase() === match[2].toLowerCase());
  return month < 0 ? "" : `${match[3]}-${String(month + 1).padStart(2, "0")}-${match[1].padStart(2, "0")}`;
}
export function fieldEdits(field: LppFormField, value: string): CellEdit[] {
  let formatted = field.id === "projectId" && value ? ` : ${value}` : value;
  if (field.kind === "date" && value) {
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
    if (!match) throw new Error("Tanggal tidak valid.");
    const date = new Date(`${value}T00:00:00Z`);
    if (Number.isNaN(date.valueOf()) || date.toISOString().slice(0, 10) !== value) throw new Error("Tanggal tidak valid.");
    formatted = `${Number(match[3])} ${months[Number(match[2]) - 1]} ${match[1]}`;
  }
  return field.targets.map((target) => ({ sheet: target.sheet, address: target.address, value: target.prefix + formatted }));
}
export function formErrors(form: LppForm, workbook: LppWorkbook, edits: Record<string, CellEdit>) {
  const errors: Record<string, string> = {};
  for (const field of [...form.information, ...form.signatures, ...form.items.flatMap((item) => item.fields)]) {
    const value = readFormField(field, workbook, edits);
    if (field.required && !value.trim()) errors[field.id] = `${field.label} wajib diisi.`;
    else if (value.length > 4000) errors[field.id] = `${field.label} maksimal 4.000 karakter.`;
    else if (field.kind === "date" && value) {
      try { fieldEdits(field, value); } catch { errors[field.id] = "Tanggal tidak valid."; }
    }
  }
  return errors;
}

// Only layout coordinates and generic labels are code. All actual values, prefixes,
// sheet names and template selection are read from private server-side sources.
export function buildInstallationForm(workbook: LppWorkbook): LppForm | null {
  const [main, documentation] = workbook.sheets;
  if (!main || !documentation || main.rows !== 40 || documentation.rows !== 27) return null;
  const value = (sheet: string, address: string) => String(workbook.sheets.find((s) => s.name === sheet)?.cells.find((c) => c.address === address)?.value ?? "");
  if (value(main.name, "B13").trim() !== "ITEM DESCRIPTION" || value(documentation.name, "C13").trim() !== "LOKASI PEMASANGAN") return null;
  const target = (sheet: string, address: string, prefix = "") => ({ sheet, address, prefix });
  const shared = (id: string, label: string, row: number, kind: LppFormField["kind"] = "text", required = true): LppFormField => ({
    id, label, kind, required,
    targets: [main, documentation].map((s) => {
      const raw = value(s.name, `A${row}`), colon = raw.indexOf(":");
      return target(s.name, `A${row}`, colon < 0 ? raw : raw.slice(0, colon + 1) + (raw[colon + 1] === " " ? " " : ""));
    }),
  });
  const field = (id: string, label: string, targets: FormTarget[], required = false, kind: LppFormField["kind"] = "text"): LppFormField => ({ id, label, targets, required, kind });
  return {
    kind: "installation-v1",
    information: [
      // The ID label has no separator/value in the original; add a separator only on edit.
      { ...shared("projectId", "ID proyek", 4, "text", false), targets: [main, documentation].map((s) => target(s.name, "A4", value(s.name, "A4"))) },
      shared("project", "Nama pekerjaan", 6),
      field("phase", "Tahap pekerjaan", [target(main.name, "C6"), target(documentation.name, "D5")], true),
      shared("address", "Lokasi pekerjaan", 7), shared("contact", "Kontak / penanggung jawab", 8),
      shared("description", "Uraian pekerjaan", 9, "textarea"), shared("date", "Tanggal pekerjaan", 10, "date"),
    ],
    signatures: [
      field("signPlaceDate", "Tempat dan tanggal pengesahan", [target(main.name, "C30")], true),
      field("providerCompany", "Perusahaan pelaksana", [target(main.name, "A32")], true),
      field("providerName", "Nama penanggung jawab pelaksana", [target(main.name, "A39")], true),
      field("providerRole", "Jabatan pelaksana", [target(main.name, "A40")], true),
      field("customerCompany", "Perusahaan penerima", [target(main.name, "C32")], true),
      field("customerName", "Nama penanggung jawab penerima", [target(main.name, "C39")], true),
      field("customerRole", "Jabatan penerima", [target(main.name, "C40")], true),
    ],
    items: Array.from({ length: 14 }, (_, i) => {
      const row = 14 + i, id = `item-${i + 1}`;
      return { id, number: i + 1, fields: [
        field(`${id}-name`, "Nama / deskripsi perangkat", [target(main.name, `B${row}`), target(documentation.name, `B${row}`)], true, "textarea"),
        field(`${id}-serial`, "Nomor seri", [target(main.name, `C${row}`)]),
        field(`${id}-status`, "Status perangkat", [target(main.name, `D${row}`)], true),
        field(`${id}-location`, "Lokasi pemasangan", [target(documentation.name, `C${row}`)], true),
      ] };
    }),
  };
}
