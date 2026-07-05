# MMM-DaysToEvent Square Layout Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace MMM-DaysToEvent's inherited table layout with a wrapping grid of square tiles, each showing a big days-until countdown, the event title, and the date.

**Architecture:** Keep the proven backend fetch pipeline (`node_helper.js` + `calendarfetcher*.js` + `calendarutils.js`) and the module's socket/config plumbing untouched. Extract the countdown-label logic into a small, node-testable helper (`daystoeventutils.js`). Rewrite `getDom()` to build a `<div>` grid using that helper. Trim the module's `defaults` and delete the now-dead display helpers. Restyle in `calendar.css`.

**Tech Stack:** MagicMirror² module (browser JS via `Module.register`), moment.js / moment-timezone, Vitest (node environment) for unit tests.

## Global Constraints

- Module registration name MUST be `"MMM-DaysToEvent"` (matches the folder), not `"calendar"`.
- No new config options. The "up to X events" cap is the existing `maximumEntries` (default 10).
- Countdown wording (Style 1): today → `"Today"`, tomorrow → `"Tomorrow"`, otherwise the integer day count with unit `"day"` (count 1) / `"days"` (otherwise).
- Do NOT modify `node_helper.js`, `calendarfetcher.js`, `calendarfetcherutils.js`, or `calendarutils.js`.
- Helper files must use the dual browser/node export pattern already used in `calendarutils.js`: define a global object, then `if (typeof module !== "undefined") { module.exports = X; }`.
- Unit tests live under `tests/unit/**/*_spec.js` and run in a **node** environment (no DOM). Only pure logic is unit-tested; the DOM rendering is verified visually.

---

### Task 1: Countdown helper + unit tests

**Files:**
- Create: `modules/MMM-DaysToEvent/daystoeventutils.js`
- Test: `tests/unit/modules/MMM-DaysToEvent/daystoeventutils_spec.js`

**Interfaces:**
- Produces: `DaysToEventUtils.countdownLabel(startMoment, nowMoment)` where both args are moment objects. Returns `{ value: string, unit: string | null, isWord: boolean }`:
  - same calendar day as now → `{ value: "Today", unit: null, isWord: true }`
  - next calendar day → `{ value: "Tomorrow", unit: null, isWord: true }`
  - otherwise → `{ value: String(days), unit: days === 1 ? "day" : "days", isWord: false }` where `days` is the whole-day difference `startMoment.startOf("day") − nowMoment.startOf("day")`.

- [ ] **Step 1: Write the failing test**

Create `tests/unit/modules/MMM-DaysToEvent/daystoeventutils_spec.js`:

```javascript
global.moment = require("moment");

const DaysToEventUtils = require("../../../../modules/MMM-DaysToEvent/daystoeventutils");

describe("DaysToEventUtils.countdownLabel", () => {
	const now = moment("2026-07-05T09:00:00");

	it("returns the word 'Today' for an event later the same day", () => {
		const start = moment("2026-07-05T20:00:00");
		expect(DaysToEventUtils.countdownLabel(start, now)).toEqual({ value: "Today", unit: null, isWord: true });
	});

	it("returns the word 'Tomorrow' for the next calendar day", () => {
		const start = moment("2026-07-06T01:00:00");
		expect(DaysToEventUtils.countdownLabel(start, now)).toEqual({ value: "Tomorrow", unit: null, isWord: true });
	});

	it("returns a number with plural unit for 7 days out", () => {
		const start = moment("2026-07-12T09:00:00");
		expect(DaysToEventUtils.countdownLabel(start, now)).toEqual({ value: "7", unit: "days", isWord: false });
	});

	it("counts whole calendar days, ignoring clock time", () => {
		const start = moment("2026-07-07T23:59:00");
		expect(DaysToEventUtils.countdownLabel(start, now)).toEqual({ value: "2", unit: "days", isWord: false });
	});

	it("crosses month boundaries correctly", () => {
		const start = moment("2026-08-03T09:00:00");
		expect(DaysToEventUtils.countdownLabel(start, now)).toEqual({ value: "29", unit: "days", isWord: false });
	});
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/unit/modules/MMM-DaysToEvent/daystoeventutils_spec.js`
Expected: FAIL — cannot find module `daystoeventutils`.

- [ ] **Step 3: Write minimal implementation**

Create `modules/MMM-DaysToEvent/daystoeventutils.js`:

```javascript
const DaysToEventUtils = {

	/**
	 * Build the countdown label for an event tile.
	 * @param {object} startMoment moment for the event start
	 * @param {object} nowMoment moment for "now"
	 * @returns {{value: string, unit: (string|null), isWord: boolean}} the label parts
	 */
	countdownLabel (startMoment, nowMoment) {
		const days = startMoment.clone().startOf("day").diff(nowMoment.clone().startOf("day"), "days");

		if (days === 0) {
			return { value: "Today", unit: null, isWord: true };
		}
		if (days === 1) {
			return { value: "Tomorrow", unit: null, isWord: true };
		}
		return { value: String(days), unit: days === 1 ? "day" : "days", isWord: false };
	}
};

if (typeof module !== "undefined") {
	module.exports = DaysToEventUtils;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/unit/modules/MMM-DaysToEvent/daystoeventutils_spec.js`
