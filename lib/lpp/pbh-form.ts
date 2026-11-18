import type { LppWorkbook } from "@/types/lpp";
import { buildAnchoredDocumentationForm } from "./anchored-documentation-form";
import type { LppForm } from "./form";

// Coordinates only. Project, material, location and signatory values remain private.
const PBH_ANCHORS = [
  ["16"],
  ["17"],
  ["24"],
  ["25"],
  ["26", "27"],
  ["28"],
  ["29"],
  ["30"],
  ["31"],
  ["32"],
  ["33", "34"],
] as const;

/** Builds the documentation-table descriptor for the 11-material videowall layout. */
export function buildPbhDocumentationForm(workbook: LppWorkbook): LppForm | null {
  return buildAnchoredDocumentationForm(workbook, {
    reportRows: 38,
    documentationRows: 24,
    signDate: "C27",
    anchors: PBH_ANCHORS,
  });
}
