# Data status

## Current operational boundary

The console contains a curated set of 23 monitored areas: eight Active Management Areas, three Irrigation Non-Expansion Areas, and twelve additional groundwater basins. This is the project’s monitoring set, not a claim that ADWR recognizes only 23 groundwater basins statewide.

The current registry corrects the earlier interface’s classifications and names:

- Douglas and Willcox are AMAs.
- Ranegras Plain is included as an AMA.
- Hualapai Valley remains an INA in the structured ADWR basin layer. ADWR's current Hualapai page says the designation order and irrigation restrictions remain in force while appellate review is pending; that legal posture must be reviewed manually if the page changes.
- San Simon Wash is used instead of double-counting the San Simon Valley subbasin inside Safford.
- Little Colorado River Plateau uses the official ADWR name.

## What is displayed

- Official basin names, classifications, and geometry from the ADWR Groundwater Basin 2025 service.
- Derived map reference points from official geometry.
- Aggregate ADWR telemetry-site coverage counts; raw ADWR site records are not stored.
- USGS parameter `72019` depth-below-land-surface readings, including site ID, observation date, approval status, and direct monitoring-location link.
- A single representative USGS well history when at least two static or unqualified field measurements are available since 2010. The selected well is named above the chart and is never labeled a basin average.

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
3. **Check time** — when this repository successfully fetched and validated the source.

A daily source check does not mean the underlying observation is daily. Many groundwater measurements and basin reports are monthly, annual, irregular, or assessment-period records.

The interface's observation-age labels are deterministic project calculations based on the newest bundled qualifying well reading at snapshot time:

- `Current`: 30 days old or newer;
- `Dated`: more than 30 days and no more than 365 days old;
- `Stale`: more than 365 days old; and
- `No data`: no qualifying reading was found.

These labels are not published by ADWR or USGS. They do not describe legal status, basin-wide risk, depletion severity, or trend direction.

## Refresh and validation

Run:

```bash
npm run data:refresh
npm run data:validate
npm run sources:check
```

`data:refresh` validates all 23 registry names against official ADWR geometry, spatially joins source observations, selects representative single-well histories, and writes `src/hydro/generated/groundwater-snapshot.json`.

`data:validate` asserts the 8/3/12 registry split, unique IDs and official names, exact stored-object keys, coverage values, observation types and timestamps, source links, and the absence of unexpected raw ADWR payload fields from the snapshot.

`sources:check` validates endpoint availability and expected schema for:

- ADWR Groundwater Basin 2025;
- ADWR Groundwater Subbasin 2024;
- ADWR Groundwater Site Inventory layers; and
- USGS Water Data OGC collections.

The basin-layer check also requires exact set equality for the eight AMA and three INA names and abbreviations. A missing, added, or reclassified managed area fails the required check. The checker attempts additional narrative-page confirmations, including Hualapai's pending-appeal notice, but reports those as advisory when ADWR blocks automated page requests. It never reclassifies a basin from narrative text automatically.

The scheduled workflow runs that health check and builds a refreshed snapshot candidate once per day with read-only repository permissions. Its semantic comparison ignores retrieval-only timestamps but retains source record counts, observations, coverage, classifications, and age-based data-state changes. It uploads the small aggregate report and candidate snapshot for review; it does not commit, deploy, open issues, or publish changed data automatically.

## Source and storage policy

The project requests official ADWR geometry directly for the map and uses it transiently during the refresh spatial join. Raw ADWR geometries and site records are not committed to this repository. The generated snapshot stores derived map centers, aggregate coverage counts, and source links. Numeric well observations displayed by the console come from USGS.

Any future basin-wide metric must include its primary source, unit, geographic definition, observation or reporting period, publication date, retrieval date, and reproducible derivation method before it is rendered.

ADWR's [GIS data page and disclaimer](https://www.azwater.gov/gis-data-and-maps) apply independently of this repository's code license. Review source terms before redistributing ADWR-derived material outside this project.
