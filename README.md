![Arizona Basin Monitor banner](docs/assets/arizona-basin-monitor-banner.png)

## What is this?

Arizona Basin Monitor is a searchable console for 23 monitored groundwater areas in Arizona. It brings together current management classifications, official basin boundaries, source coverage, dated well readings, and single-well measurement histories in one interface.

The monitor keeps the difference between a basin and a monitoring well visible. When no comparable basin-wide source exists for deficit, depletion, recharge, withdrawal, storage, or supply mix, the field stays **Unavailable** instead of being estimated.

## Who is this for?

- **People checking what public groundwater records say about an Arizona basin.** Find an area, inspect the available reading, and follow it back to the monitoring location.
- **Communities comparing management status and reporting coverage.** See which monitored areas are AMAs, INAs, or other groundwater basins and where observations are available.
- **Reporters, students, and researchers who need the source beside the number.** Export the snapshot without losing observation dates, site IDs, or source links.

## What it does

1. **Search and sort 23 monitored areas.** Use the directory or select an area from the map.
2. **Load official basin geometry.** The map requests the current ADWR Groundwater Basin 2025 layer rather than using hand-drawn boundaries.
3. **Show current management classifications.** The registry contains eight Active Management Areas, three Irrigation Non-Expansion Areas, and twelve additional groundwater basins.
4. **Display dated groundwater observations where available.** Each reading is identified as one well measurement, not a basin average.
5. **Plot a single-well history.** The chart names the USGS monitoring location used for the series.
6. **Leave unsupported basin metrics unavailable.** The interface does not fabricate severity scores, deficits, depletion percentages, supply mixes, or recharge series.
7. **Keep a local watchlist and export CSV.** Watchlist choices stay in the browser, and exported records retain their source and observation fields.

The `Current`, `Dated`, `Stale`, and `No data` labels describe only the age of the newest bundled qualifying well observation. They are project calculations, not ADWR management designations, groundwater-risk ratings, or basin-wide trend judgments. See [Data status](docs/DATA_STATUS.md) for the exact field and time semantics.

## Primary sources

Arizona Basin Monitor uses primary government sources:

- [ADWR Groundwater Basin 2025](https://azwatermaps.azwater.gov/arcgis/rest/services/Groundwater_Basin_2025/FeatureServer/0) for official basin names, classifications, and geometry.
- [ADWR Active Management Area overview](https://www.azwater.gov/ama/active-management-area-overview) for the statewide AMA framework.
- [ADWR Hualapai Valley INA](https://www.azwater.gov/ama/ina/hualapai-ina) for the current designation and court-stay notice.
- [ADWR Groundwater Site Inventory](https://services.arcgis.com/C34zQ7veRS0V1t04/ArcGIS/rest/services/GWSI_Layers/FeatureServer) for aggregate monitoring-site coverage.
- [USGS Water Data APIs](https://api.waterdata.usgs.gov/docs/ogcapi/) for depth-below-land-surface observations and field-measurement histories.
- [ADWR Supply and Demand](https://www.azwater.gov/supply-demand) as a reference for agency basin studies and water budgets where they exist. Those records are not treated as a uniform daily feed.

The bundled snapshot stores source-linked observations, derived map centers, and aggregate site counts. The map requests official ADWR geometry when the application runs. Raw ADWR geometries and site inventories are not bundled in this repository.

## Try it yourself

This repository is a locally runnable copy of Arizona Basin Monitor. It does not require an account or API key. Once it is running, search for Hualapai Valley, switch between Overview, Flows & Sources, and Basin Report, add an area to the watchlist, and export the current snapshot.

## Running locally

You will need [Node.js](https://nodejs.org/) 20.19 or any later 20.x release, or Node.js 22.12 or newer. npm is included with Node.js.

```bash
git clone https://github.com/anitacigawet/Water_Dashboard.git
cd Water_Dashboard
npm ci
npm run dev
```

Open <http://127.0.0.1:3000>.

For a production build:

```bash
npm run build
npm run preview
```

The bundled observation snapshot renders locally. Network access is required to load the official ADWR map geometry.

## Technical details

- React 19 and Vite provide the interface and local development server.
- TypeScript checks the application without changing the JavaScript data modules.
- `src/hydro/registry.js` defines the curated 23-area registry and its official source links.
- `src/hydro/generated/groundwater-snapshot.json` contains the compact, source-linked observation snapshot used at runtime.
- `src/hydro/components/` contains the map, directory, charts, source rail, and timeline.
- `src/hydro.css` contains the console visual system.

To verify the locally runnable source release:

```bash
npm run lint
npm run build
```

ADWR publishes a [GIS data disclaimer](https://www.azwater.gov/gis-data-and-maps). This repository does not grant reuse rights to ADWR or USGS material; review the source terms before redistributing derived data outside this project.

## Credits

Arizona Basin Monitor is directed and maintained by James with assistance from generative AI development tools.

The Arizona Department of Water Resources and U.S. Geological Survey publish the source material used by the monitor. Their inclusion does not imply endorsement, and their data retain their own terms and attribution requirements.

## License

Arizona Basin Monitor is available under the [PolyForm Noncommercial License 1.0.0](LICENSE). Noncommercial use, modification, and redistribution are permitted under that license; commercial use is not granted.
