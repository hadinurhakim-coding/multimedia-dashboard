import { test } from "node:test";
import assert from "node:assert/strict";
import {
  buildDraftFolders,
  draftDisplayTitle,
  draftExportLabel,
  filterFolderDrafts,
  type DraftSummary,
} from "../lib/lpp/draft-folders";
import type { LppTemplate } from "../types/lpp";

const templates: LppTemplate[] = [
  { id: "tpl-p2is", name: "LPP P2IS (New)", documentationTableAvailable: true },
  { id: "tpl-aud", name: "LPP Auditorium", documentationTableAvailable: true },
];

const drafts: DraftSummary[] = [
  {
    id: "d1",
    title: "LPP P2IS (New)",
    templateId: "tpl-p2is",
    templateHash: "h1",
    reportDate: "2026-11-18",
    createdAt: "2026-11-18T02:00:00Z",
    updatedAt: "2026-11-18T07:00:00Z",
    revision: "r1",
    changes: 4,
    photoCount: 2,
  },
  {
    id: "d2",
    title: "LPP P2IS Bulanan",
    templateId: "tpl-p2is",
    templateHash: "h1",
    reportDate: "2026-10-05",
    createdAt: "2026-10-05T02:00:00Z",
    updatedAt: "2026-10-05T04:00:00Z",
    revision: "r1",
  },
  {
    id: "d3",
    title: "LPP Auditorium",
    templateId: "tpl-aud",
    templateHash: "h2",
    reportDate: "2026-11-12",
    createdAt: "2026-11-12T02:00:00Z",
    updatedAt: "2026-11-12T03:00:00Z",
    revision: "r1",
  },
  {
    id: "d4",
    title: "Draf Lama",
    templateId: "tpl-missing",
    templateHash: "h3",
    reportDate: "2026-09-01",
    createdAt: "2026-09-01T02:00:00Z",
    updatedAt: "2026-09-01T02:00:00Z",
    revision: "r1",
  },
];

test("Drafts group dynamically into per-template folders with clean names and month badges", () => {
  const folders = buildDraftFolders(drafts, templates);
  assert.deepEqual(
    folders.map((folder) => ({
      id: folder.id,
      name: folder.name,
      available: folder.available,
      count: folder.drafts.length,
      months: folder.months,
    })),
    [
      {
        id: "tpl-p2is",
        name: "LPP P2IS",
        available: true,
        count: 2,
        months: [
          { key: "2026-11", label: "November 2026" },
          { key: "2026-10", label: "Oktober 2026" },
        ],
      },
      {
        id: "tpl-aud",
        name: "LPP Auditorium",
        available: true,
        count: 1,
        months: [{ key: "2026-11", label: "November 2026" }],
      },
      {
        id: "tpl-missing",
        name: "Template tidak tersedia",
        available: false,
        count: 1,
        months: [{ key: "2026-09", label: "September 2026" }],
      },
    ]
  );
  assert.equal(draftDisplayTitle(drafts[0], "LPP P2IS"), "LPP P2IS");
  assert.equal(draftDisplayTitle(drafts[1], "LPP P2IS"), "LPP P2IS Bulanan");
  assert.equal(draftExportLabel(drafts[0], "LPP P2IS"), "2026-11-18 LPP P2IS.xlsx");
});

test("Drafts inside a folder filter accurately by month and search query", () => {
  const folder = buildDraftFolders(drafts, templates)[0];
  assert.deepEqual(
    filterFolderDrafts(folder.drafts, folder.name, { monthKey: "2026-11" }).map((d) => d.id),
    ["d1"]
  );
  assert.deepEqual(
    filterFolderDrafts(folder.drafts, folder.name, { query: "oktober" }).map((d) => d.id),
    ["d2"]
  );
  assert.deepEqual(
    filterFolderDrafts(folder.drafts, folder.name, { query: "2026-11-18" }).map((d) => d.id),
    ["d1"]
  );
});