Expected: PASS — 5 passed.

- [ ] **Step 5: Commit**

```bash
git add modules/MMM-DaysToEvent/daystoeventutils.js tests/unit/modules/MMM-DaysToEvent/daystoeventutils_spec.js
git commit -m "feat(MMM-DaysToEvent): add countdown-label helper with tests"
```

---

### Task 2: Rewrite the module front-end (register, defaults, scripts, getDom)

**Files:**
- Modify: `modules/MMM-DaysToEvent/MMM-DaysToEvent.js`

**Interfaces:**
- Consumes: `DaysToEventUtils.countdownLabel(startMoment, nowMoment)` from Task 1; existing `this.createEventList(true)`, `this.timestampToMoment(ts)`, and `CalendarUtils.shorten(title, maxLength)`.

- [ ] **Step 1: Fix the registration name**

In `modules/MMM-DaysToEvent/MMM-DaysToEvent.js` line 3, change:

```javascript
Module.register("calendar", {
```

to:

```javascript
Module.register("MMM-DaysToEvent", {
```

- [ ] **Step 2: Replace the `defaults` block**

Replace the entire `defaults: { … }` object (currently lines 5–69) with this trimmed set:

```javascript
	defaults: {
		maximumEntries: 10, // Total maximum tiles to show
		maximumNumberOfDays: 365,
		pastDaysCount: 0,
		maxTitleLength: 25,
		dateFormat: "MMM Do",
		fetchInterval: 60 * 60 * 1000, // Update every hour
		animationSpeed: 2000,
		fade: true,
		fadePoint: 0.25, // Start fading at 1/4th of the list
		hidePrivate: false,
		hideOngoing: false,
		hideDuplicates: true,
		calendars: [
			{
				url: "https://www.calendarlabs.com/templates/ical/US-Holidays.ics"
			}
		],
		excludedEvents: [],
		broadcastEvents: true,
		broadcastPastEvents: false,
		selfSignedCert: false,
		updateOnFetch: true
	},
```

- [ ] **Step 3: Update `getStyles` and `getScripts`**

Replace `getStyles` (drop font-awesome — no symbols):

```javascript
	getStyles () {
		return ["calendar.css"];
	},
```

Replace `getScripts` (add the helper):

```javascript
	getScripts () {
		return ["calendarutils.js", "daystoeventutils.js", "moment.js", "moment-timezone.js"];
	},
```

- [ ] **Step 4: Replace `getDom()`**

