import type { LppWorkbook } from "@/types/lpp";
import type { LppForm, LppFormField } from "./form";

// Layout coordinates only. All project, equipment and signatory values stay private.
export function buildAuditoriumDocumentationForm(workbook: LppWorkbook, phase: 1 | 2 = 2): LppForm | null {
  const layout = phase === 1
    ? { reportRows: 40, documentationRows: 27, reportEntries: 14, photos: 14, signDate: "C30" }
    : { reportRows: 80, documentationRows: 62, reportEntries: 51, photos: 49, signDate: "C68" };
  const [main, documentation] = workbook.sheets;
  if (!main || !documentation || main.rows !== layout.reportRows || documentation.rows !== layout.documentationRows) return null;
  const value = (sheet: typeof main, address: string) => String(sheet.cells.find((cell) => cell.address === address)?.value ?? "").trim();
  if (value(main, "B13") !== "ITEM DESCRIPTION" || value(documentation, "B13") !== "NAME" || value(documentation, "C13") !== "LOKASI PEMASANGAN") return null;
  if (Array.from({ length: layout.reportEntries }, (_, i) => i + 1).some((number) => value(main, `A${number + 13}`) !== String(number))) return null;
  if (Array.from({ length: layout.photos }, (_, i) => i + 1).some((number) => value(documentation, `A${number + 13}`) !== String(number))) return null;
  const target = (sheet: string, address: string, prefix = "") => ({ sheet, address, prefix });
  const prefix = (sheet: typeof main, address: string) => {
    const raw = String(sheet.cells.find((cell) => cell.address === address)?.value ?? "");
    const colon = raw.indexOf(":");
    return colon < 0 ? "" : raw.slice(0, colon + 1) + (raw[colon + 1] === " " ? " " : "");
  };
  const items = Array.from({ length: layout.photos }, (_, index) => {
    const row = index + 14, id = `doc-${index + 1}`;
    const fields: LppFormField[] = [
      { id: `${id}-material`, label: "Nama material", kind: "text", required: true, targets: [target(documentation.name, `B${row}`), target(main.name, `B${row}`)] },
      { id: `${id}-location`, label: "Lokasi pemasangan", kind: "text", required: true, targets: [target(documentation.name, `C${row}`)] },
    ];
    return { id, number: index + 1, fields };
  });
  const signPrefix = value(main, layout.signDate).match(/^(.*?)(?:\d{1,2}\s+\p{L}+\s+\d{4})\s*$/u)?.[1] ?? "";
  return {
    kind: "documentation-table-v1", information: [], signatures: [], items, photoFormat: "jpeg",
    reportHeader: {
      title: target(main.name, "B1"), projectId: target(main.name, "A4"),
      fields: [
        ...[[6, "Project"], [7, "Address"], [8, "Contact Person"], [9, "Job Description"]].map(([row, label]): LppFormField => ({
          id: `report-${row}`, label: String(label), kind: "text", targets: [target(main.name, `A${row}`, prefix(main, `A${row}`))],
        })),
        { id: "report-phase", label: "Tahap pekerjaan", kind: "text", targets: [target(main.name, "C6"), target(documentation.name, "D5")] },
      ],
      dateTargets: [target(main.name, "A10", prefix(main, "A10")), target(documentation.name, "A10", prefix(documentation, "A10")), target(main.name, layout.signDate, signPrefix)],
    },
    photoSlots: items.map((item, index) => ({
      id: `${item.id}-photo-1`, itemId: item.id, sheet: documentation.name, column: 3,
      // Phase 2 pictures 36/37 share a starting cell; 37 spans the next row.
      row: phase === 2 && index === 36 ? 48 : index + 13,
      ...(phase === 2 && index === 35 ? { anchorId: "79" } : phase === 2 && index === 36 ? { anchorId: "80" } : {}),
    })),
  };
}
