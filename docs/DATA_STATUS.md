# Data status and replacement plan

## Current status

All 23 entries in `src/data/basins.ts` are demonstration records.

- `generateHistory()` creates the 1990–2024 series with a sine wave, linear adjustment, and random noise.
- `currentDeficit`, `avgYearlyDecline`, `totalStorageCapacity`, and `percentDepleted` are unverified placeholders.
- All water-source percentages are unverified placeholders.
- Severity labels are demonstrations derived from those placeholders, not independent findings.
- Coordinates and AMA/INA/Other classifications have not completed a public-source verification pass in this repository.

The interface therefore carries a permanent warning and labels its metrics as demonstrations.

## Replacement standard

A basin may move from demonstration data to verified data only when every displayed field records:

1. source organization and document or dataset title;
2. direct source URL or durable identifier;
3. publication and measurement dates;
4. unit and geographic definition;
5. extraction or calculation method;
6. reviewer notes for ambiguity or disagreement;
7. a machine-readable provenance record kept alongside the value.

Missing values should remain visibly unavailable. They must not be converted to zero or inferred from another basin.

## Intended source classes

The planned verification pass prioritizes primary and authoritative material such as Arizona Department of Water Resources management plans and basin reports, USGS groundwater measurements and studies, and current state regulatory records. News coverage may help identify questions but should not replace the underlying technical or legal source.

## Proposed sequence

The Hualapai Valley entry is a natural first integration because the related Save Mohave Water project has already assembled source material for that basin. After the complete provenance format is proven on one basin, the same shape can be applied to the major AMAs, remaining INAs, and other basins.

Until that work is complete, the repository should be described as an interface and data-model prototype—not a groundwater monitor or live data product.
