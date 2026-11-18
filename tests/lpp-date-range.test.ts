import { test } from "node:test";
import assert from "node:assert/strict";
import {
  draftDateFilterToRange,
  formatCalendarIsoDate,
  formatDraftDateFilterLabel,
  matchesDraftDateFilter,
  normalizeDraftDateFilterValue,
  parseCalendarIsoDate,
  parseDraftDateFilter,
  resolveInitialCalendarMonth,
  serializeDraftDateRange,
} from "../lib/lpp/date-range";

test("Draft date range filter parses, normalizes, and matches single days, ranges, and months cleanly", () => {
  assert.equal(parseDraftDateFilter("all"), null);
  assert.equal(parseDraftDateFilter("invalid-range"), null);
  assert.equal(parseDraftDateFilter("2026-02-31"), null);

  assert.deepEqual(parseDraftDateFilter("2026-03"), { kind: "month", monthKey: "2026-03" });
  assert.deepEqual(parseDraftDateFilter("2026-06-01"), {
    kind: "range",
    from: "2026-06-01",
    to: "2026-06-01",
  });
  assert.deepEqual(parseDraftDateFilter("2026-10-01..2026-03-01"), {
    kind: "range",
    from: "2026-03-01",
    to: "2026-10-01",
  });

  assert.equal(normalizeDraftDateFilterValue("2026-10-01..2026-03-01"), "2026-03-01..2026-10-01");
  assert.equal(normalizeDraftDateFilterValue("2026-03-01..2026-03-01"), "2026-03-01");
  assert.equal(normalizeDraftDateFilterValue("2026-99-01"), "all");

  const rangeFilter = parseDraftDateFilter("2026-04-01..2026-07-01");
  assert.equal(matchesDraftDateFilter("2026-03-01", rangeFilter), false);
  assert.equal(matchesDraftDateFilter("2026-04-01", rangeFilter), true);
  assert.equal(matchesDraftDateFilter("2026-06-01", rangeFilter), true);
  assert.equal(matchesDraftDateFilter("2026-07-01", rangeFilter), true);
  assert.equal(matchesDraftDateFilter("2026-08-01", rangeFilter), false);
});

test("Calendar date conversion preserves local year-month-day and builds clear Indonesian labels", () => {
  const marchFirst = parseCalendarIsoDate("2026-03-01");
  const octFirst = parseCalendarIsoDate("2026-10-01");
  assert.equal(formatCalendarIsoDate(marchFirst), "2026-03-01");
  assert.equal(formatCalendarIsoDate(octFirst), "2026-10-01");

  assert.equal(serializeDraftDateRange(undefined), "all");
  assert.equal(serializeDraftDateRange({ from: marchFirst }), "2026-03-01");
  assert.equal(serializeDraftDateRange({ from: octFirst, to: marchFirst }), "2026-03-01..2026-10-01");

  assert.deepEqual(draftDateFilterToRange(parseDraftDateFilter("2026-03-01..2026-10-01")), {
    from: marchFirst,
    to: octFirst,
  });

  assert.equal(formatDraftDateFilterLabel(null), "Pilih rentang tanggal");
  assert.equal(formatDraftDateFilterLabel(parseDraftDateFilter("2026-03-01")), "1 Maret 2026");
  assert.match(formatDraftDateFilterLabel(parseDraftDateFilter("2026-03-01..2026-10-01")), /Mar.*2026.*Okt.*2026/);

  const twoMonthAnchor = resolveInitialCalendarMonth(["2026-03-01", "2026-10-01"], undefined, 2);
  assert.equal(formatCalendarIsoDate(twoMonthAnchor), "2026-09-01");

  const activeAnchor = resolveInitialCalendarMonth(["2026-03-01", "2026-10-01"], { from: parseCalendarIsoDate("2026-05-15") }, 2);
  assert.equal(formatCalendarIsoDate(activeAnchor), "2026-05-01");
});
