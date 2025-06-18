export interface PredictionPromptData {
  symbol: string;
  currentPrice: number;
  timeframe: '24h' | '7d' | '30d';
  marketData: {
    priceChange24h: number;
    volume24h: number;
    marketCap: number;
    high24h?: number;
    low24h?: number;
  };
}

export const PREDICTION_PROMPT = (data: PredictionPromptData): string => {
  const { symbol, currentPrice, timeframe, marketData } = data;
  
  const timeframeContext = {
    '24h': 'short-term technical indicators and intraday momentum',
    '7d': 'weekly trends, moving averages, and intermediate support/resistance levels',
    '30d': 'monthly trends, longer-term market cycles, and fundamental factors'
  };

  const volatilityLevel = Math.abs(marketData.priceChange24h);
  const volumeIntensity = marketData.volume24h > 10000000000 ? 'high' : 
                          marketData.volume24h > 1000000000 ? 'medium' : 'low';

  return `You are an expert cryptocurrency analyst with deep knowledge of market dynamics, technical analysis, and blockchain fundamentals.

ANALYSIS TARGET: ${symbol.toUpperCase()}
CURRENT PRICE: $${currentPrice.toLocaleString()}
PREDICTION TIMEFRAME: ${timeframe}

MARKET CONDITIONS:
- 24h Price Change: ${marketData.priceChange24h >= 0 ? '+' : ''}${marketData.priceChange24h}%
- 24h Trading Volume: $${(marketData.volume24h / 1000000).toFixed(2)}M (${volumeIntensity} volume)
- Market Capitalization: $${(marketData.marketCap / 1000000000).toFixed(2)}B
${marketData.high24h ? `- 24h High: $${marketData.high24h.toLocaleString()}` : ''}
${marketData.low24h ? `- 24h Low: $${marketData.low24h.toLocaleString()}` : ''}
- Volatility Assessment: ${volatilityLevel > 10 ? 'High' : volatilityLevel > 5 ? 'Medium' : 'Low'} (${volatilityLevel}%)

ANALYSIS REQUIREMENTS:
Focus on ${timeframeContext[timeframe]} for this ${timeframe} prediction.

Consider these factors:
1. Technical Analysis: Price action, support/resistance, momentum indicators
2. Market Structure: Volume patterns, liquidity, order book dynamics  
3. Macro Environment: Overall crypto market sentiment and external factors
4. Risk Assessment: Volatility, potential downside scenarios

Provide a realistic, well-reasoned prediction in this exact JSON format:
{
  "direction": "up" or "down",
  "targetPrice": number (be conservative and realistic),
  "confidence": number (0-100, factor in uncertainty - crypto markets are unpredictable),
  "changePercent": number (expected percentage change),
  "analysis": "2-3 sentence analysis explaining your reasoning",
  "factors": ["factor1", "factor2", "factor3"] (3 most important factors influencing prediction),
  "risk": "low", "medium", or "high" (consider volatility and market uncertainty)
}

IMPORTANT GUIDELINES:
- Be conservative with confidence levels (crypto markets are highly unpredictable)
- Consider both bullish and bearish scenarios
- Factor in current market volatility (${volatilityLevel}% 24h change)
- Base predictions on actual market data provided
- Acknowledge uncertainty - avoid overconfident predictions`;
};

export const MARKET_SENTIMENT_PROMPT = (cryptos: string[]): string => {
  return `You are a cryptocurrency market analyst. Analyze the overall market sentiment for these major cryptocurrencies: ${cryptos.join(', ')}.

Provide a comprehensive market analysis in this JSON format:
{
  "overallSentiment": "bullish", "bearish", or "neutral",
  "fearGreedIndex": number (0-100, estimated),
  "marketPhase": "accumulation", "markup", "distribution", or "markdown",
  "keyTrends": ["trend1", "trend2", "trend3"],
  "risks": ["risk1", "risk2"],
  "opportunities": ["opportunity1", "opportunity2"],
  "outlook": "brief 2-3 sentence market outlook"
}

Consider:
- Overall crypto market cap trends
- Bitcoin dominance and altcoin performance
- Regulatory environment
- Institutional adoption
- Technical market structure
- Macroeconomic factors`;
};

export const RISK_ASSESSMENT_PROMPT = (symbol: string, position: { size: number; entryPrice: number; currentPrice: number }): string => {
  const { size, entryPrice, currentPrice } = position;
  const pnlPercent = ((currentPrice - entryPrice) / entryPrice) * 100;
  
  return `Assess the risk profile for this ${symbol.toUpperCase()} position:

POSITION DETAILS:
- Entry Price: $${entryPrice}
- Current Price: $${currentPrice}
- Position Size: $${size}
- Current P&L: ${pnlPercent >= 0 ? '+' : ''}${pnlPercent.toFixed(2)}%

Provide risk analysis in this JSON format:
{
  "riskLevel": "low", "medium", "high", or "extreme",
  "riskScore": number (0-100),
  "maxDrawdownRisk": number (percentage),
  "recommendedAction": "hold", "reduce", "exit", or "add",
  "stopLoss": number (suggested price),
  "takeProfit": number (suggested price),
  "riskFactors": ["factor1", "factor2", "factor3"],
  "timeHorizon": "short", "medium", or "long",
  "analysis": "brief risk assessment summary"
}

Consider:
- Current market volatility
- Technical support/resistance levels
- Position sizing relative to portfolio
- Market correlation risks
- Liquidity considerations`;
};

export const NEWS_SENTIMENT_PROMPT = (newsHeadlines: string[]): string => {
  return `Analyze the sentiment of these cryptocurrency news headlines and assess their potential market impact:

HEADLINES:
${newsHeadlines.map((headline, i) => `${i + 1}. ${headline}`).join('\n')}

Provide sentiment analysis in this JSON format:
{
  "overallSentiment": "very_positive", "positive", "neutral", "negative", or "very_negative",
  "sentimentScore": number (-100 to +100),
  "marketImpact": "high", "medium", or "low",
  "keyThemes": ["theme1", "theme2", "theme3"],
  "bullishFactors": ["factor1", "factor2"],
  "bearishFactors": ["factor1", "factor2"],
  "timeframe": "immediate", "short_term", or "long_term",
  "analysis": "2-3 sentence summary of news impact"
}

Focus on:
- Regulatory developments
- Institutional adoption news
- Technical developments
- Market infrastructure changes
- Macroeconomic factors affecting crypto`;
};

// Utility function to validate prompt responses
export function validatePredictionResponse(response: string): boolean {
  try {
    const parsed = JSON.parse(response);
    const required = ['direction', 'targetPrice', 'confidence', 'changePercent', 'analysis', 'factors', 'risk'];
    return required.every(field => field in parsed);
  } catch {
    return false;
  }
}

// Template for error fallback when AI response is invalid
export const FALLBACK_PREDICTION = {
  direction: 'up' as const,
  targetPrice: 0,
  confidence: 50,
  changePercent: 0,
  analysis: 'Unable to generate prediction due to technical issues. Please try again.',
  factors: ['Technical analysis unavailable', 'Market data processing error', 'Temporary service interruption'],
  risk: 'medium' as const
};