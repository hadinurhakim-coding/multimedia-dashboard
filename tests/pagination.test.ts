import { test } from "node:test";
import assert from "node:assert/strict";
import { DEFAULT_PAGE_SIZE, PAGE_SIZE_OPTIONS, paginateRows, visiblePageTokens } from "../lib/pagination";

test("Pagination helper defaults to 20 rows on page 1 and clamps pages safely", () => {
  assert.equal(DEFAULT_PAGE_SIZE, 20);
  assert.deepEqual(PAGE_SIZE_OPTIONS, [5, 10, 20, 50, 100]);

  const rows = Array.from({ length: 45 }, (_, i) => i + 1);
  const first = paginateRows(rows, 1, DEFAULT_PAGE_SIZE);
  assert.equal(first.page, 1);
  assert.equal(first.totalPages, 3);
  assert.equal(first.items.length, 20);
  assert.deepEqual([first.items[0], first.items[19]], [1, 20]);

  const overflow = paginateRows(rows, 99, DEFAULT_PAGE_SIZE);
  assert.equal(overflow.page, 3);
  assert.deepEqual(overflow.items, [41, 42, 43, 44, 45]);

  const empty = paginateRows([], 3, 20);
  assert.equal(empty.page, 1);
  assert.equal(empty.totalPages, 1);
  assert.deepEqual(empty.items, []);
});

test("Page token generator inserts ellipsis cleanly for small and large page counts", () => {
  assert.deepEqual(visiblePageTokens(1, 1), [1]);
  assert.deepEqual(visiblePageTokens(2, 5), [1, 2, 3, 4, 5]);
  assert.deepEqual(visiblePageTokens(1, 16), [1, 2, 3, 4, 5, "ellipsis-right", 16]);
  assert.deepEqual(visiblePageTokens(8, 16), [1, "ellipsis-left", 7, 8, 9, "ellipsis-right", 16]);
  assert.deepEqual(visiblePageTokens(15, 16), [1, "ellipsis-left", 12, 13, 14, 15, 16]);
});
