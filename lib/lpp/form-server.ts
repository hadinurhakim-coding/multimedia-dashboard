import "server-only";
import { buildInstallationForm } from "./form";
import { buildDocumentationForm } from "./documentation-form";
import { buildAuditoriumDocumentationForm } from "./auditorium-form";
import { buildCollaborationDocumentationForm } from "./collaboration-form";
import { buildPbhDocumentationForm } from "./pbh-form";
import { buildSocDocumentationForm } from "./soc-form";
import { BLANK_DOCUMENTATION_LAYOUTS, buildBlankDocumentationForm, type BlankDocumentationLayout } from "./blank-documentation-form";
import type { LppWorkbook } from "@/types/lpp";

const BLANK_DOCUMENTATION_TEMPLATES: readonly (readonly [string, BlankDocumentationLayout])[] = [
  ["LPP_COMMAND_CENTER_TEMPLATE_ID", BLANK_DOCUMENTATION_LAYOUTS.commandCenter],
  ["LPP_TASK_FORCE_TEMPLATE_ID", BLANK_DOCUMENTATION_LAYOUTS.taskForce],
  ["LPP_HC_OPERATION_TEMPLATE_ID", BLANK_DOCUMENTATION_LAYOUTS.hcOperation],
];

export function hasLppForm(templateId: string) {
  return hasDocumentationTable(templateId) || Boolean(process.env.LPP_FORM_TEMPLATE_ID) && templateId === process.env.LPP_FORM_TEMPLATE_ID;
}
export function hasDocumentationTable(templateId: string) {
  return Boolean(process.env.LPP_DOCUMENTATION_TEMPLATE_ID) && templateId === process.env.LPP_DOCUMENTATION_TEMPLATE_ID
    || Boolean(process.env.LPP_AUDITORIUM_TEMPLATE_ID) && templateId === process.env.LPP_AUDITORIUM_TEMPLATE_ID
    || Boolean(process.env.LPP_AUDITORIUM_PHASE1_TEMPLATE_ID) && templateId === process.env.LPP_AUDITORIUM_PHASE1_TEMPLATE_ID
    || Boolean(process.env.LPP_COLLABORATION_TEMPLATE_ID) && templateId === process.env.LPP_COLLABORATION_TEMPLATE_ID
    || Boolean(process.env.LPP_PBH_TEMPLATE_ID) && templateId === process.env.LPP_PBH_TEMPLATE_ID
    || Boolean(process.env.LPP_SOC_TEMPLATE_ID) && templateId === process.env.LPP_SOC_TEMPLATE_ID
    || BLANK_DOCUMENTATION_TEMPLATES.some(([envName]) => Boolean(process.env[envName]) && templateId === process.env[envName]);
}
export function getLppForm(templateId: string, workbook: LppWorkbook) {
  const blankMatch = BLANK_DOCUMENTATION_TEMPLATES.find(([envName]) => Boolean(process.env[envName]) && templateId === process.env[envName]);
  if (blankMatch) return buildBlankDocumentationForm(workbook, blankMatch[1]);
  if (process.env.LPP_SOC_TEMPLATE_ID && templateId === process.env.LPP_SOC_TEMPLATE_ID) return buildSocDocumentationForm(workbook);
  if (process.env.LPP_PBH_TEMPLATE_ID && templateId === process.env.LPP_PBH_TEMPLATE_ID) return buildPbhDocumentationForm(workbook);
  if (process.env.LPP_COLLABORATION_TEMPLATE_ID && templateId === process.env.LPP_COLLABORATION_TEMPLATE_ID) return buildCollaborationDocumentationForm(workbook);
  if (process.env.LPP_AUDITORIUM_PHASE1_TEMPLATE_ID && templateId === process.env.LPP_AUDITORIUM_PHASE1_TEMPLATE_ID) return buildAuditoriumDocumentationForm(workbook, 1);
  if (process.env.LPP_AUDITORIUM_TEMPLATE_ID && templateId === process.env.LPP_AUDITORIUM_TEMPLATE_ID) return buildAuditoriumDocumentationForm(workbook);
  if (hasDocumentationTable(templateId)) return buildDocumentationForm(workbook);
  return hasLppForm(templateId) ? buildInstallationForm(workbook) : null;
}
