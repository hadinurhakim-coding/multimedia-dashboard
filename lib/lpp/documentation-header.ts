import type { LppSheet } from "@/types/lpp";
import type { LppForm } from "./form";

export function readRawCell(sheet: LppSheet, address: string): string {
  return String(sheet.cells.find((cell) => cell.address === address)?.value ?? "");
}

export function readTrimmedCell(sheet: LppSheet, address: string): string {
  return readRawCell(sheet, address).trim();
}

export function colonPrefix(sheet: LppSheet, address: string): string {
  const raw = readRawCell(sheet, address);
  const colon = raw.indexOf(":");
  return colon < 0 ? "" : raw.slice(0, colon + 1) + (raw[colon + 1] === " " ? " " : "");
}

export function extractSignPrefix(sheet: LppSheet, address: string): string {
  const raw = readRawCell(sheet, address);
  const dated = raw.match(/^(.*?)(?:\d{1,2}\s+\p{L}+\s+\d{4})\s*$/u);
  if (dated) return dated[1];
  return raw.trim() ? `${raw.trimEnd()} ` : "";
}

/** Builds shared Sheet 1/2 report metadata and synchronized report/sign-off date targets. */
export function buildDocumentationReportHeader(
  main: LppSheet,
  documentation: LppSheet,
  signDate: string
): NonNullable<LppForm["reportHeader"]> {
  const target = (sheet: string, address: string, prefix = "") => ({ sheet, address, prefix });
  return {
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
      kind: "text" as const,
      targets: [target(main.name, `A${row}`, colonPrefix(main, `A${row}`))],
    })),
    dateTargets: [
      target(main.name, "A10", colonPrefix(main, "A10")),
      target(documentation.name, "A10", colonPrefix(documentation, "A10")),
      target(main.name, signDate, extractSignPrefix(main, signDate)),
    ],
  };
}
