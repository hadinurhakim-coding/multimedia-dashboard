import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import JSZip from "jszip";
import sharp from "sharp";
import { applyReportDate, formatReportDate, jakartaDate, resolveReportDate, validateReportDate } from "../lib/lpp/report-date";
import { buildDocumentationForm } from "../lib/lpp/documentation-form";
import { exportWorkbook, inspectWorkbook } from "../lib/lpp/workbook";
import { templateHeaderLogo } from "../lib/lpp/photos";
import type { LppForm } from "../lib/lpp/form";

test("Report dates use Jakarta creation day, keep explicit choices and reject invalid dates", () => {
  assert.equal(jakartaDate(new Date("2026-11-17T16:59:59Z")), "2026-11-17");
  assert.equal(jakartaDate(new Date("2026-11-17T17:00:00Z")), "2026-11-18");
  assert.equal(resolveReportDate(undefined, "2026-11-18"), "2026-11-18");
  assert.equal(resolveReportDate({ createdAt: "2026-11-17T17:00:00Z", updatedAt: "2026-12-30T12:00:00Z" }), "2026-11-18");
  assert.equal(resolveReportDate({ reportDate: "2026-11-20", createdAt: "2026-11-17T17:00:00Z", updatedAt: "2026-12-30T12:00:00Z" }), "2026-11-20");
  assert.equal(resolveReportDate({ updatedAt: "2026-11-17T17:00:00Z" }), "2026-11-18");
  assert.equal(formatReportDate("2026-11-18"), "18 November 2026");
  assert.equal(validateReportDate("2024-02-29"), "2024-02-29");
  for (const invalid of ["", null, 20261118, "2026-02-29", "2026-04-31", "2026-13-01", "18/11/2026", "2026-11-18T00:00:00Z"]) assert.throws(() => validateReportDate(invalid));
});
test("One report date overrides stale date cells without changing other edits", () => {
  const form: LppForm = { kind: "documentation-table-v1", information: [], signatures: [], items: [], reportHeader: {
    title: { sheet: "Report", address: "B1", prefix: "" }, projectId: { sheet: "Report", address: "A4", prefix: "" }, fields: [],
    dateTargets: [{ sheet: "Report", address: "A10", prefix: "Date    : " }, { sheet: "Docs", address: "A10", prefix: "Date : " }, { sheet: "Report", address: "C145", prefix: "Kota, " }],
  } };
  const edits = applyReportDate(form, [{ sheet: "Report", address: "A10", value: "Date : 30 September 2024" }, { sheet: "Report", address: "B13", value: "Unchanged edit" }], "2026-11-18");
  assert.deepEqual(edits.map((edit) => edit.value), ["Unchanged edit", "Date    : 18 November 2026", "Date : 18 November 2026", "Kota, 18 November 2026"]);
  assert.equal(edits.filter((edit) => edit.sheet === "Report" && edit.address === "A10").length, 1);
});
test("Private report export updates both headers and sign-off, preserving styles, media and unrelated cells", async (t) => {
  const directory = process.env.LPP_TEST_TEMPLATE_DIR ?? "private/data-lpp";
  const files = await readdir(directory).catch(() => []);
  let matched = 0;
  for (const filename of files.filter((file) => file.endsWith(".xlsx"))) {
    const original = await readFile(`${directory}/${filename}`), workbook = await inspectWorkbook(original), form = buildDocumentationForm(workbook);
    if (!form?.reportHeader) continue;
    matched++;
    const logo = await sharp(await templateHeaderLogo(original)).metadata(); assert.equal(logo.format, "png"); assert.ok(logo.width! > 0);
    for (const reportDate of ["2026-11-18", "2026-12-01"]) {
      const changes = applyReportDate(form, [], reportDate), exported = await exportWorkbook(original, changes), reopened = await inspectWorkbook(exported);
      assert.equal(changes.length, 3);
      for (const change of changes) assert.equal(reopened.sheets.find((sheet) => sheet.name === change.sheet)?.cells.find((cell) => cell.address === change.address)?.value, change.value);
      const before = await JSZip.loadAsync(original), after = await JSZip.loadAsync(exported);
      for (const name of Object.keys(before.files).filter((name) => !before.files[name].dir && !/^xl\/worksheets\/sheet[12]\.xml$/.test(name))) assert.deepEqual(await after.file(name)!.async("nodebuffer"), await before.file(name)!.async("nodebuffer"));
      for (const [index, sheet] of workbook.sheets.entries()) {
        const part = `xl/worksheets/sheet${index + 1}.xml`;
        let oldXml = await before.file(part)!.async("string"), newXml = await after.file(part)!.async("string");
        for (const change of changes.filter((change) => change.sheet === sheet.name)) {
          const regex = new RegExp(`<c\\b(?=[^>]*\\br="${change.address}")[^>]*?(?:\\/>|>[\\s\\S]*?<\\/c>)`);
          assert.equal(newXml.match(regex)?.[0].match(/\bs="[^"]*"/)?.[0], oldXml.match(regex)?.[0].match(/\bs="[^"]*"/)?.[0]);
          oldXml = oldXml.replace(regex, "<managed-date/>"); newXml = newXml.replace(regex, "<managed-date/>");
        }
        assert.equal(newXml, oldXml);
      }
    }
  }
  if (!matched) t.skip("Private documentation template is not installed in this environment.");
  else assert.equal(matched, 1);
});
