import { Navigation } from "@/components/Navigation";
import { MarketOverview } from "@/components/MarketOverview";
import { CryptoTable } from "@/components/CryptoTable";
import { UsageDisplay } from "@/components/UsageDisplay";

export default function Home() {
  return (
    <div className="min-h-screen p-8 bg-terminal-black text-terminal-white font-mono">
      <main className="max-w-7xl mx-auto space-y-8">
        <Navigation />
        
        {/* Terminal Header with ASCII Art */}
        <div className="text-center mb-8 border-2 border-terminal-darkgray bg-terminal-gray text-terminal-black p-6 shadow-raised-thick">
          <div className="font-mono text-xs mb-3">
            ╔══════════════════════════════════════════════════════════════════╗<br />
            ║                     CLAUDE CRYPTO PREDICTOR                      ║<br />
            ║                           v1.0.0                                ║<br />
            ╚══════════════════════════════════════════════════════════════════╝
          </div>
          <h1 className="text-3xl font-bold mb-2 font-mono">
            █▀▄▀█ ▄▀█ █▀█ █▄▀ █▀▀ ▀█▀   █▀█ █ █ █▀▀ █▀█ █ █ █ █▀▀ █ █
          </h1>
          <h2 className="text-xl font-bold mb-3 font-mono">
            REAL-TIME CRYPTO PRICES & AI PREDICTIONS
          </h2>
          <div className="text-xs font-mono">
            ▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
          </div>
        </div>

        {/* Dashboard Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-8">
            {/* Market Overview */}
            <MarketOverview />

            {/* Main Crypto Table */}
            <CryptoTable />
          </div>
          
          <div className="space-y-8">
            {/* Usage Display */}
            <UsageDisplay />
          </div>
        </div>

        {/* Terminal Footer */}
        <div className="text-center text-xs text-terminal-darkgray border-2 border-terminal-darkgray bg-terminal-black p-4 shadow-sunken">
          <div className="font-mono space-y-1">
            <div>════════════════════════════════════════════════════════════════════</div>
            <div className="text-terminal-green">
              ► SYSTEM STATUS: ONLINE │ UPTIME: 99.9% │ LATENCY: &lt;50ms
            </div>
            <div className="text-terminal-white">
              ► FREE TIER: {typeof window !== 'undefined' ? Math.floor(Math.random() * 50) + 50 : 75} REQUESTS REMAINING TODAY
            </div>
            <div className="text-terminal-red blink">
              ► UPGRADE TO PRO FOR UNLIMITED AI PREDICTIONS
            </div>
            <div>════════════════════════════════════════════════════════════════════</div>
            <div className="text-terminal-darkgray mt-2">
              Claude Crypto Predictor © 2025 • DOS Terminal Mode
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}