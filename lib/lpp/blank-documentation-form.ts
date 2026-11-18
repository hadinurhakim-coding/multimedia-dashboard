import type { LppWorkbook } from "@/types/lpp";
import { buildDocumentationReportHeader, readTrimmedCell } from "./documentation-header";
import type { LppForm, LppFormField } from "./form";

export type BlankDocumentationLayout = {
  reportRows: number;
  documentationRows: number;
  documentationItems: number;
  signDate: string;
};

// Coordinates only. Project, material, location and signatory values remain private.
export const BLANK_DOCUMENTATION_LAYOUTS = {
  commandCenter: { reportRows: 141, documentationRows: 28, documentationItems: 15, signDate: "C126" },
  taskForce: { reportRows: 271, documentationRows: 28, documentationItems: 15, signDate: "C256" },
  hcOperation: { reportRows: 104, documentationRows: 28, documentationItems: 15, signDate: "C89" },
} as const satisfies Record<string, BlankDocumentationLayout>;

/**
 * Builds the documentation-table descriptor for LPP templates whose Sheet 2 contains
 * standalone numbered placeholder rows without pre-embedded item photos.
 */
export function buildBlankDocumentationForm(
  workbook: LppWorkbook,
  layout: BlankDocumentationLayout
): LppForm | null {
  const [main, documentation] = workbook.sheets;
  if (!main || !documentation || main.rows !== layout.reportRows || documentation.rows !== layout.documentationRows) {
    return null;
  }
  if (
    readTrimmedCell(main, "B13") !== "ITEM DESCRIPTION" ||
    readTrimmedCell(main, "A14") !== "1" ||
    readTrimmedCell(documentation, "B13") !== "MATERIAL" ||
    readTrimmedCell(documentation, "C13") !== "LOKASI PEMASANGAN"
  ) {
    return null;
  }
  if (
    Array.from({ length: layout.documentationItems }, (_, index) => index + 1).some(
      (number) => readTrimmedCell(documentation, `A${number + 13}`) !== String(number)
    )
  ) {
    return null;
  }
  const items = Array.from({ length: layout.documentationItems }, (_, index) => {
    const row = index + 14;
    const id = `doc-${index + 1}`;
    const field = (suffix: string, label: string, column: string): LppFormField => ({
      id: `${id}-${suffix}`,
      label,
      kind: "text",
      required: false,
      targets: [{ sheet: documentation.name, address: `${column}${row}`, prefix: "" }],
    });
    return {
      id,
      number: index + 1,
      fields: [field("material", "Nama material", "B"), field("location", "Lokasi pemasangan", "C")],
    };
  });
  return {
    kind: "documentation-table-v1",
    information: [],
    signatures: [],
    items,
    photoFormat: "jpeg",
    reportHeader: buildDocumentationReportHeader(main, documentation, layout.signDate),
    photoSlots: items.map((item, index) => ({
      id: `${item.id}-photo-1`,
      itemId: item.id,
      sheet: documentation.name,
      row: index + 13,
      column: 3,
      hasTemplatePhoto: false,
    })),
  };
}

/** Builds the form descriptor for the 141-row command-center layout (15 documentation slots). */
export const buildCommandCenterDocumentationForm = (workbook: LppWorkbook) =>
  buildBlankDocumentationForm(workbook, BLANK_DOCUMENTATION_LAYOUTS.commandCenter);

/** Builds the form descriptor for the 271-row task-force layout (15 documentation slots). */
export const buildTaskForceDocumentationForm = (workbook: LppWorkbook) =>
  buildBlankDocumentationForm(workbook, BLANK_DOCUMENTATION_LAYOUTS.taskForce);

/** Builds the form descriptor for the 104-row HC-operation layout (15 documentation slots). */
export const buildHcOperationDocumentationForm = (workbook: LppWorkbook) =>
  buildBlankDocumentationForm(workbook, BLANK_DOCUMENTATION_LAYOUTS.hcOperation);
