# Module: MMM-DaysToEvent

Displays upcoming events from public `.ical` calendars as a wrapping grid of
square tiles. Each tile shows, top to bottom:

- the **days until** the event — a big number with a `days` label, or the word
  **Today** / **Tomorrow** for those cases;
- the **event title** (shortened to `maxTitleLength`);
- the **date** (formatted with `dateFormat`, e.g. `Jul 12th`).

Up to `maximumEntries` tiles are shown, soonest first. Derived from the default
MagicMirror² `calendar` module; the ICS fetch pipeline is unchanged, while the
display was rewritten and all unused options (symbols, colours, per-event time
formats, locations, event broadcasting) were removed.

## Installation

Clone into your MagicMirror `modules/` directory, then add a module entry to
`config/config.js`:

```javascript
{
    module: "MMM-DaysToEvent",
    position: "top_left",
    config: {
        maximumEntries: 6,
        calendars: [
            { url: "https://www.calendarlabs.com/templates/ical/US-Holidays.ics" }
        ]
    }
},
```

## Configuration options

| Option                | Default          | Description                                                        |
| --------------------- | ---------------- | ------------------------------------------------------------------ |
| `calendars`           | US Holidays      | Array of `{ url, ... }` iCal sources.                              |
| `maximumEntries`      | `10`             | Maximum number of tiles to show (the "up to X events" cap).       |
| `maximumNumberOfDays` | `365`            | How far ahead to fetch events.                                     |
| `maxTitleLength`      | `45`             | Title is shortened to this many characters (wraps up to 3 lines).  |
| `dateFormat`          | `"ddd - MMM Do"` | moment.js format for the tile date (e.g. `Tue - Jul 7th`).         |
| `dateRangeFormat`     | `"MMM Do"`       | Format for each end of a multi-day "Today" event's range (e.g. `Jul 4th - Aug 16th`). |
| `marginTop`           | `0`              | Outer margin (px) above the grid.                                  |
| `marginRight`         | `0`              | Outer margin (px) right of the grid.                               |
| `marginBottom`        | `0`              | Outer margin (px) below the grid.                                  |
| `marginLeft`          | `0`              | Outer margin (px) left of the grid.                                |
| `fade` / `fadePoint`  | `true` / `0.25`  | Fade later tiles; ramp starts at this fraction of the list.        |
| `fetchInterval`       | `3600000`        | How often (ms) to refetch calendars.                               |

## Development

Unit tests for the countdown logic use Node's built-in test runner (no extra
dependencies; `moment` is resolved from the host MagicMirror install):

```bash
node --test
```

## Links

- [MagicMirror²](https://github.com/MagicMirrorOrg/MagicMirror) — the smart mirror platform this module runs on.
- [MMM-DailyDilbert](https://github.com/andrecarlucci/MMM-DailyDilbert) — another module of mine.

## License

MIT — see [LICENSE](LICENSE). Derived from the default MagicMirror² `calendar`
module (also MIT).
