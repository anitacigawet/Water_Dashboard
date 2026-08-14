import { Basin } from '../data/basins';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell
} from 'recharts';

interface WaterSourcesChartProps {
  basin: Basin;
}

const COLORS = {
  Groundwater: '#8b5cf6', // purple
  'Surface Water': '#10b981', // emerald
  'Colorado River': '#0ea5e9', // sky
  Effluent: '#f59e0b', // amber
};

const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-popover border border-border p-3 rounded-lg shadow-xl outline-none">
        <p className="font-sans text-sm font-semibold text-foreground mb-1">{payload[0].payload.name}</p>
        <p className="font-mono text-xs text-muted-foreground">
          {`${payload[0].value}% of total`}
        </p>
      </div>
    );
  }
  return null;
};

export function WaterSourcesChart({ basin }: WaterSourcesChartProps) {
  const data = [
    { name: 'Groundwater', value: basin.waterSources.groundwater },
    { name: 'Surface Water', value: basin.waterSources.surfaceWater },
    { name: 'Colorado River', value: basin.waterSources.coloradoRiver },
    { name: 'Effluent', value: basin.waterSources.effluent },
  ].filter(item => item.value > 0); // Only show sources that exist

  // Sort descending by value
  data.sort((a, b) => b.value - a.value);

  return (
    <div className="w-full h-full min-h-[200px]">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          layout="vertical"
          margin={{
            top: 5,
            right: 20,
            left: 20,
            bottom: 5,
          }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#333" horizontal={false} />
          <XAxis type="number" hide domain={[0, 100]} />
          <YAxis
            dataKey="name"
            type="category"
            axisLine={false}
            tickLine={false}
            stroke="#888"
            fontSize={12}
            width={110}
          />
          <Tooltip content={<CustomTooltip />} cursor={{fill: 'rgba(255,255,255,0.05)'}} />
          <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={24}>
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[entry.name as keyof typeof COLORS]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
