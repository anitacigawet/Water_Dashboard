# Data status

## Monitored-area boundary

The console contains a curated set of 23 monitored areas: eight Active Management Areas, three Irrigation Non-Expansion Areas, and twelve additional groundwater basins. This is the project's monitoring set, not a claim that ADWR recognizes only 23 groundwater basins statewide.

The registry follows the official naming and classification used by the current ADWR basin layer:

- Douglas, Willcox, and Ranegras Plain are AMAs.
- Hualapai Valley is an INA in the structured ADWR basin layer. ADWR's Hualapai page says the designation order and irrigation restrictions remain in force while appellate review is pending.
- San Simon Wash is represented instead of double-counting the San Simon Valley subbasin inside Safford.
- Little Colorado River Plateau uses the official ADWR name.

## What is displayed

- Official basin names, classifications, and geometry from the ADWR Groundwater Basin 2025 service.
- Derived map reference points from official geometry.
- Aggregate ADWR monitoring-site coverage counts; raw ADWR site records are not stored.
- USGS parameter `72019` depth-below-land-surface readings, including site ID, observation date, approval status, and a direct monitoring-location link.
- A single representative USGS well history when at least two qualifying field measurements are available since 2010. The selected well is named above the chart and is never labeled a basin average.

## What stays unavailable

No uniform primary source currently publishes all of these as comparable daily values for the 23 monitored areas:

- basin-wide annual deficit;
- average annual groundwater decline;
- total aquifer storage capacity;
- percent depleted;
- annual withdrawal and recharge histories;
- current supply mix; or
- a statewide Critical, High, Moderate, or Stable severity classification.

The interface therefore shows an unavailable state for those fields. It does not generate fallback values, convert missing data to zero, or copy a value from another basin.

## Time semantics

The project keeps three timestamps separate:

1. **Observation time** — when a well measurement was made.
2. **Source response or publication time** — when the primary source says its material changed, when available.
3. **Check time** — when the source was successfully retrieved and validated for the bundled snapshot.

A recent source check does not mean the underlying observation is recent. Groundwater measurements and basin reports may be monthly, annual, irregular, or tied to an assessment period.

The interface's observation-age labels are deterministic project calculations based on the newest bundled qualifying well reading at snapshot time:

- `Current`: 30 days old or newer;
- `Dated`: more than 30 days and no more than 365 days old;
- `Stale`: more than 365 days old; and
- `No data`: no qualifying reading was found.

These labels are not published by ADWR or USGS. They do not describe legal status, basin-wide risk, depletion severity, or trend direction.

## Sources and storage

The bundled snapshot is maintained from the primary sources cited in the [README](../README.md). Source-backed changes are checked for expected fields, managed-area classifications, observation types, dates, provenance, and the project's storage boundary before inclusion.

The application requests official ADWR geometry directly for the map. Raw ADWR geometries and site records are not committed to this repository. The snapshot stores derived map centers, aggregate coverage counts, source links, and USGS well observations used by the interface.

Any future basin-wide metric must include its primary source, unit, geographic definition, observation or reporting period, publication date, retrieval date, and reproducible derivation method before it is displayed.

ADWR's [GIS data page and disclaimer](https://www.azwater.gov/gis-data-and-maps) apply independently of this repository's code license. Review source terms before redistributing ADWR-derived material outside this project.
