import { test } from "node:test";
import assert from "node:assert/strict";
import { buildLppBreadcrumbItems } from "../lib/lpp/breadcrumb";

test("LPP breadcrumb renders catalog, editor, and drafts trails consistently", () => {
  assert.deepEqual(
    buildLppBreadcrumbItems({ screen: "editor" }),
    [
      { id: "lpp", label: "LPP" },
      { id: "catalog", label: "Daftar template", current: true },
    ]
  );

  assert.deepEqual(
    buildLppBreadcrumbItems({
      screen: "editor",
      templateName: "LPP Videotron Auditorium Tahap 2",
      reportTitle: "   ",
    }),
    [
      { id: "lpp", label: "LPP", action: "catalog" },
      { id: "catalog", label: "Daftar template", action: "catalog" },
      { id: "document", label: "LPP Videotron Auditorium Tahap 2", current: true },
    ]
  );

  assert.deepEqual(
    buildLppBreadcrumbItems({
      screen: "editor",
      templateName: "LPP Videowall P2IS",
      reportTitle: "LPP Videowall P2IS - 1 Maret 2026",
    }),
    [
      { id: "lpp", label: "LPP", action: "catalog" },
      { id: "catalog", label: "Daftar template", action: "catalog" },
      { id: "document", label: "LPP Videowall P2IS - 1 Maret 2026", current: true },
    ]
  );

  assert.deepEqual(
    buildLppBreadcrumbItems({ screen: "drafts" }),
    [
      { id: "lpp", label: "LPP", action: "editor" },
      { id: "drafts", label: "Draf", current: true },
    ]
  );

  assert.deepEqual(
    buildLppBreadcrumbItems({ screen: "drafts", folderName: "LPP Videowall P2IS" }),
    [
      { id: "lpp", label: "LPP", action: "editor" },
      { id: "drafts", label: "Draf", action: "drafts-root" },
      { id: "folder", label: "LPP Videowall P2IS", current: true },
    ]
  );
});
