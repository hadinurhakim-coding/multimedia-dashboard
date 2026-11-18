import { test } from "node:test";
import assert from "node:assert/strict";
import {
  bulkExportArchiveName,
  parseExportFilename,
  summarizeSelection,
  toggleSelectionSet,
  uniqueZipEntryName,
} from "../lib/lpp/bulk-export";

test("Export header parser prefers UTF-8 filename and sanitizes unsafe characters", () => {
  assert.equal(
    parseExportFilename(`attachment; filename="fallback.xlsx"; filename*=UTF-8''2026-03-01%20LPP%20Videowall%20P2IS.xlsx`),
    "2026-03-01 LPP Videowall P2IS.xlsx"
  );
  assert.equal(
    parseExportFilename(`attachment; filename="report.xlsx"`),
    "report.xlsx"
  );
  assert.equal(parseExportFilename(null, "default.xlsx"), "default.xlsx");
});

test("ZIP entry deduplicator appends sequential suffixes case-insensitively", () => {
  const used = new Set<string>();
  assert.equal(uniqueZipEntryName("2026-03-01 LPP P2IS.xlsx", used), "2026-03-01 LPP P2IS.xlsx");
  assert.equal(uniqueZipEntryName("2026-03-01 LPP P2IS.xlsx", used), "2026-03-01 LPP P2IS (2).xlsx");
  assert.equal(uniqueZipEntryName("2026-03-01 lpp p2is.xlsx", used), "2026-03-01 lpp p2is (3).xlsx");
  assert.equal(uniqueZipEntryName("2026-04-01 LPP P2IS.xlsx", used), "2026-04-01 LPP P2IS.xlsx");
});

test("Bulk archive name formats Jakarta date and folder name safely", () => {
  const fixedNow = new Date("2026-11-18T10:00:00Z");
  assert.equal(
    bulkExportArchiveName("LPP Videowall P2IS", 8, fixedNow),
    "2026-11-18 LPP Videowall P2IS (8 file).zip"
  );
  assert.equal(
    bulkExportArchiveName(null, 5, fixedNow),
    "2026-11-18 Ekspor Excel LPP (5 file).zip"
  );
  assert.equal(
    bulkExportArchiveName("LPP: Folder/A*", 2, fixedNow),
    "2026-11-18 LPP_ Folder_A_ (2 file).zip"
  );
});

test("Selection helpers toggle multiple IDs and compute indeterminate state accurately", () => {
  let selected = new Set<string>();
  selected = toggleSelectionSet(selected, ["a", "b"], true);
  assert.deepEqual([...selected], ["a", "b"]);

  assert.deepEqual(summarizeSelection(selected, ["a", "b", "c"]), {
    visibleSelectedCount: 2,
    allVisibleSelected: false,
    someVisibleSelected: true,
  });

  selected = toggleSelectionSet(selected, ["c"], true);
  assert.deepEqual(summarizeSelection(selected, ["a", "b", "c"]), {
    visibleSelectedCount: 3,
    allVisibleSelected: true,
    someVisibleSelected: false,
  });

  selected = toggleSelectionSet(selected, ["a", "c"], false);
  assert.deepEqual([...selected], ["b"]);
});
