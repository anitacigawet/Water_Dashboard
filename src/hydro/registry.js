export const ADWR_BASIN_LAYER_URL =
  'https://azwatermaps.azwater.gov/arcgis/rest/services/Groundwater_Basin_2025/FeatureServer/0';

export const ADWR_BASIN_GEOJSON_URL =
  `${ADWR_BASIN_LAYER_URL}/query?where=1%3D1&outFields=BASIN_NAME%2CNAME_ABBR%2CBASIN_NAME_GWSI&returnGeometry=true&outSR=4326&f=geojson`;

export const ADWR_AMA_OVERVIEW_URL =
  'https://www.azwater.gov/ama/active-management-area-overview';

export const USGS_WATER_DATA_API_URL =
  'https://api.waterdata.usgs.gov/docs/ogcapi/';

const registrySource = {
  organization: 'Arizona Department of Water Resources',
  title: 'Groundwater Basin 2025',
  url: ADWR_BASIN_LAYER_URL,
};

const entry = (id, name, officialName, type, lat, lon) => ({
  id,
  name,
  officialName,
  type,
  lat,
  lon,
  registrySource,
});

// This is a curated monitoring set, not a claim that Arizona has only 23 basins.
// The officialName values must match ADWR's current Groundwater Basin 2025 layer.
export const BASIN_REGISTRY = [
  entry('phoenix-ama', 'Phoenix AMA', 'PHOENIX AMA', 'AMA', 33.4484, -112.0740),
  entry('pinal-ama', 'Pinal AMA', 'PINAL AMA', 'AMA', 32.8941, -111.5835),
  entry('tucson-ama', 'Tucson AMA', 'TUCSON AMA', 'AMA', 32.2226, -110.9747),
  entry('prescott-ama', 'Prescott AMA', 'PRESCOTT AMA', 'AMA', 34.5400, -112.4685),
  entry('santa-cruz-ama', 'Santa Cruz AMA', 'SANTA CRUZ AMA', 'AMA', 31.4208, -110.9415),
  entry('douglas-ama', 'Douglas AMA', 'DOUGLAS AMA', 'AMA', 31.3444, -109.5445),
  entry('willcox-ama', 'Willcox AMA', 'WILLCOX AMA', 'AMA', 32.2534, -109.8340),
  entry('ranegras-plain-ama', 'Ranegras Plain AMA', 'RANEGRAS PLAIN AMA', 'AMA', 33.5260, -113.6900),

  entry('harquahala-ina', 'Harquahala INA', 'HARQUAHALA INA', 'INA', 33.6455, -113.3150),
  entry('joseph-city-ina', 'Joseph City INA', 'JOSEPH CITY INA', 'INA', 34.9567, -110.3340),
  entry('hualapai-valley-ina', 'Hualapai Valley INA', 'HUALAPAI VALLEY INA', 'INA', 35.6186, -113.8472),

  entry('mcmullen-valley', 'McMullen Valley Basin', 'MCMULLEN VALLEY', 'Basin', 33.8208, -113.3088),
  entry('upper-san-pedro', 'Upper San Pedro Basin', 'UPPER SAN PEDRO', 'Basin', 31.5540, -110.1584),
  entry('lower-san-pedro', 'Lower San Pedro Basin', 'LOWER SAN PEDRO', 'Basin', 32.7354, -110.6626),
  entry('verde-river', 'Verde River Basin', 'VERDE RIVER', 'Basin', 34.7333, -112.0242),
  entry('yuma', 'Yuma Basin', 'YUMA', 'Basin', 32.6927, -114.6277),
  entry('gila-bend', 'Gila Bend Basin', 'GILA BEND', 'Basin', 32.9482, -112.7168),
  entry('coconino-plateau', 'Coconino Plateau Basin', 'COCONINO PLATEAU', 'Basin', 35.7892, -111.7285),
  entry('san-simon-wash', 'San Simon Wash Basin', 'SAN SIMON WASH', 'Basin', 32.3276, -109.1866),
  entry('little-colorado-river-plateau', 'Little Colorado River Plateau Basin', 'LITTLE COLORADO RIVER PLATEAU', 'Basin', 35.0347, -109.8168),
  entry('safford', 'Safford Basin', 'SAFFORD', 'Basin', 32.8339, -109.7076),
  entry('detrital-valley', 'Detrital Valley Basin', 'DETRITAL VALLEY', 'Basin', 35.7958, -114.3931),
  entry('big-sandy', 'Big Sandy Basin', 'BIG SANDY', 'Basin', 34.6225, -113.6274),
];

export const REGISTRY_COUNTS = BASIN_REGISTRY.reduce(
  (counts, basin) => ({ ...counts, [basin.type]: (counts[basin.type] || 0) + 1 }),
  {},
);
