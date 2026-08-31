# Contributing to Arizona Basin Monitor

Contributions that improve clarity, accessibility, responsive behavior, testing, or the source-verification workflow are welcome.

## Data contributions

Do not add a plausible-looking number without a complete source trail. Each proposed metric must include:

- the authoritative source and direct source location;
- the measurement date or reporting period;
- the unit and any conversion performed;
- the basin definition used by the source;
- the calculation or methodology when the value is derived;
- enough provenance for another person to reproduce the result.

If a source does not provide the requested number, the interface should show that the value is unavailable. Zero is a measurement and must not be used as a stand-in for missing data.

## Pull requests

Keep changes focused and run:

```bash
npm run lint
npm run build
npm run data:validate
npm run sources:check
```

User-facing language must continue to distinguish individual well observations, basin-wide measures, unavailable fields, and planned features.

This is a portfolio project maintained as interest allows. Issues and pull requests may be discussed, declined, or left open, and no support or response time is promised. Contributions are licensed under the repository's [PolyForm Noncommercial License 1.0.0](LICENSE).
