import type { LppWorkbook } from "@/types/lpp";
import { buildAnchoredDocumentationForm } from "./anchored-documentation-form";
import type { LppForm } from "./form";

// Coordinates only. Project, material, location and signatory values remain private.
const COLLABORATION_ANCHORS = [
  ["45"],
  ["46"],
  ["47"],
  ["48"],
  ["49"],
  ["50"],
  ["51", "52", "53", "54"],
  ["55"],
  ["56"],
  ["57", "61"],
] as const;

export function buildCollaborationDocumentationForm(workbook: LppWorkbook): LppForm | null {
  return buildAnchoredDocumentationForm(workbook, {
    reportRows: 36,
    documentationRows: 23,
    signDate: "C25",
    anchors: COLLABORATION_ANCHORS,
  });
}
