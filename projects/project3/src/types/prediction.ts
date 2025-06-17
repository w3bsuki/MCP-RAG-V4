export interface MarketContext {
  symbol: string
  currentPrice: number
  volume24h: number
  priceChange24h: number
  rsi: number
  macd: {
    signal: number
    histogram: number
  }
  bollingerBands: {
    upper: number
    lower: number
  }
  volumeProfile: number[]
  fearGreedIndex: number
  btcDominance: number
  totalMarketCap: number
  recentHeadlines: string[]
  socialMentions: number
  whaleActivity: {
    buys: number
    sells: number
  }
}

export interface ClaudePrediction {
  sevenDayTarget: number
  thirtyDayTarget: number
  confidence: number
  direction: 'strong_buy' | 'buy' | 'neutral' | 'sell' | 'strong_sell'
  keyFactors: string[]
  riskAssessment: string
  technicalSummary: string
  fundamentalSummary: string
  contraryFactors: string[]
}