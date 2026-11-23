import { test } from "node:test";
import assert from "node:assert/strict";
import { addDays, daysBetween, localDayKey, utcDayKey } from "./dates";

test("daysBetween across a leap year and DST", () => {
  assert.equal(daysBetween("2024-02-28", "2024-03-01"), 2);
  assert.equal(daysBetween("2026-03-28", "2026-03-30"), 2); // UK clocks change 29 Mar
  assert.equal(daysBetween("2026-11-23", "2026-11-20"), -3);
});

test("addDays round-trips", () => {
  assert.equal(addDays("2026-12-31", 1), "2027-01-01");
  assert.equal(addDays("2026-03-01", -1), "2026-02-28");
  assert.equal(daysBetween("2021-06-19", addDays("2021-06-19", 1983)), 1983);
});

test("day keys format", () => {
  const d = new Date(Date.UTC(2026, 0, 5, 12));
  assert.equal(utcDayKey(d), "2026-01-05");
  assert.match(localDayKey(d), /^\d{4}-\d{2}-\d{2}$/);
});

test("bad key throws", () => {
  assert.throws(() => daysBetween("2026-1-1", "2026-01-02"));
});
