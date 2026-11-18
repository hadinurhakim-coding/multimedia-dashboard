import { test } from "node:test";
import assert from "node:assert/strict";
import {
  buildTemplateCatalogRows,
  describeTemplateFormat,
  filterTemplateCatalogRows,
} from "../lib/lpp/template-catalog";
import type { LppTemplate } from "../types/lpp";

const sampleTemplates: LppTemplate[] = [
  { id: "t-cc", name: "LPP Command Center IT", documentationTableAvailable: true },
  { id: "t-soc", name: "LPP Video Wall SOC", documentationTableAvailable: true },
  { id: "t-inst", name: "LPP Instalasi Pilot", formAvailable: true },
  { id: "t-raw", name: "LPP Spreadsheet Lain" },
];

const sampleDrafts = [
  { templateId: "t-cc" },
  { templateId: "t-cc" },
  { templateId: "t-soc" },
];

test("Template catalog enriches formats, indexes, and saved draft counts", () => {
  const rows = buildTemplateCatalogRows(sampleTemplates, sampleDrafts);
  assert.deepEqual(
    rows.map((r) => ({ id: r.id, index: r.index, kind: r.formatKind, label: r.formatLabel, drafts: r.draftCount })),
    [
      { id: "t-cc", index: 1, kind: "documentation-table", label: "Tabel dokumentasi", drafts: 2 },
      { id: "t-soc", index: 2, kind: "documentation-table", label: "Tabel dokumentasi", drafts: 1 },
      { id: "t-inst", index: 3, kind: "installation-form", label: "Form input", drafts: 0 },
      { id: "t-raw", index: 4, kind: "spreadsheet", label: "Spreadsheet", drafts: 0 },
    ]
  );
  assert.equal(describeTemplateFormat({ documentationTableAvailable: true }).label, "Tabel dokumentasi");
});

test("Template catalog filters by search query and format kind and sorts deterministically", () => {
  const rows = buildTemplateCatalogRows(sampleTemplates, sampleDrafts);
  assert.deepEqual(
    filterTemplateCatalogRows(rows, { query: "video wall" }).map((r) => r.id),
    ["t-soc"]
  );
  assert.deepEqual(
    filterTemplateCatalogRows(rows, { query: "tabel dokumentasi" }).map((r) => r.id),
    ["t-cc", "t-soc"]
  );
  assert.deepEqual(
    filterTemplateCatalogRows(rows, { format: "installation-form" }).map((r) => r.id),
    ["t-inst"]
  );
  assert.deepEqual(
    filterTemplateCatalogRows(rows, { sort: "asc" }).map((r) => r.id),
    ["t-cc", "t-inst", "t-raw", "t-soc"]
  );
  assert.deepEqual(
    filterTemplateCatalogRows(rows, { sort: "desc" }).map((r) => r.id),
    ["t-soc", "t-raw", "t-inst", "t-cc"]
  );
});
