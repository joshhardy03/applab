import { test } from "node:test";
import assert from "node:assert/strict";
import { formatTime, friendlyDay, greeting, pts } from "./time";

test("12-hour times", () => {
  assert.equal(formatTime(0, 0), "12:00 am");
  assert.equal(formatTime(7, 0), "7:00 am");
  assert.equal(formatTime(12, 30), "12:30 pm");
  assert.equal(formatTime(21, 5), "9:05 pm");
});

test("friendly days", () => {
  assert.equal(friendlyDay("2026-11-23", "2026-11-23"), "Today");
  assert.equal(friendlyDay("2026-11-22", "2026-11-23"), "Yesterday");
  assert.equal(friendlyDay("2026-11-20", "2026-11-23"), "Friday 20 November");
  assert.equal(friendlyDay("2025-12-31", "2026-01-02"), "Wednesday 31 December 2025");
});

test("greeting and points", () => {
  assert.equal(greeting(8), "Good morning");
  assert.equal(greeting(13), "Good afternoon");
  assert.equal(greeting(20), "Good evening");
  assert.equal(pts(23.44), "23.4");
  assert.equal(pts(20), "20");
});
