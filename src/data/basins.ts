export type Status = 'AMA' | 'INA' | 'Other';
export type Severity = 'Critical' | 'High' | 'Moderate' | 'Stable';

export interface HistoricalDataPoint {
  year: number;
  depthToWaterFs: number; // Feet below land surface
  rechargeAcreFt: number; // Acre-feet
  withdrawalAcreFt: number; // Acre-feet
}

export interface Basin {
  id: string;
  name: string;
  status: Status;
  severity: Severity;
  lat: number;
  lon: number;
  metrics: {
    currentDeficit: number; // Acre-feet per year
    avgYearlyDecline: number; // Feet per year
    totalStorageCapacity: number; // Acre-feet
    percentDepleted: number; // 0-100
  };
  waterSources: {
    groundwater: number; // percentage
    surfaceWater: number; // percentage
    coloradoRiver: number; // percentage (CAP mostly)
    effluent: number; // percentage
  };
  history: HistoricalDataPoint[];
}

const generateHistory = (
  startDepth: number,
  yearlyDeclineAvg: number,
  volatility: number,
  baseWithdrawal: number,
  baseRecharge: number
): HistoricalDataPoint[] => {
  const data: HistoricalDataPoint[] = [];
  let depth = startDepth;
  for (let year = 1990; year <= 2024; year++) {
    const droughtFactor = Math.sin(year * 0.2) * 0.5 + 0.5; // Simulate drought cycles
    const withdrawal = baseWithdrawal * (1 + droughtFactor * 0.2 + (year - 1990) * 0.01);
    const recharge = baseRecharge * (1 - droughtFactor * 0.3);

    // Some noise
    const decline = yearlyDeclineAvg + (Math.random() - 0.5) * volatility + ((withdrawal - recharge) / 1000000);
    depth += decline;

    // Prevent negative depth (above ground)
    if (depth < 0) depth = 10;

    data.push({
      year,
      depthToWaterFs: Number(depth.toFixed(1)),
      withdrawalAcreFt: Math.round(withdrawal),
      rechargeAcreFt: Math.round(recharge),
    });
  }
  return data;
};

