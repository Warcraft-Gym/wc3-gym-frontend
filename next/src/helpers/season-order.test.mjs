import assert from "node:assert/strict";
import test from "node:test";
import { byNewest, byOldest } from "./season-order.mjs";

// The old league seasons were imported after 17 and 18, so they carry higher
// ids while having run years earlier.
const SEASONS = [
  { id: 2, name: "Season 17", start_date: "2026-01-18" },
  { id: 4, name: "Season 18", start_date: "2026-07-06" },
  { id: 9, name: "Season 16", start_date: "2025-04-21" },
  { id: 15, name: "Season 10", start_date: "2022-07-03" },
];

test("the newest season is the one that started last, not the highest id", () => {
  assert.equal([...SEASONS].sort(byNewest)[0].name, "Season 18");
});

test("the oldest season is the one that started first", () => {
  assert.equal([...SEASONS].sort(byOldest)[0].name, "Season 10");
});

test("a season with no start date falls back to its id", () => {
  const rows = [{ id: 7 }, { id: 3 }];
  assert.deepEqual([...rows].sort(byOldest).map((r) => r.id), [3, 7]);
});

test("a dated season sorts after an undated one", () => {
  const rows = [{ id: 1, start_date: "2020-01-01" }, { id: 2 }];
  assert.deepEqual([...rows].sort(byOldest).map((r) => r.id), [2, 1]);
});
