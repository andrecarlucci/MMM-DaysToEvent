const { test } = require("node:test");
const assert = require("node:assert");
const moment = require("moment");

const DaysToEventUtils = require("../daystoeventutils");

const now = moment("2026-07-05T09:00:00");

test("returns kind 'today' for an event later the same day", () => {
	const start = moment("2026-07-05T20:00:00");
	assert.deepStrictEqual(DaysToEventUtils.countdownLabel(start, now), { kind: "today" });
});

test("returns kind 'today' for an event already in progress (negative day diff)", () => {
	const start = moment("2026-07-03T09:00:00");
	assert.deepStrictEqual(DaysToEventUtils.countdownLabel(start, now), { kind: "today" });
});

test("returns kind 'tomorrow' for the next calendar day", () => {
	const start = moment("2026-07-06T01:00:00");
	assert.deepStrictEqual(DaysToEventUtils.countdownLabel(start, now), { kind: "tomorrow" });
});

test("returns relative with 7 days out", () => {
	const start = moment("2026-07-12T09:00:00");
	assert.deepStrictEqual(DaysToEventUtils.countdownLabel(start, now), { kind: "relative", days: 7 });
});

test("counts whole calendar days, ignoring clock time", () => {
	const start = moment("2026-07-07T23:59:00");
	assert.deepStrictEqual(DaysToEventUtils.countdownLabel(start, now), { kind: "relative", days: 2 });
});

test("crosses month boundaries correctly", () => {
	const start = moment("2026-08-03T09:00:00");
	assert.deepStrictEqual(DaysToEventUtils.countdownLabel(start, now), { kind: "relative", days: 29 });
});

test("multiDayLastDay: single-day timed event returns null", () => {
	const start = moment("2026-07-05T10:00:00");
	const end = moment("2026-07-05T12:00:00");
	assert.strictEqual(DaysToEventUtils.multiDayLastDay(start, end, false), null);
});

test("multiDayLastDay: single all-day event (exclusive end) returns null", () => {
	const start = moment("2026-07-05T00:00:00");
	const end = moment("2026-07-06T00:00:00"); // DTEND exclusive => actual last day is Jul 5
	assert.strictEqual(DaysToEventUtils.multiDayLastDay(start, end, true), null);
});

test("multiDayLastDay: multi-day all-day event returns the last actual day (end minus one)", () => {
	const start = moment("2026-07-04T00:00:00");
	const end = moment("2026-08-17T00:00:00"); // DTEND exclusive => last day is Aug 16
	const lastDay = DaysToEventUtils.multiDayLastDay(start, end, true);
	assert.strictEqual(lastDay.format("MMM Do"), "Aug 16th");
});

test("multiDayLastDay: multi-day timed event returns the end day", () => {
	const start = moment("2026-07-04T18:00:00");
	const end = moment("2026-07-06T09:00:00");
	const lastDay = DaysToEventUtils.multiDayLastDay(start, end, false);
	assert.strictEqual(lastDay.format("MMM Do"), "Jul 6th");
});
