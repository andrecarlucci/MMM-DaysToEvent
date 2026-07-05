# MMM-DaysToEvent — square/tile layout

**Date:** 2026-07-05
**Status:** Approved design, pending implementation plan

## Goal

Change how `modules/MMM-DaysToEvent` displays events. Instead of the inherited
table/list layout (one row per event with symbol · title · time), render a
**wrapping grid of square tiles**, one per event, up to a configurable maximum.

Each tile shows, top to bottom:

1. **Big countdown** — days from today until the event.
   - `today` → the word **"Today"** (no unit)
   - `tomorrow` → the word **"Tomorrow"** (no unit)
   - otherwise → the integer day count as a large number, with a small unit
     label below it (`"day"` when the count is 1, `"days"` otherwise)
2. **Title** — the event description, shortened to `maxTitleLength`.
3. **Date** — the event start date, formatted with `dateFormat` (default
   `"MMM Do"`, e.g. `Jul 12`).

## Context

`modules/MMM-DaysToEvent` is a copy of MagicMirror's default `calendar` module.
Its main file was renamed to `MMM-DaysToEvent.js`, but the code still calls
`Module.register("calendar", …)`. For MagicMirror to load a module from folder
`MMM-DaysToEvent`, the registration name must match the folder name.

The copied module is treated as a **reference** for how a MagicMirror module is
wired, not as code to preserve. We keep only what earns its place.

## Scope

### Keep (the proven fetch engine — do not touch)

- `node_helper.js`, `calendarfetcher.js`, `calendarfetcherutils.js`,
  `calendarutils.js` — the backend ICS fetch pipeline.
- In the main module file, the plumbing that feeds that pipeline:
  `start`, `socketNotificationReceived`, `addCalendars` / `addCalendar`,
  `timestampToMoment`, `getCalendarProperty`, `maximumEntriesForUrl`,
  `maximumPastDaysForUrl`, and the per-calendar config passthrough.
- `createEventList(true)` — retained but simplified. It already sorts events by
  start date, applies `today` / `tomorrow` flags, and slices to
  `maximumEntries`. That slice is the "up to X events" limit — **no new config
  option is added**; `maximumEntries` (default 10) is the cap.

### Replace

- `getDom()` — rewritten to build a `<div>` grid of tiles instead of a
  `<table>`.

### Remove (dead weight for this layout)

- Display helpers no longer referenced: date-header rendering, absolute/relative
  time text builders, symbol rendering, per-calendar color options
  (`colored*`), location rows, repeating-count titles, multi-day slicing display.
- The matching config defaults for the above (symbols, colors, time formats,
  locations, urgency, date-header options, etc.).
- `calendar.css` rules for the old table (`.symbol`, `.title`, `.time`),
  replaced with tile styles.

### Fix

- `Module.register("calendar", …)` → `Module.register("MMM-DaysToEvent", …)`.

## Layout & rendering

`getDom()`:

1. `const events = this.createEventList(true)` — already capped at
   `maximumEntries`.
2. Error state → return a `dimmed` message div with `this.error`.
3. Empty / not-yet-loaded → return a `dimmed` div with `LOADING` / `EMPTY`
   translation.
4. Otherwise build a container `<div class="daystoevent-grid">` (its own class
   only — no `tableClass`) and append one `<div class="daystoevent-tile">` per
   event.

Per-tile content:

- **Countdown value.** `today` → "Today"; `tomorrow` → "Tomorrow"; else
  `days = timestampToMoment(startDate).startOf('day').diff(moment().startOf('day'), 'days')`,
  rendered as the number with a unit label (`day` / `days`). Word cases render
  in a slightly smaller class than the numeric case (matches the mockup).
- **Title.** `CalendarUtils.shorten(event.title, this.config.maxTitleLength)`.
- **Date.** `this.timestampToMoment(event.startDate).format(this.config.dateFormat)`.

### Fade

Preserve the optional `fade` / `fadePoint` behavior: from `fadePoint` through the
end of the list, ramp each tile's `style.opacity` down by index — same formula
as the original, applied to the tile div.

## Styling (`calendar.css`)

- `.daystoevent-grid` — `display:flex; flex-wrap:wrap; gap`, so tiles flow
  left-to-right and wrap to new rows.
- `.daystoevent-tile` — fixed-size square, centered column
  (`display:flex; flex-direction:column; align-items:center; justify-content:center`),
  border + radius + padding.
- Classes for the big number, the unit label, the title, and the date, matching
  the approved "big number focus" mockup (large bold countdown, dimmed uppercase
  unit, bright title, dimmed date).

## Config

Trimmed defaults retained by the module:

- Fetch: `calendars`, `maximumEntries` (10), `maximumNumberOfDays` (365),
  `pastDaysCount` (0), `fetchInterval`, `broadcastEvents`,
  `broadcastPastEvents`, `excludedEvents`, `selfSignedCert`, `hidePrivate`,
  `hideOngoing`, `hideDuplicates`.
- Display: `maxTitleLength` (25), `dateFormat` (`"MMM Do"`), `animationSpeed`,
  `fade` (true), `fadePoint` (0.25), `updateOnFetch`.

Every other key from the copied `calendar` module is removed from `defaults`
(symbols, colors, time formats, urgency, locations, date headers, repeating
counts, `tableClass`, multi-day slicing, etc.). Tile and font sizing lives
entirely in `calendar.css` — no `tableClass` hook. No new config options are
introduced.

## Testing / verification

- `npm run server:watch` with a config that loads `MMM-DaysToEvent`, watching the
  module file; open the browser and confirm the grid renders.
- Verify wording: an event dated today shows "Today", tomorrow shows "Tomorrow",
  and a known future date shows the correct integer day count.
- Verify the grid wraps and honors `maximumEntries`.
- Confirm error and empty/loading states still render as dimmed messages.
