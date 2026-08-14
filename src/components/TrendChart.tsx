import { Basin } from '../data/basins';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Area,
  AreaChart,
} from 'recharts';

interface TrendChartProps {
  basin: Basin;
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-popover border border-border p-3 rounded-lg shadow-xl outline-none">
        <p className="font-mono text-sm font-semibold text-foreground mb-1">{`Year: ${label}`}</p>
        <p className="font-sans text-xs text-blue-400">
          {`Depth: ${payload[0].value} ft`}
        </p>
      </div>
    );
  }
  return null;
};

export function TrendChart({ basin }: TrendChartProps) {
  // Reversing the Y axis visually so depth goes downwards (higher numbers = deeper)
  // Actually, standard is higher number = deeper water table.
  // A rising line would mean water is getting deeper (worse).

  return (
    <div className="w-full h-full min-h-[300px]">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart
          data={basin.history}
          margin={{
            top: 20,
            right: 10,
            left: 0,
            bottom: 0,
          }}
        >
          <defs>
            <linearGradient id="colorDepth" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
              <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#333" vertical={false} />
          <XAxis
            dataKey="year"
            stroke="#888"
            fontSize={12}
            tickLine={false}
            axisLine={false}
            tickMargin={10}
            minTickGap={20}
          />
          <YAxis
            stroke="#888"
            fontSize={12}
            tickLine={false}
            axisLine={false}
            tickFormatter={(value) => `${value}ft`}
            domain={['auto', 'auto']}
          />
          <Tooltip content={<CustomTooltip />} />
          <Area
            type="monotone"
            dataKey="depthToWaterFs"
            stroke="#3b82f6"
            strokeWidth={2}
            fillOpacity={1}
            fill="url(#colorDepth)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
