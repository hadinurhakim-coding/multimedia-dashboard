import type { LppWorkbook } from "@/types/lpp";
import { buildAnchoredDocumentationForm } from "./anchored-documentation-form";
import type { LppForm } from "./form";

// Coordinates only. Project, material, location and signatory values remain private.
const SOC_ANCHORS = [
  ["2"],
  ["16"],
  ["24"],
  ["26"],
  ["57"],
  ["62"],
  ["61"],
  ["58"],
  ["27"],
  ["64", "65"],
  ["63"],
  ["28"],
  ["30"],
  ["40"],
  ["33"],
  ["35"],
  ["38"],
  ["43"],
  ["45"],
  ["47"],
  ["3"],
  ["51"],
  ["53"],
  ["55"],
] as const;

/** Builds the documentation-table descriptor for the 24-material SOC videowall layout. */
export function buildSocDocumentationForm(workbook: LppWorkbook): LppForm | null {
  return buildAnchoredDocumentationForm(workbook, {
    reportRows: 49,
    documentationRows: 37,
    signDate: "D39",
    anchors: SOC_ANCHORS,
    requireLocation: false,
  });
}
