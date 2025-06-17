'use client'

import { useState } from 'react'
import { PriceDisplay } from '@/components/PriceDisplay'
import { PredictionCard } from '@/components/PredictionCard'
import { MarketOverview } from '@/components/MarketOverview'
import { TradingChart } from '@/components/TradingChart'
import { AlertsPanel } from '@/components/AlertsPanel'
import { Activity, Bell, Grid3X3, LineChart, Moon, Settings, Sun, TrendingUp } from 'lucide-react'
import { cn } from '@/lib/utils'

const CRYPTOS = [
  { symbol: 'BTC', name: 'Bitcoin', icon: '₿', color: 'text-crypto-bitcoin' },
  { symbol: 'ETH', name: 'Ethereum', icon: 'Ξ', color: 'text-crypto-ethereum' },
  { symbol: 'BNB', name: 'BNB', icon: '◆', color: 'text-crypto-binance' },
  { symbol: 'SOL', name: 'Solana', icon: '◎', color: 'text-crypto-solana' },
  { symbol: 'ADA', name: 'Cardano', icon: '₳', color: 'text-crypto-cardano' },
  { symbol: 'AVAX', name: 'Avalanche', icon: 'A', color: 'text-crypto-avalanche' },
]

const TIMEFRAMES = [
  { value: '1m', label: '1M' },
  { value: '5m', label: '5M' },
  { value: '15m', label: '15M' },
  { value: '1h', label: '1H' },
  { value: '4h', label: '4H' },
  { value: '1d', label: '1D' },
  { value: '1w', label: '1W' },
]

