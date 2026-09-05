# Start here

This file is the durable entry point for an AI or developer taking over Arizona Basin Monitor.

## First actions

1. Read `AGENTS.md`, `README.md`, and `docs/DATA_STATUS.md` completely.
2. Run `git status --short --branch`, `git rev-parse HEAD`, and `git rev-parse origin/main` before assuming the checkout is current or clean.
3. Read `package.json` and the source files relevant to the requested change.
4. Run `npm ci` if dependencies are missing or the lockfile changed.
5. Establish what James wants changed before expanding the scope.

Do not rely on an earlier chat transcript as the source of truth when the repository can answer the question directly.

## What this repository contains

Arizona Basin Monitor is a client-side React 19 and Vite application for exploring a curated set of 23 Arizona groundwater areas. It combines:

- a curated registry of monitored areas and official source links;
- a tracked, source-linked groundwater snapshot;
- official ADWR basin geometry requested at runtime;
- search, filtering, map selection, single-well history, a local browser watchlist, and CSV export; and
- explicit unavailable states where no comparable basin-wide primary-source value exists.

There is no server application, account system, database, API key, or secret required to run this checkout.

## Source map

- `src/main.tsx` — browser entry point and font/style imports.
- `src/App.jsx` — application state, navigation, selection, watchlist, export, and detail/report composition.
- `src/hydro/registry.js` — the curated 23-area registry, classifications, reference points, and official endpoints.
- `src/hydro/data.js` — joins the registry with the bundled snapshot for runtime use.
- `src/hydro/generated/groundwater-snapshot.json` — versioned runtime observations and source metadata. Keep this file tracked.
- `src/hydro/components/map.jsx` — ADWR geometry request, SVG projection, selection, and geometry failure state.
- `src/hydro/components/charts.jsx` — single-well depth history and unavailable panels for unsupported metrics.
- `src/hydro/components/panels.jsx` — directory, source rail, data-state indicators, and timeline controls.
- `src/hydro/tweaks-panel.jsx` — visible theme, density, and chart controls.
- `src/hydro.css` — the interface visual system and responsive layout.
- `docs/DATA_STATUS.md` — canonical public explanation of field meanings, source coverage, unavailable values, and timestamps.

## Establish current state

Do not freeze transient status into this file. Verify it directly:

```bash
git fetch --prune origin
git status --short --branch
git rev-parse HEAD
git rev-parse origin/main
```

Confirm dependency, source-data, and runtime state with the checks below. Do not assume a deployment is online, a scheduled process is healthy, or a security audit is complete without current evidence. No completed security report is stored in this repository, so absence of a finding is not security clearance.

## Maintainer operations boundary

The public repository intentionally excludes source-refresh orchestration, browser QA automation, scheduling, VPS publication, and rollback tooling. Those systems live outside this public tree and may not exist in a standalone clone.

Do not search for or modify adjacent private operations unless the requested task requires it and current authorization permits it. Do not copy private implementation details into this public repository.

## Run and verify

```bash
npm ci
npm run dev
```

The development server binds to `http://127.0.0.1:3000`. The bundled snapshot works locally; the map needs network access to retrieve official ADWR geometry.

For the repository's available static checks:

```bash
npm run lint
npm run build
git diff --check
```

There is no automated test-suite command in this public checkout. If behavior changes, verify the affected browser workflow and state exactly what was tested.

## Fresh AI handoff

A fresh AI should confirm that it read the four files required by `AGENTS.md`, report the current Git and verification state, distinguish verified facts from assumptions, and ask James what to work on next. It should not infer an application task from this document.
