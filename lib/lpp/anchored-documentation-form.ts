import type { LppWorkbook } from "@/types/lpp";
import { buildDocumentationReportHeader, readTrimmedCell } from "./documentation-header";
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
  if (
    readTrimmedCell(main, "B13") !== "ITEM DESCRIPTION" ||
    readTrimmedCell(documentation, "B13") !== "MATERIAL" ||
    readTrimmedCell(documentation, "C13") !== "LOKASI PEMASANGAN"
  ) {
    return null;
  }
  if (
    [main, documentation].some((sheet) =>
      Array.from({ length: itemCount }, (_, index) => index + 1).some(
        (number) => readTrimmedCell(sheet, `A${number + 13}`) !== String(number)
      )
    )
  ) {
    return null;
  }
  const target = (sheet: string, address: string, prefix = "") => ({ sheet, address, prefix });
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
  return {
    kind: "documentation-table-v1",
    information: [],
    signatures: [],
    items,
    photoFormat: "jpeg",
    reportHeader: buildDocumentationReportHeader(main, documentation, layout.signDate),
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