Replace the entire `getDom () { … }` method (currently starting at line 227, ending at the method's closing brace before the next method) with:

```javascript
	getDom () {
		const events = this.createEventList(true);
		const wrapper = document.createElement("div");
		wrapper.className = "daystoevent-grid";

		if (this.error) {
			wrapper.innerHTML = this.error;
			wrapper.className = "daystoevent-grid dimmed";
			return wrapper;
		}

		if (events.length === 0) {
			wrapper.innerHTML = this.loaded ? this.translate("EMPTY") : this.translate("LOADING");
			wrapper.className = "daystoevent-grid dimmed";
			return wrapper;
		}

		let startFade;
		let fadeSteps;
		if (this.config.fade && this.config.fadePoint < 1) {
			if (this.config.fadePoint < 0) this.config.fadePoint = 0;
			startFade = events.length * this.config.fadePoint;
			fadeSteps = events.length - startFade;
		}

		const now = moment();

		events.forEach((event, index) => {
			const startMoment = this.timestampToMoment(event.startDate);

			const tile = document.createElement("div");
			tile.className = "daystoevent-tile";

			const countdown = DaysToEventUtils.countdownLabel(startMoment, now);
			const countEl = document.createElement("div");
			if (countdown.isWord) {
				countEl.className = "daystoevent-count word";
				countEl.innerHTML = countdown.value;
			} else {
				countEl.className = "daystoevent-count";
				const number = document.createElement("div");
				number.className = "daystoevent-number";
				number.innerHTML = countdown.value;
				const unit = document.createElement("div");
				unit.className = "daystoevent-unit";
				unit.innerHTML = countdown.unit;
				countEl.appendChild(number);
				countEl.appendChild(unit);
			}
			tile.appendChild(countEl);

			const title = document.createElement("div");
			title.className = "daystoevent-title";
			title.innerHTML = CalendarUtils.shorten(event.title, this.config.maxTitleLength);
			tile.appendChild(title);

			const date = document.createElement("div");
			date.className = "daystoevent-date";
			date.innerHTML = startMoment.format(this.config.dateFormat);
			tile.appendChild(date);

			if (this.config.fade && index >= startFade) {
				tile.style.opacity = 1 - (1 / fadeSteps) * (index - startFade);
			}

			wrapper.appendChild(tile);
		});

		return wrapper;
	},
```

- [ ] **Step 5: Delete the now-dead display helpers**

Delete these methods from `MMM-DaysToEvent.js` (they were only used by the old table `getDom`). Search each by name and remove the whole method:

- `renderDateHeadersEventTime`
- `buildAbsoluteTimeText`
- `buildRelativeTimeText`
- `symbolsForEvent`
- `symbolClassForUrl`
- `titleClassForUrl`
- `timeClassForUrl`
- `colorForUrl`
- `countTitleForUrl`

Keep everything else (`start`, `socketNotificationReceived`, `addCalendars`, `addCalendar`, `createEventList`, `timestampToMoment`, `getCalendarProperty`, `maximumEntriesForUrl`, `maximumPastDaysForUrl`, and any method still referenced by them).

- [ ] **Step 6: Verify nothing references a deleted method or removed config**

Run: `cd /Users/andrecarlucci/dev/MagicMirror && grep -nE "renderDateHeadersEventTime|buildAbsoluteTimeText|buildRelativeTimeText|symbolsForEvent|symbolClassForUrl|titleClassForUrl|timeClassForUrl|colorForUrl|countTitleForUrl|this\.config\.(colored|displaySymbol|timeFormat|showLocation|urgency|customEvents|tableClass)" modules/MMM-DaysToEvent/MMM-DaysToEvent.js`
Expected: no output (all references gone).

Note: `createEventList` may still reference `this.config.sliceMultiDayEvents` / `limitDays`; those simply evaluate falsy now and are harmless. Do not rewrite `createEventList`.

- [ ] **Step 7: Lint the file**

Run: `cd /Users/andrecarlucci/dev/MagicMirror && npx eslint modules/MMM-DaysToEvent/MMM-DaysToEvent.js`
Expected: no errors. Fix any that appear (e.g. unused vars from deletions).

- [ ] **Step 8: Commit**

```bash
git add modules/MMM-DaysToEvent/MMM-DaysToEvent.js
git commit -m "feat(MMM-DaysToEvent): render events as square tiles"
```

---

### Task 3: Tile styling

**Files:**
- Modify: `modules/MMM-DaysToEvent/calendar.css`

- [ ] **Step 1: Replace the stylesheet**

Replace the entire contents of `modules/MMM-DaysToEvent/calendar.css` with:

```css
.daystoevent-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
  justify-content: flex-start;
}

.daystoevent-tile {
  box-sizing: border-box;
  width: 140px;
  height: 140px;
  padding: 10px;
  border: 1px solid #333;
  border-radius: 10px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
}

.daystoevent-count {
  color: #fff;
}

.daystoevent-number {
  font-size: 44px;
  font-weight: 700;
  line-height: 1;
}

.daystoevent-count.word {
  font-size: 30px;
  font-weight: 700;
  line-height: 1;
}

.daystoevent-unit {
  font-size: 12px;
  text-transform: uppercase;
  letter-spacing: 1px;
  color: #999;
  margin-top: 2px;
}

.daystoevent-title {
  font-size: 14px;
  color: #ddd;
  margin-top: 10px;
}

.daystoevent-date {
  font-size: 11px;
  color: #888;
  margin-top: 3px;
}
```

- [ ] **Step 2: Commit**

```bash
git add modules/MMM-DaysToEvent/calendar.css
git commit -m "style(MMM-DaysToEvent): tile grid styles"
```

---

### Task 4: Visual verification + docs

**Files:**
- Modify: `modules/MMM-DaysToEvent/README.md`

- [ ] **Step 1: Add the module to a dev config**

Ensure `config/config.js` has a module entry (create the file from `config/config.js.sample` if missing):

```javascript
{
	module: "MMM-DaysToEvent",
	position: "top_left",
	config: {
		maximumEntries: 6
	}
},
```

Add `"config/config.js"` to a `watchTargets` array in the same config, plus `"modules/MMM-DaysToEvent/MMM-DaysToEvent.js"` and `"modules/MMM-DaysToEvent/calendar.css"`.

- [ ] **Step 2: Run the watch server**

Run: `cd /Users/andrecarlucci/dev/MagicMirror && npm run server:watch`
Open `http://localhost:8080` in a browser.

- [ ] **Step 3: Verify behavior**

Confirm, in the browser:
- Events render as a wrapping grid of square tiles (not a table).
- No more than `maximumEntries` (6) tiles show.
- The countdown reads a big number + "days", or "Today"/"Tomorrow" for those cases.
- Each tile shows the shortened title and the formatted date (e.g. `Jul 12`).
- With no events yet, a dimmed "Loading…"/"No upcoming events" message shows.

- [ ] **Step 4: Update the README**

Replace `modules/MMM-DaysToEvent/README.md` contents with:

```markdown
# Module: MMM-DaysToEvent

Displays upcoming events from public .ical calendars as a wrapping grid of
square tiles. Each tile shows the number of days until the event ("Today" /
"Tomorrow" for the near cases), the event title, and its date.

Shows up to `maximumEntries` tiles. Derived from the default MagicMirror²
`calendar` module.
```

- [ ] **Step 5: Run the full unit suite**

Run: `cd /Users/andrecarlucci/dev/MagicMirror && npx vitest run tests/unit/modules/MMM-DaysToEvent/daystoeventutils_spec.js`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add modules/MMM-DaysToEvent/README.md
git commit -m "docs(MMM-DaysToEvent): describe tile layout"
```