export const basins: Basin[] = [
  // AMAs
  {
    id: 'phoenix-ama', name: 'Phoenix AMA', status: 'AMA', severity: 'High',
    lat: 33.4484, lon: -112.0740,
    metrics: { currentDeficit: 85000, avgYearlyDecline: 2.1, totalStorageCapacity: 45000000, percentDepleted: 32 },
    waterSources: { groundwater: 44, surfaceWater: 18, coloradoRiver: 30, effluent: 8 },
    history: generateHistory(150, 1.8, 1.2, 1100000, 1000000),
  },
  {
    id: 'pinal-ama', name: 'Pinal AMA', status: 'AMA', severity: 'Critical',
    lat: 32.8941, lon: -111.5835,
    metrics: { currentDeficit: 120000, avgYearlyDecline: 3.5, totalStorageCapacity: 25000000, percentDepleted: 58 },
    waterSources: { groundwater: 75, surfaceWater: 5, coloradoRiver: 18, effluent: 2 },
    history: generateHistory(200, 3.2, 1.5, 950000, 800000),
  },
  {
    id: 'tucson-ama', name: 'Tucson AMA', status: 'AMA', severity: 'Moderate',
    lat: 32.2226, lon: -110.9747,
    metrics: { currentDeficit: 25000, avgYearlyDecline: 0.8, totalStorageCapacity: 35000000, percentDepleted: 25 },
    waterSources: { groundwater: 52, surfaceWater: 0, coloradoRiver: 38, effluent: 10 },
    history: generateHistory(220, 0.5, 0.8, 350000, 330000),
  },
  {
    id: 'prescott-ama', name: 'Prescott AMA', status: 'AMA', severity: 'High',
    lat: 34.5400, lon: -112.4685,
    metrics: { currentDeficit: 15000, avgYearlyDecline: 2.5, totalStorageCapacity: 8000000, percentDepleted: 41 },
    waterSources: { groundwater: 85, surfaceWater: 10, coloradoRiver: 0, effluent: 5 },
    history: generateHistory(180, 2.2, 1.0, 45000, 32000),
  },
  {
    id: 'santa-cruz-ama', name: 'Santa Cruz AMA', status: 'AMA', severity: 'Moderate',
    lat: 31.4208, lon: -110.9415,
    metrics: { currentDeficit: 5000, avgYearlyDecline: 0.9, totalStorageCapacity: 5000000, percentDepleted: 18 },
    waterSources: { groundwater: 60, surfaceWater: 35, coloradoRiver: 0, effluent: 5 },
    history: generateHistory(80, 0.4, 0.5, 25000, 26000),
  },

  // INAs
  {
    id: 'douglas-ina', name: 'Douglas INA', status: 'INA', severity: 'High',
    lat: 31.3444, lon: -109.5445,
    metrics: { currentDeficit: 12000, avgYearlyDecline: 1.8, totalStorageCapacity: 6000000, percentDepleted: 30 },
    waterSources: { groundwater: 95, surfaceWater: 5, coloradoRiver: 0, effluent: 0 },
    history: generateHistory(170, 1.5, 0.7, 50000, 35000),
  },
  {
    id: 'harquahala-ina', name: 'Harquahala INA', status: 'INA', severity: 'Moderate',
    lat: 33.6455, lon: -113.3150,
    metrics: { currentDeficit: -5000, avgYearlyDecline: 0.3, totalStorageCapacity: 20000000, percentDepleted: 15 },
    waterSources: { groundwater: 90, surfaceWater: 0, coloradoRiver: 10, effluent: 0 },
    history: generateHistory(300, -0.2, 0.6, 20000, 25000),
  },
  {
    id: 'joseph-city-ina', name: 'Joseph City INA', status: 'INA', severity: 'Stable',
    lat: 34.9567, lon: -110.3340,
    metrics: { currentDeficit: -1000, avgYearlyDecline: -0.1, totalStorageCapacity: 4000000, percentDepleted: 8 },
    waterSources: { groundwater: 40, surfaceWater: 60, coloradoRiver: 0, effluent: 0 },
    history: generateHistory(90, -0.5, 0.3, 15000, 16000),
  },
  {
    id: 'hualapai-valley-ina', name: 'Hualapai Valley INA', status: 'INA', severity: 'Critical',
    lat: 35.6186, lon: -113.8472,
    metrics: { currentDeficit: 35000, avgYearlyDecline: 4.8, totalStorageCapacity: 12000000, percentDepleted: 28 },
    waterSources: { groundwater: 98, surfaceWater: 2, coloradoRiver: 0, effluent: 0 },
    history: generateHistory(450, 4.2, 1.9, 65000, 28000),
  },

  // Other Major Basins
  {
    id: 'willcox', name: 'Willcox Basin', status: 'Other', severity: 'Critical',
    lat: 32.2534, lon: -109.8340,
    metrics: { currentDeficit: 90000, avgYearlyDecline: 5.2, totalStorageCapacity: 15000000, percentDepleted: 45 },
    waterSources: { groundwater: 100, surfaceWater: 0, coloradoRiver: 0, effluent: 0 },
    history: generateHistory(250, 5.0, 2.0, 180000, 70000),
  },
  {
    id: 'mcmullen-valley', name: 'McMullen Valley', status: 'Other', severity: 'High',
    lat: 33.8208, lon: -113.3088,
    metrics: { currentDeficit: 30000, avgYearlyDecline: 2.1, totalStorageCapacity: 9000000, percentDepleted: 22 },
    waterSources: { groundwater: 98, surfaceWater: 2, coloradoRiver: 0, effluent: 0 },
    history: generateHistory(210, 1.9, 1.2, 45000, 15000),
  },
  {
    id: 'upper-san-pedro', name: 'Upper San Pedro', status: 'Other', severity: 'High',
    lat: 31.5540, lon: -110.1584,
    metrics: { currentDeficit: 15000, avgYearlyDecline: 1.5, totalStorageCapacity: 5000000, percentDepleted: 26 },
    waterSources: { groundwater: 80, surfaceWater: 20, coloradoRiver: 0, effluent: 0 },
    history: generateHistory(160, 1.2, 0.8, 40000, 25000),
  },
  {
    id: 'lower-san-pedro', name: 'Lower San Pedro', status: 'Other', severity: 'Moderate',
    lat: 32.7354, lon: -110.6626,
    metrics: { currentDeficit: 8000, avgYearlyDecline: 0.9, totalStorageCapacity: 4000000, percentDepleted: 14 },
    waterSources: { groundwater: 70, surfaceWater: 30, coloradoRiver: 0, effluent: 0 },
    history: generateHistory(120, 0.6, 0.5, 30000, 22000),
  },
  {
    id: 'verde-river', name: 'Verde River Basin', status: 'Other', severity: 'Moderate',
    lat: 34.7333, lon: -112.0242,
    metrics: { currentDeficit: 5000, avgYearlyDecline: 0.4, totalStorageCapacity: 7000000, percentDepleted: 12 },
    waterSources: { groundwater: 40, surfaceWater: 60, coloradoRiver: 0, effluent: 0 },
    history: generateHistory(90, 0.2, 0.4, 25000, 20000),
  },
  {
    id: 'yuma', name: 'Yuma Basin', status: 'Other', severity: 'Stable',
    lat: 32.6927, lon: -114.6277,
    metrics: { currentDeficit: -20000, avgYearlyDecline: -0.5, totalStorageCapacity: 18000000, percentDepleted: 5 },
    waterSources: { groundwater: 10, surfaceWater: 5, coloradoRiver: 85, effluent: 0 },
    history: generateHistory(140, -1.0, 0.5, 600000, 650000), // Colorado River flows help Yuma
  },
  {
    id: 'gila-bend', name: 'Gila Bend Basin', status: 'Other', severity: 'High',
    lat: 32.9482, lon: -112.7168,
    metrics: { currentDeficit: 22000, avgYearlyDecline: 1.8, totalStorageCapacity: 11000000, percentDepleted: 35 },
    waterSources: { groundwater: 85, surfaceWater: 5, coloradoRiver: 0, effluent: 10 },
    history: generateHistory(230, 2.0, 1.1, 55000, 32000),
  },
  {
    id: 'coconino-plateau', name: 'Coconino Plateau', status: 'Other', severity: 'Stable',
    lat: 35.7892, lon: -111.7285,
    metrics: { currentDeficit: 1000, avgYearlyDecline: 0.1, totalStorageCapacity: 25000000, percentDepleted: 2 },
    waterSources: { groundwater: 95, surfaceWater: 5, coloradoRiver: 0, effluent: 0 },
    history: generateHistory(800, 0.05, 0.1, 15000, 14000), // Very deep aquifers
  },
  {
    id: 'san-simon', name: 'San Simon Valley', status: 'Other', severity: 'High',
    lat: 32.3276, lon: -109.1866,
    metrics: { currentDeficit: 21000, avgYearlyDecline: 2.1, totalStorageCapacity: 6000000, percentDepleted: 38 },
    waterSources: { groundwater: 100, surfaceWater: 0, coloradoRiver: 0, effluent: 0 },
    history: generateHistory(180, 1.8, 1.2, 35000, 14000),
  },
  {
    id: 'little-colorado', name: 'Little Colorado River Plateau', status: 'Other', severity: 'Stable',
    lat: 35.0347, lon: -109.8168,
    metrics: { currentDeficit: -5000, avgYearlyDecline: -0.2, totalStorageCapacity: 30000000, percentDepleted: 4 },
    waterSources: { groundwater: 60, surfaceWater: 40, coloradoRiver: 0, effluent: 0 },
    history: generateHistory(450, -0.1, 0.3, 40000, 45000),
  },
  {
    id: 'safford', name: 'Safford Basin', status: 'Other', severity: 'Moderate',
    lat: 32.8339, lon: -109.7076,
    metrics: { currentDeficit: 8000, avgYearlyDecline: 0.8, totalStorageCapacity: 5500000, percentDepleted: 16 },
    waterSources: { groundwater: 50, surfaceWater: 50, coloradoRiver: 0, effluent: 0 },
    history: generateHistory(110, 0.7, 0.6, 38000, 30000),
  },
  {
    id: 'detrital-valley', name: 'Detrital Valley', status: 'Other', severity: 'Moderate',
    lat: 35.7958, lon: -114.3931,
    metrics: { currentDeficit: 5000, avgYearlyDecline: 0.3, totalStorageCapacity: 4000000, percentDepleted: 9 },
    waterSources: { groundwater: 100, surfaceWater: 0, coloradoRiver: 0, effluent: 0 },
    history: generateHistory(500, 0.4, 0.2, 10000, 6000),
  },
  {
    id: 'big-sandy', name: 'Big Sandy Basin', status: 'Other', severity: 'Stable',
    lat: 34.6225, lon: -113.6274,
    metrics: { currentDeficit: -1000, avgYearlyDecline: -0.1, totalStorageCapacity: 8000000, percentDepleted: 3 },
    waterSources: { groundwater: 90, surfaceWater: 10, coloradoRiver: 0, effluent: 0 },
    history: generateHistory(250, -0.2, 0.3, 12000, 13000),
  },
];
