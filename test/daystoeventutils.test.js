const { test } = require("node:test");
const assert = require("node:assert");
const moment = require("moment");

const DaysToEventUtils = require("../daystoeventutils");

const now = moment("2026-07-05T09:00:00");

test("returns the word 'Today' for an event later the same day", () => {
	const start = moment("2026-07-05T20:00:00");
	assert.deepStrictEqual(DaysToEventUtils.countdownLabel(start, now), { value: "Today", unit: null, isWord: true });
});

test("returns the word 'Tomorrow' for the next calendar day", () => {
	const start = moment("2026-07-06T01:00:00");
	assert.deepStrictEqual(DaysToEventUtils.countdownLabel(start, now), { value: "Tomorrow", unit: null, isWord: true });
});

test("returns a number with plural unit for 7 days out", () => {
	const start = moment("2026-07-12T09:00:00");
	assert.deepStrictEqual(DaysToEventUtils.countdownLabel(start, now), { value: "7", unit: "days", isWord: false });
});

test("counts whole calendar days, ignoring clock time", () => {
	const start = moment("2026-07-07T23:59:00");
	assert.deepStrictEqual(DaysToEventUtils.countdownLabel(start, now), { value: "2", unit: "days", isWord: false });
});

test("crosses month boundaries correctly", () => {
	const start = moment("2026-08-03T09:00:00");
	assert.deepStrictEqual(DaysToEventUtils.countdownLabel(start, now), { value: "29", unit: "days", isWord: false });
});
