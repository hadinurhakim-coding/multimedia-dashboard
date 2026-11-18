import type { LppWorkbook } from "@/types/lpp";
import type { LppForm, LppFormField } from "./form";

export type AnchoredDocumentationLayout = {
  reportRows: number;
  documentationRows: number;
  signDate: string;
  anchors: readonly (readonly string[])[];
  requireLocation?: boolean;
};

// Coordinates only. Project, material, location and signatory values remain private.
export function buildAnchoredDocumentationForm(
  workbook: LppWorkbook,
  layout: AnchoredDocumentationLayout
): LppForm | null {
  const [main, documentation] = workbook.sheets;
  const itemCount = layout.anchors.length;
  if (!main || !documentation || main.rows !== layout.reportRows || documentation.rows !== layout.documentationRows) {
    return null;
  }
  const value = (sheet: typeof main, address: string) =>
    String(sheet.cells.find((cell) => cell.address === address)?.value ?? "").trim();
  if (
    value(main, "B13") !== "ITEM DESCRIPTION" ||
    value(documentation, "B13") !== "MATERIAL" ||
    value(documentation, "C13") !== "LOKASI PEMASANGAN"
  ) {
    return null;
  }
  if (
    [main, documentation].some((sheet) =>
      Array.from({ length: itemCount }, (_, index) => index + 1).some(
        (number) => value(sheet, `A${number + 13}`) !== String(number)
      )
    )
  ) {
    return null;
  }
  const target = (sheet: string, address: string, prefix = "") => ({ sheet, address, prefix });
  const prefix = (sheet: typeof main, address: string) => {
    const raw = String(sheet.cells.find((cell) => cell.address === address)?.value ?? "");
    const colon = raw.indexOf(":");
    return colon < 0 ? "" : raw.slice(0, colon + 1) + (raw[colon + 1] === " " ? " " : "");
  };
  const items = Array.from({ length: itemCount }, (_, index) => {
    const row = index + 14;
    const id = `doc-${index + 1}`;
    const fields: LppFormField[] = [
      {
        id: `${id}-material`,
        label: "Nama material",
        kind: "text",
        required: true,
        targets: [target(documentation.name, `B${row}`), target(main.name, `B${row}`)],
      },
      {
        id: `${id}-location`,
        label: "Lokasi pemasangan",
        kind: "text",
        required: layout.requireLocation ?? true,
        targets: [target(documentation.name, `C${row}`)],
      },
    ];
    return { id, number: index + 1, fields };
  });
  const signPrefix =
    value(main, layout.signDate).match(/^(.*?)(?:\d{1,2}\s+\p{L}+\s+\d{4})\s*$/u)?.[1] ?? "";
  return {
    kind: "documentation-table-v1",
    information: [],
    signatures: [],
    items,
    photoFormat: "jpeg",
    reportHeader: {
      title: target(main.name, "B1"),
      projectId: target(main.name, "A4"),
      fields: [
        [6, "Project"],
        [7, "Address"],
        [8, "Contact Person"],
        [9, "Job Description"],
      ].map(([row, label]) => ({
        id: `report-${row}`,
        label: String(label),
        kind: "text",
        targets: [target(main.name, `A${row}`, prefix(main, `A${row}`))],
      })),
      dateTargets: [
        target(main.name, "A10", prefix(main, "A10")),
        target(documentation.name, "A10", prefix(documentation, "A10")),
        target(main.name, layout.signDate, signPrefix),
      ],
    },
    photoSlots: items.flatMap((item, index) =>
      layout.anchors[index].map((anchorId, photoIndex) => ({
        id: `${item.id}-photo-${photoIndex + 1}`,
        itemId: item.id,
        sheet: documentation.name,
        row: index + 13,
        column: 3,
        anchorId,
      }))
    ),
  };
}
