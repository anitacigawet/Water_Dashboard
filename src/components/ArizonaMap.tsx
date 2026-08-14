import { Basin } from '../data/basins';
import { cn } from '../lib/utils';
import { MapPin } from 'lucide-react';

interface ArizonaMapProps {
  basins: Basin[];
  selectedBasin: Basin | null;
  onSelectBasin: (basin: Basin) => void;
}

export function ArizonaMap({ basins, selectedBasin, onSelectBasin }: ArizonaMapProps) {
  // Coordinate bounds for Arizona roughly
  const minLon = -114.8166;
  const maxLon = -109.0452;
  const minLat = 31.3322;
  const maxLat = 37.0043;

  // ViewBox dimensions
  const width = 400;
  const height = 450;

  const getXY = (lat: number, lon: number) => {
    const x = ((lon - minLon) / (maxLon - minLon)) * width;
    const y = height - ((lat - minLat) / (maxLat - minLat)) * height;
    return { x, y };
  };

  // Very simplified Arizona outline path
  const azBoundaryPoints = [
    [37.0043, -114.05], // NW near UT
    [37.0043, -109.0452], // NE Four Corners
    [31.3322, -109.0452], // SE
    [31.3322, -111.0], // MX border
    [31.5, -111.5], // MX border turning
    [31.3, -113.0], // MX border
    [32.5, -114.8166], // SW near Yuma
    [32.7, -114.6], // Colorado River
    [33.1, -114.65], // Colorado River
    [33.5, -114.5], // Colorado River
    [34.3, -114.1], // Colorado River Lake Havasu
    [35.1, -114.6], // Colorado River Bullhead City
    [36.0, -114.7], // Hoover Dam area
  ];

  const dPath = `M ${getXY(azBoundaryPoints[0][0], azBoundaryPoints[0][1]).x},${getXY(azBoundaryPoints[0][0], azBoundaryPoints[0][1]).y} ` +
    azBoundaryPoints.slice(1).map(p => `L ${getXY(p[0], p[1]).x},${getXY(p[0], p[1]).y}`).join(' ') + ' Z';

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'Critical': return 'fill-red-500';
      case 'High': return 'fill-orange-500';
      case 'Moderate': return 'fill-amber-500';
      case 'Stable': return 'fill-teal-500';
      default: return 'fill-slate-500';
    }
  };

  return (
    <div className="relative w-full max-w-lg aspect-[4/4.5] mx-auto filter drop-shadow-2xl">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="w-full h-full"
      >
        {/* State Outline */}
        <path
          d={dPath}
          className="fill-slate-900 border stroke-slate-800 stroke-2"
          strokeLinejoin="round"
        />

        {/* Basin Points */}
        {basins.map((basin) => {
          const { x, y } = getXY(basin.lat, basin.lon);
          const isSelected = selectedBasin?.id === basin.id;

          return (
            <g
              key={basin.id}
              transform={`translate(${x}, ${y})`}
              className="cursor-pointer transition-transform hover:scale-125"
              onClick={() => onSelectBasin(basin)}
            >
              {isSelected && (
                <circle r={14} className="fill-white/10 animate-pulse" />
              )}
              {isSelected && (
                <circle r={8} className="fill-transparent stroke-white stroke-2" />
              )}
              <circle
                r={5}
                className={cn(
                  'transition-all duration-300',
                  getSeverityColor(basin.severity),
                  isSelected ? 'stroke-white stroke-[1.5px]' : 'stroke-background stroke-1'
                )}
              />
              <text
                y={-12}
                textAnchor="middle"
                className={cn(
                  "text-[10px] font-mono pointer-events-none transition-opacity",
                  isSelected ? "fill-white opacity-100 font-bold" : "fill-slate-400 font-medium",
                  isSelected ? "backdrop-blur-sm" : ""
                )}
              >
                {basin.name}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
