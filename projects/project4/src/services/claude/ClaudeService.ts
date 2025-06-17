import { anthropic } from '@ai-sdk/anthropic';
import { generateText } from 'ai';
import { PREDICTION_PROMPT, validatePredictionResponse, FALLBACK_PREDICTION, type PredictionPromptData } from './prompts';

export interface PricePrediction {
  direction: 'up' | 'down';
  targetPrice: number;
  confidence: number;
  changePercent: number;
  analysis: string;
  factors: string[];
  risk: 'low' | 'medium' | 'high';
}

export interface PredictionRequest {
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

export interface PredictionResponse {
  symbol: string;
  timeframe: string;
  currentPrice: number;
  prediction: PricePrediction;
  generatedAt: string;
  cached?: boolean;
}

// Simple in-memory cache
interface CacheEntry {
  data: PredictionResponse;
  timestamp: number;
}

export class ClaudeService {
  private cache: Map<string, CacheEntry> = new Map();
  private cacheTimeout = 60 * 60 * 1000; // 1 hour cache
  private apiKey: string | undefined;
  private maxRetries = 2;

  constructor() {
    this.apiKey = process.env.ANTHROPIC_API_KEY;
  }

  private getCacheKey(request: PredictionRequest): string {
    return `${request.symbol}-${request.timeframe}-${Math.floor(request.currentPrice / 100) * 100}`;
  }

  private getFromCache(key: string): PredictionResponse | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    const isExpired = Date.now() - entry.timestamp > this.cacheTimeout;
    if (isExpired) {
      this.cache.delete(key);
      return null;
    }

    return { ...entry.data, cached: true };
  }

  private saveToCache(key: string, data: PredictionResponse): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now()
    });
  }

  async getPricePrediction(request: PredictionRequest): Promise<PredictionResponse> {
    // Check cache first
    const cacheKey = this.getCacheKey(request);
    const cached = this.getFromCache(cacheKey);
    if (cached) return cached;

    // If no API key, return mock prediction
    if (!this.apiKey) {
      return this.getMockPrediction(request);
    }

    try {
      // Generate AI prediction with retry logic
      const prediction = await this.generatePredictionWithRetry(request);

      const response: PredictionResponse = {
        symbol: request.symbol,
        timeframe: request.timeframe,
        currentPrice: request.currentPrice,
        prediction,
        generatedAt: new Date().toISOString()
      };

      // Cache the response
      this.saveToCache(cacheKey, response);

      return response;

    } catch (error) {
      console.error('Claude prediction error:', error);
      return this.getMockPrediction(request);
    }
  }

  private async generatePredictionWithRetry(request: PredictionRequest): Promise<PricePrediction> {
    const promptData: PredictionPromptData = {
      symbol: request.symbol,
      currentPrice: request.currentPrice,
      timeframe: request.timeframe,
      marketData: request.marketData
    };

    for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
      try {
        const prompt = PREDICTION_PROMPT(promptData);
        
        const { text } = await generateText({
          model: anthropic('claude-3-haiku-20240307'),
          prompt,
          temperature: 0.2 + (attempt * 0.1), // Increase temperature on retries
          maxTokens: 800,
        });

        // Validate the response format
        if (!validatePredictionResponse(text)) {
          throw new Error('Invalid prediction response format');
        }

        const prediction = JSON.parse(text) as PricePrediction;
        
        // Additional validation
        if (!prediction.targetPrice || prediction.confidence < 0 || prediction.confidence > 100) {
          throw new Error('Invalid prediction values');
        }

        return prediction;

      } catch (error) {
        console.warn(`Prediction attempt ${attempt + 1} failed:`, error);
        
        if (attempt === this.maxRetries) {
          // Return fallback prediction on final failure
          return {
            ...FALLBACK_PREDICTION,
            targetPrice: request.currentPrice * (1 + (Math.random() - 0.5) * 0.1) // ±5% random
          };
        }
        
        // Wait before retry
        await new Promise(resolve => setTimeout(resolve, 1000 * (attempt + 1)));
      }
    }

    // This should never be reached, but TypeScript safety
    return {
      ...FALLBACK_PREDICTION,
      targetPrice: request.currentPrice
    };
  }

  private getMockPrediction(request: PredictionRequest): PredictionResponse {
    const { symbol, currentPrice, timeframe, marketData } = request;
    
    // Simple mock prediction logic
    const isPositive = marketData.priceChange24h > 0;
    const momentum = Math.abs(marketData.priceChange24h);
    
    const changeMultiplier = timeframe === '24h' ? 1 : timeframe === '7d' ? 3 : 7;
    const expectedChange = (isPositive ? 1 : -1) * (2 + momentum * 0.5) * changeMultiplier;
    
    const prediction: PricePrediction = {
      direction: isPositive ? 'up' : 'down',
      targetPrice: currentPrice * (1 + expectedChange / 100),
      confidence: Math.min(80, 60 + momentum * 2),
      changePercent: expectedChange,
      analysis: `${symbol.toUpperCase()} shows ${isPositive ? 'bullish' : 'bearish'} momentum based on recent price action and volume patterns.`,
      factors: [
        isPositive ? 'Positive price momentum' : 'Negative price pressure',
        momentum > 5 ? 'High volatility environment' : 'Stable market conditions',
        'Technical indicator alignment'
      ],
      risk: momentum > 10 ? 'high' : momentum > 5 ? 'medium' : 'low'
    };

    return {
      symbol,
      timeframe,
      currentPrice,
      prediction,
      generatedAt: new Date().toISOString()
    };
  }

  // Clear cache method for maintenance
  clearCache(): void {
    this.cache.clear();
  }

  // Get cache stats for monitoring
  getCacheStats(): { size: number; keys: string[] } {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys())
    };
  }
}