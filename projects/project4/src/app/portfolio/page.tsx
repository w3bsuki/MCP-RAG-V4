import { Navigation } from "@/components/Navigation";
import { AddCryptoForm } from "@/components/AddCryptoForm";
import { PortfolioTable } from "@/components/PortfolioTable";

export default function PortfolioPage() {
  return (
    <div className="min-h-screen p-8 bg-terminal-black text-terminal-white font-mono">
      <main className="max-w-7xl mx-auto space-y-8">
        <Navigation />
        
        {/* Terminal Header */}
        <div className="text-center mb-8 border-2 border-terminal-gray bg-terminal-gray text-terminal-black p-4">
          <div className="text-xs mb-2">████████████████████████████████████████████████</div>
          <h1 className="text-4xl font-bold mb-2">
            PORTFOLIO TRACKER v1.0
          </h1>
          <p className="text-lg">
            MANUAL CRYPTO PORTFOLIO MANAGEMENT SYSTEM
          </p>
          <div className="text-xs mt-2">████████████████████████████████████████████████</div>
        </div>

        {/* Add Crypto Form */}
        <AddCryptoForm />

        {/* Portfolio Table */}
        <PortfolioTable />

        {/* Terminal Footer */}
        <div className="text-center text-xs text-terminal-darkgray border-t-2 border-terminal-darkgray pt-4">
          <div className="font-mono">
            PORTFOLIO STATUS: ACTIVE • FREE TIER: UNLIMITED TRACKING • 
            UPGRADE TO PRO FOR AI INSIGHTS
          </div>
        </div>
      </main>
    </div>
  );
}