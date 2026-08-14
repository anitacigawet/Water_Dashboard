import { useState } from 'react';
import { basins, Basin } from './data/basins';
import { ArizonaMap } from './components/ArizonaMap';
import { TrendChart } from './components/TrendChart';
import { WaterSourcesChart } from './components/WaterSourcesChart';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './components/ui/card';
import { Badge } from './components/ui/badge';
import { Droplets, TrendingDown, Layers, AlertTriangle, ShieldAlert, ShieldCheck, Shield, Headphones, Presentation, PlaySquare } from 'lucide-react';
import { cn } from './lib/utils';

export default function App() {
  const [selectedBasin, setSelectedBasin] = useState<Basin>(basins[0]);
  const [searchQuery, setSearchQuery] = useState('');

  const getSeverityBadgeVariant = (severity: Basin['severity']) => {
    switch(severity) {
      case 'Critical': return 'critical';
      case 'High': return 'high';
      case 'Moderate': return 'moderate';
      case 'Stable': return 'stable';
      default: return 'default';
    }
  };

  const getStatusBadgeVariant = (status: Basin['status']) => {
    switch(status) {
      case 'AMA': return 'ama';
      case 'INA': return 'ina';
      case 'Other': return 'other';
      default: return 'default';
    }
  };

  const getStatusIcon = (status: Basin['status']) => {
    switch(status) {
      case 'AMA': return <ShieldCheck className="w-4 h-4 mr-1 text-indigo-400" />;
      case 'INA': return <Shield className="w-4 h-4 mr-1 text-cyan-400" />;
      case 'Other': return <ShieldAlert className="w-4 h-4 mr-1 text-slate-400" />;
    }
  };

  const filteredBasins = basins.filter(b =>
    b.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    b.status.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-background text-foreground p-4 md:p-8 selection:bg-indigo-500/30">
      <header className="max-w-7xl mx-auto mb-8 flex flex-col md:flex-row items-start md:items-end justify-between border-b pb-6 border-slate-800">
        <div>
          <div className="flex flex-wrap items-center gap-3 mb-2">
            <h1 className="text-3xl font-bold tracking-tight text-white">Arizona Basin Monitor</h1>
            <Badge variant="other" className="font-mono uppercase tracking-wider">Interface prototype</Badge>
          </div>
          <p className="text-muted-foreground max-w-2xl">
            A demonstration of how verified groundwater-basin data could be explored across Arizona. The current values are synthetic placeholders.
          </p>
        </div>
        <div className="mt-4 md:mt-0 flex gap-4 text-xs font-mono text-muted-foreground">
          <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-red-500"></div>Critical</div>
          <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-orange-500"></div>High</div>
          <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-amber-500"></div>Moderate</div>
          <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-teal-500"></div>Stable</div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto mb-8 rounded-lg border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-100 flex items-start gap-3" role="note">
        <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5 text-amber-400" />
        <p>
          <strong className="text-amber-300">Demonstration data only.</strong>{' '}
          Every metric, severity label, source share, and historical series shown below is synthetic or unverified. Do not cite or use these values for research, reporting, policy, or decisions.
        </p>
      </div>

      <main className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Map */}
        <div className="lg:col-span-5 xl:col-span-4 flex flex-col gap-6">
          <Card className="bg-card/50 backdrop-blur-sm border-slate-800">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg">State Overview</CardTitle>
              <CardDescription>Select a basin to view detailed metrics</CardDescription>
            </CardHeader>
            <CardContent>
              <ArizonaMap
                basins={basins}
                selectedBasin={selectedBasin}
                onSelectBasin={setSelectedBasin}
              />
            </CardContent>
          </Card>

          {/* Basin List for quick switching */}
          <Card className="border-slate-800 flex-grow max-h-[500px] flex flex-col">
            <CardHeader className="pb-4">
              <div className="flex flex-col gap-3">
                <CardTitle className="text-lg">Basins Directory</CardTitle>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-slate-500">
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
                  </div>
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search basins..."
                    className="w-full bg-slate-900 border border-slate-700 text-white rounded-md pl-9 pr-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent className="overflow-y-auto space-y-2 pr-2 flex-grow scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-transparent">
              {filteredBasins.length === 0 ? (
                <div className="text-center py-4 text-sm text-slate-500">No basins found</div>
              ) : (
                filteredBasins.map(b => (
                  <button
                    key={b.id}
                    onClick={() => setSelectedBasin(b)}
                    className={cn(
                      "flex items-center justify-between w-full p-3 rounded-lg border transition-all text-left group",
                      selectedBasin.id === b.id
                        ? "bg-slate-800/80 border-slate-600"
                        : "bg-transparent border-slate-800/50 hover:bg-slate-800/30 hover:border-slate-700"
                    )}
                  >
                    <div>
                      <div className={cn(
                          "font-medium text-sm transition-colors",
                           selectedBasin.id === b.id ? "text-white" : "text-slate-300 group-hover:text-white"
                        )}>
                        {b.name}
                      </div>
                      <div className="text-xs text-slate-500 mt-0.5">{b.status}</div>
                    </div>
                    <Badge variant={getSeverityBadgeVariant(b.severity)} className="scale-90 origin-right">
                      {b.severity}
                    </Badge>
                  </button>
                ))
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Basin Details */}
        <div className="lg:col-span-7 xl:col-span-8 flex flex-col gap-6">
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-3 flex-wrap">
              <h2 className="text-4xl font-bold tracking-tight text-white">{selectedBasin.name}</h2>
              <Badge variant={getStatusBadgeVariant(selectedBasin.status)} className="text-sm px-3 py-1">
                {getStatusIcon(selectedBasin.status)}
                {selectedBasin.status === 'AMA' ? 'Active Management Area' : selectedBasin.status === 'INA' ? 'Irrigation Non-Expansion' : 'Other Regulation'}
              </Badge>
              <Badge variant={getSeverityBadgeVariant(selectedBasin.severity)} className="text-sm px-3 py-1">
                {selectedBasin.severity} Demo Risk Label
              </Badge>
            </div>
            <p className="text-muted-foreground mt-1 text-sm md:text-base">
              ID: {selectedBasin.id.toUpperCase()} &bull; Lat: {selectedBasin.lat.toFixed(2)} &bull; Lon: {selectedBasin.lon.toFixed(2)}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="border-slate-800 bg-slate-900/50">
              <CardContent className="p-6">
                <div className="flex items-center justify-between pb-4">
                  <p className="text-sm font-medium text-slate-400">Demo Yearly Decline</p>
                  <TrendingDown className="h-4 w-4 text-slate-500" />
                </div>
                <div className="flex items-baseline gap-2">
                  <h3 className="text-3xl font-bold text-white">{selectedBasin.metrics.avgYearlyDecline > 0 ? '+' : ''}{selectedBasin.metrics.avgYearlyDecline.toFixed(1)}</h3>
                  <span className="text-sm text-slate-500 font-mono">ft/yr</span>
                </div>
                <p className="text-xs text-slate-500 mt-2">Unverified placeholder</p>
              </CardContent>
            </Card>

            <Card className="border-slate-800 bg-slate-900/50">
              <CardContent className="p-6">
                <div className="flex items-center justify-between pb-4">
                  <p className="text-sm font-medium text-slate-400">Demo Annual Deficit</p>
                  <Droplets className="h-4 w-4 text-slate-500" />
                </div>
                <div className="flex items-baseline gap-2">
                  <h3 className="text-3xl font-bold text-white">{(selectedBasin.metrics.currentDeficit).toLocaleString()}</h3>
                  <span className="text-sm text-slate-500 font-mono">acre-ft</span>
                </div>
                <p className="text-xs text-slate-500 mt-2">Unverified placeholder</p>
              </CardContent>
            </Card>

            <Card className="border-slate-800 bg-slate-900/50">
              <CardContent className="p-6">
                <div className="flex items-center justify-between pb-4">
                  <p className="text-sm font-medium text-slate-400">Demo Capacity Depleted</p>
                  <Layers className="h-4 w-4 text-slate-500" />
                </div>
                <div className="flex items-baseline gap-2">
                  <h3 className="text-3xl font-bold text-white">{selectedBasin.metrics.percentDepleted}%</h3>
                </div>
                <div className="w-full bg-slate-800 rounded-full h-1.5 mt-4">
                  <div
                    className={cn(
                      "h-1.5 rounded-full transition-all duration-1000",
                      selectedBasin.metrics.percentDepleted > 50 ? "bg-red-500" :
                      selectedBasin.metrics.percentDepleted > 30 ? "bg-orange-500" :
                      selectedBasin.metrics.percentDepleted > 20 ? "bg-amber-500" : "bg-teal-500"
                    )}
                    style={{ width: `${selectedBasin.metrics.percentDepleted}%` }}
                  ></div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 flex-grow">
            <Card className="border-slate-800 h-[400px] flex flex-col">
              <CardHeader className="pb-0 shrink-0">
                <CardTitle className="text-xl">Water Sources Breakdown</CardTitle>
                <CardDescription>
                  Demonstration source-share values for {selectedBasin.name}.
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-4 flex-grow min-h-0">
                <WaterSourcesChart basin={selectedBasin} />
              </CardContent>
            </Card>

            <Card className="border-slate-800 h-[400px] flex flex-col">
              <CardHeader className="pb-0 shrink-0">
                <div className="space-y-1">
                  <CardTitle className="text-xl">Depth to Groundwater (ft)</CardTitle>
                  <CardDescription>
                    Synthetic trend shape for 1990–2024. <br/>
                    <span className="text-xs font-mono text-slate-500">Generated at runtime; not measured observations.</span>
                  </CardDescription>
                </div>
              </CardHeader>
              <CardContent className="pt-4 flex-grow min-h-0">
                <TrendChart basin={selectedBasin} />
              </CardContent>
            </Card>
          </div>

          {/* AI & Media Section Placeholders */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 shrink-0">
            <Card className="border-slate-800 border-dashed bg-slate-900/30 overflow-hidden relative">
              <CardContent className="p-6 flex flex-col items-center justify-center text-center h-full min-h-[160px]">
                <div className="w-12 h-12 rounded-full bg-slate-800 flex items-center justify-center mb-4 group-hover:bg-indigo-900/50 transition-colors">
                  <Headphones className="w-6 h-6 text-indigo-400" />
                </div>
                <h4 className="text-sm font-semibold text-white mb-1">Planned Audio Overview</h4>
                <p className="text-xs text-slate-500">Reserved for a source-linked basin briefing</p>
              </CardContent>
            </Card>

            <Card className="border-slate-800 border-dashed bg-slate-900/30 overflow-hidden relative">
              <CardContent className="p-6 flex flex-col items-center justify-center text-center h-full min-h-[160px]">
                <div className="w-12 h-12 rounded-full bg-slate-800 flex items-center justify-center mb-4 group-hover:bg-cyan-900/50 transition-colors">
                  <PlaySquare className="w-6 h-6 text-cyan-400" />
                </div>
                <h4 className="text-sm font-semibold text-white mb-1">Planned Interactive Explainer</h4>
                <p className="text-xs text-slate-500">Reserved for a basin-specific learning model</p>
              </CardContent>
            </Card>

            <Card className="border-slate-800 border-dashed bg-slate-900/30 overflow-hidden relative">
              <CardContent className="p-6 flex flex-col items-center justify-center text-center h-full min-h-[160px]">
                <div className="w-12 h-12 rounded-full bg-slate-800 flex items-center justify-center mb-4 group-hover:bg-amber-900/50 transition-colors">
                  <Presentation className="w-6 h-6 text-amber-400" />
                </div>
                <h4 className="text-sm font-semibold text-white mb-1">Planned Data Story</h4>
                <p className="text-xs text-slate-500">Reserved for verified historical context</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>

      <footer className="max-w-7xl mx-auto mt-10 border-t border-slate-800 pt-5 text-xs text-slate-500 flex flex-col sm:flex-row gap-2 sm:justify-between">
        <span>Prototype values are synthetic or unverified.</span>
        <span>© 2026 ScootSolute LLC · PolyForm Noncommercial 1.0.0</span>
      </footer>
    </div>
  );
}
