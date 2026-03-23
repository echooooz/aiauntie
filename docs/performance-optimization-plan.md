# Performance Optimization Plan

## Goal

Keep AiAuntie responsive after months of records, especially on app startup, timeline rendering, and the stats page.

## Why the app slows down today

### 1. Startup is synchronous

The app loads all saved records from `localStorage` during initial render and parses the full JSON payload before the first meaningful paint.

### 2. Every write rewrites the whole dataset

Each record change triggers full-array serialization and a full `localStorage` write.

### 3. Stats does repeated full-history scans

The stats page loops through all days and repeatedly filters the full record list per day, which compounds as data grows.

### 4. Timeline renders everything

The home view renders every historical item at once, groups everything in memory, and sorts repeatedly.

### 5. Date parsing is repeated everywhere

The UI frequently calls `new Date(...)`, `toDateString()`, and `toLocale...()` inside render paths.

## What to optimize first

1. Data access
2. Stats aggregation
3. Timeline rendering
4. Date normalization
5. Instrumentation

## Step-by-step plan

### Step 1: Establish a repeatable benchmark

- Use reusable mock datasets for `10`, `30`, `90`, and `180` days.
- Measure:
  - app startup time
  - stats page switch time
  - timeline scroll smoothness
  - total record count in each dataset

Suggested metrics:

- time from app open to first interactive render
- time from tapping `Stats` to chart visible
- total records loaded

### Step 2: Normalize event data

- Add derived fields when records are created or imported:
  - `timestampMs`
  - `dayKey`
- Stop recomputing these inside render loops.

Expected impact:

- lower CPU cost across timeline and stats

### Step 3: Move away from localStorage as the primary growing store

Preferred order:

1. IndexedDB for local-first MVP
2. Postgres or equivalent when multi-device sync is introduced

Important note:

- moving storage alone will not fix stats if the UI still loads and scans everything

### Step 4: Introduce a repository/query layer

Replace "read all records into UI state" with query methods:

- `getRecentEvents(days)`
- `getEventsByDay(dayKey)`
- `getDailyMetrics(range)`
- `getTimelinePage(cursor, limit)`

Expected impact:

- smaller in-memory working set
- cleaner future migration to server-side APIs

### Step 5: Precompute daily metrics

On create/update/delete of a record:

- update one day's summary row instead of recomputing all days in the stats component

Metrics to store:

- bottle total ml
- nursing minutes
- pumping total ml
- feed count
- diaper counts by type
- sleep total minutes

Expected impact:

- stats page becomes mostly a read of compact daily summaries

### Step 6: Paginate or virtualize the timeline

Short term:

- load only recent days first

Preferred:

- virtualized list for timeline records

Expected impact:

- reduced initial DOM size
- smoother scroll

### Step 7: Cache and memoize formatting safely

- format timestamps once per record, not many times per render
- avoid sorting nested arrays during render
- compute grouped timeline data outside leaf rendering

### Step 8: Add performance instrumentation

Track:

- total record count
- startup duration
- stats query duration
- timeline render duration

This can begin as simple console timing in development.

## Execution order for the next implementation cycle

1. Add reusable mock datasets and a local preview flow
2. Add benchmark measurements
3. Normalize event fields
4. Refactor stats to consume daily summaries
5. Refactor storage behind a repository
6. Replace localStorage with IndexedDB
7. Add timeline pagination or virtualization
8. Consider backend sync after local performance is stable

## Success criteria

- `90`-day dataset remains comfortably usable on startup
- switching to `Stats` feels immediate
- scrolling timeline does not degrade with historical depth
- mock data can be reused for future regression testing