export default function TradingDashboard() {
  const [selectedCrypto, setSelectedCrypto] = useState('BTC')
  const [timeframe, setTimeframe] = useState('1h')
  const [darkMode, setDarkMode] = useState(true)

  return (
    <div className={cn("min-h-screen", darkMode ? "dark" : "")}>
      <div className="bg-background text-foreground">
        {/* Professional Trading Header */}
        <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
          <div className="container mx-auto px-4">
            <div className="flex items-center justify-between h-16">
              {/* Logo and Brand */}
              <div className="flex items-center space-x-8">
                <div className="flex items-center space-x-2">
                  <div className="w-8 h-8 bg-gradient-primary rounded-lg flex items-center justify-center">
                    <TrendingUp className="w-5 h-5 text-white" />
                  </div>
                  <h1 className="text-xl font-bold text-gradient-primary">
                    CryptoVision
                  </h1>
                  <span className="px-2 py-0.5 text-xs bg-primary/10 text-primary rounded-full font-medium">
                    AI-Powered
                  </span>
                </div>

                {/* Navigation */}
                <nav className="hidden md:flex items-center space-x-6">
                  <a href="#" className="text-sm font-medium text-primary">Trading</a>
                  <a href="#" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">Markets</a>
                  <a href="#" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">Portfolio</a>
                  <a href="#" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">Analytics</a>
                </nav>
              </div>

              {/* Right Actions */}
              <div className="flex items-center space-x-4">
                <button className="relative p-2 rounded-lg hover:bg-muted transition-colors">
                  <Bell className="w-5 h-5" />
                  <span className="absolute top-1 right-1 w-2 h-2 bg-danger rounded-full animate-pulse" />
                </button>
                
                <button className="p-2 rounded-lg hover:bg-muted transition-colors">
                  <Settings className="w-5 h-5" />
                </button>

                <button
                  onClick={() => setDarkMode(!darkMode)}
                  className="p-2 rounded-lg hover:bg-muted transition-colors"
                >
                  {darkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
                </button>

                <button className="crypto-button px-6">
                  Connect Wallet
                </button>
              </div>
            </div>
          </div>
        </header>

        {/* Sub-header with Crypto Selection */}
        <div className="border-b border-border bg-card/30">
          <div className="container mx-auto px-4">
            <div className="py-4">
              {/* Crypto Tabs */}
              <div className="flex items-center space-x-1 overflow-x-auto pb-2 scrollbar-hide">
                {CRYPTOS.map((crypto) => (
                  <button
                    key={crypto.symbol}
                    onClick={() => setSelectedCrypto(crypto.symbol)}
                    className={cn(
                      "flex items-center space-x-2 px-4 py-2 rounded-lg transition-all whitespace-nowrap",
                      selectedCrypto === crypto.symbol
                        ? "bg-primary/10 text-primary border border-primary/20"
                        : "hover:bg-muted text-muted-foreground"
                    )}
                  >
                    <span className={cn("text-lg font-bold", crypto.color)}>
                      {crypto.icon}
                    </span>
                    <span className="font-medium">{crypto.name}</span>
                    <PriceDisplay symbol={crypto.symbol} className="text-sm" compact />
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <main className="container mx-auto px-4 py-6">
          <div className="grid grid-cols-12 gap-6">
            {/* Left Sidebar - Market Overview */}
            <div className="col-span-12 lg:col-span-3 space-y-6">
              {/* Market Stats */}
              <div className="crypto-card">
                <h3 className="text-sm font-medium text-muted-foreground mb-4">Market Overview</h3>
                <MarketOverview />
              </div>

              {/* Watchlist */}
              <div className="crypto-card">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-medium text-muted-foreground">Watchlist</h3>
                  <button className="text-xs text-primary hover:text-primary-600">
                    Edit
                  </button>
                </div>
                <div className="space-y-2">
                  {CRYPTOS.slice(0, 4).map((crypto) => (
                    <div
                      key={crypto.symbol}
                      className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
                      onClick={() => setSelectedCrypto(crypto.symbol)}
                    >
                      <div className="flex items-center space-x-2">
                        <span className={cn("text-lg font-bold", crypto.color)}>
                          {crypto.icon}
                        </span>
                        <span className="text-sm font-medium">{crypto.symbol}</span>
                      </div>
                      <PriceDisplay symbol={crypto.symbol} className="text-sm" showChange />
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Center - Main Trading View */}
            <div className="col-span-12 lg:col-span-6 space-y-6">
              {/* Price Header */}
              <div className="crypto-card">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center space-x-2 mb-2">
                      <span className={cn(
                        "text-2xl font-bold",
                        CRYPTOS.find(c => c.symbol === selectedCrypto)?.color
                      )}>
                        {CRYPTOS.find(c => c.symbol === selectedCrypto)?.icon}
                      </span>
                      <h2 className="text-2xl font-bold">
                        {CRYPTOS.find(c => c.symbol === selectedCrypto)?.name}
                      </h2>
                      <span className="text-muted-foreground">{selectedCrypto}/USDT</span>
                    </div>
                    <PriceDisplay symbol={selectedCrypto} className="text-4xl" showChange />
                  </div>
                  <div className="text-right">
                    <div className="text-sm text-muted-foreground mb-1">24h Volume</div>
                    <div className="text-lg font-semibold font-mono">$28.5B</div>
                  </div>
                </div>
              </div>

              {/* Trading Chart */}
              <div className="crypto-card">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-4">
                    <h3 className="font-semibold">Chart</h3>
                    <div className="flex items-center space-x-1">
                      {['Line', 'Candle', 'Area'].map((type) => (
                        <button
                          key={type}
                          className={cn(
                            "px-3 py-1 text-xs rounded transition-colors",
                            type === 'Candle'
                              ? "bg-primary/10 text-primary"
                              : "text-muted-foreground hover:text-foreground"
                          )}
                        >
                          {type}
                        </button>
                      ))}
                    </div>
                  </div>
                  
                  {/* Timeframe Selector */}
                  <div className="flex items-center space-x-1">
                    {TIMEFRAMES.map((tf) => (
                      <button
                        key={tf.value}
                        onClick={() => setTimeframe(tf.value)}
                        className={cn(
                          "px-3 py-1 text-xs font-medium rounded transition-colors",
                          timeframe === tf.value
                            ? "bg-primary/10 text-primary"
                            : "text-muted-foreground hover:text-foreground"
                        )}
                      >
                        {tf.label}
                      </button>
                    ))}
                  </div>
                </div>
                
                <div className="h-96">
                  <TradingChart symbol={selectedCrypto} timeframe={timeframe} />
                </div>

                {/* Chart Tools */}
                <div className="flex items-center justify-between mt-4 pt-4 border-t border-border">
                  <div className="flex items-center space-x-2">
                    <button className="p-2 rounded hover:bg-muted transition-colors">
                      <LineChart className="w-4 h-4" />
                    </button>
                    <button className="p-2 rounded hover:bg-muted transition-colors">
                      <Grid3X3 className="w-4 h-4" />
                    </button>
                    <button className="p-2 rounded hover:bg-muted transition-colors">
                      <Activity className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="flex items-center space-x-2 text-xs text-muted-foreground">
                    <span>Powered by TradingView</span>
                  </div>
                </div>
              </div>

              {/* AI Prediction */}
              <div className="crypto-card">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold">AI Market Prediction</h3>
                  <span className="text-xs text-muted-foreground">Powered by Claude AI</span>
                </div>
                <PredictionCard symbol={selectedCrypto} />
              </div>
            </div>

            {/* Right Sidebar - Trading Panel */}
            <div className="col-span-12 lg:col-span-3 space-y-6">
              {/* Order Book */}
              <div className="crypto-card">
                <h3 className="text-sm font-medium text-muted-foreground mb-4">Order Book</h3>
                <div className="space-y-1">
                  {/* Sell Orders */}
                  <div className="space-y-0.5">
                    {[...Array(5)].map((_, i) => (
                      <div key={`sell-${i}`} className="flex items-center justify-between text-xs">
                        <span className="text-danger">{(45250 + i * 10).toFixed(2)}</span>
                        <span className="text-muted-foreground">{(Math.random() * 10).toFixed(4)}</span>
                        <span className="text-muted-foreground">{(Math.random() * 1000).toFixed(0)}</span>
                      </div>
                    ))}
                  </div>
                  
                  {/* Current Price */}
                  <div className="py-2 my-2 border-y border-border">
                    <div className="text-center">
                      <PriceDisplay symbol={selectedCrypto} className="text-lg" />
                    </div>
                  </div>
                  
                  {/* Buy Orders */}
                  <div className="space-y-0.5">
                    {[...Array(5)].map((_, i) => (
                      <div key={`buy-${i}`} className="flex items-center justify-between text-xs">
                        <span className="text-success">{(45200 - i * 10).toFixed(2)}</span>
                        <span className="text-muted-foreground">{(Math.random() * 10).toFixed(4)}</span>
                        <span className="text-muted-foreground">{(Math.random() * 1000).toFixed(0)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Alerts */}
              <div className="crypto-card">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-medium text-muted-foreground">Price Alerts</h3>
                  <button className="text-xs text-primary hover:text-primary-600">
                    Add Alert
                  </button>
                </div>
                <AlertsPanel />
              </div>

              {/* Quick Trade */}
              <div className="crypto-card">
                <h3 className="text-sm font-medium text-muted-foreground mb-4">Quick Trade</h3>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-2">
                    <button className="py-2 px-4 bg-success/10 text-success rounded-lg font-medium hover:bg-success/20 transition-colors">
                      Buy
                    </button>
                    <button className="py-2 px-4 bg-danger/10 text-danger rounded-lg font-medium hover:bg-danger/20 transition-colors">
                      Sell
                    </button>
                  </div>
                  <div className="text-center text-xs text-muted-foreground">
                    Connect wallet to start trading
                  </div>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}