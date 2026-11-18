import type { LppWorkbook } from "@/types/lpp";
import type { LppForm, LppFormField } from "./form";

// Layout only: names, locations and photos are read from the private workbook.
// Documentation groups are distinct from the 131 serial-numbered report entries.
export function buildDocumentationForm(workbook: LppWorkbook): LppForm | null {
  const [main, documentation] = workbook.sheets;
  if (!main || !documentation || main.rows !== 155 || documentation.rows !== 56) return null;
  const value = (sheet: typeof main, address: string) => String(sheet.cells.find((cell) => cell.address === address)?.value ?? "").trim();
  if (value(main, "B12") !== "Item Description" || value(documentation, "B12") !== "Material" || value(documentation, "C12") !== "Lokasi Pemasangan") return null;
  const counts = [1, 1, 1, 2, 2, 1, 2];
  if (counts.some((_, index) => value(documentation, `A${index + 13}`) !== String(index + 1))) return null;
  const items = counts.map((_, index) => {
    const row = index + 13, id = `doc-${index + 1}`;
    const field = (suffix: string, label: string, column: string): LppFormField => ({ id: `${id}-${suffix}`, label, kind: "text", required: true, targets: [{ sheet: documentation.name, address: `${column}${row}`, prefix: "" }] });
    return { id, number: index + 1, fields: [field("material", "Nama material", "B"), field("location", "Lokasi pemasangan", "C")] };
  });
  const target = (sheet: string, address: string, prefix = "") => ({ sheet, address, prefix });
  const prefix = (sheet: typeof main, address: string) => {
    const raw = String(sheet.cells.find((cell) => cell.address === address)?.value ?? "");
    const colon = raw.indexOf(":");
    return colon < 0 ? "" : raw.slice(0, colon + 1) + (raw[colon + 1] === " " ? " " : "");
  };
  const signDate = String(main.cells.find((cell) => cell.address === "C145")?.value ?? "");
  const signPrefix = signDate.match(/^(.*?)(?:\d{1,2}\s+\p{L}+\s+\d{4})\s*$/u)?.[1] ?? "";
  return {
    kind: "documentation-table-v1", information: [], signatures: [], items,
    reportHeader: {
      title: target(main.name, "B1"), projectId: target(main.name, "A4"),
      fields: [[6, "Project"], [7, "Address"], [8, "Contact Person"], [9, "Job Description"]].map(([row, label]) => ({
        id: `report-${row}`, label: String(label), kind: "text", targets: [target(main.name, `A${row}`, prefix(main, `A${row}`))],
      })),
      dateTargets: [target(main.name, "A10", prefix(main, "A10")), target(documentation.name, "A10", prefix(documentation, "A10")), target(main.name, "C145", signPrefix)],
    },
    photoSlots: items.flatMap((item, index) => Array.from({ length: counts[index] }, (_, photoIndex) => ({ id: `${item.id}-photo-${photoIndex + 1}`, itemId: item.id, sheet: documentation.name, row: index + 12, column: photoIndex + 4 }))),
  };
}
