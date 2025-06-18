# 🤖 Claude API Integration Architecture

## 🎯 Overview
Architecture for integrating Claude AI into CryptoVision Terminal for cryptocurrency predictions and market analysis.

## 🏗️ Core Architecture Components

### 1. **Claude Service Layer**
```typescript
// /src/services/claude/ClaudeService.ts
import Anthropic from '@anthropic-ai/sdk';

export class ClaudeService {
  private client: Anthropic;
  private cache: Map<string, CachedPrediction>;
  
  constructor() {
    this.client = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    });
    this.cache = new Map();
  }

  async getPricePrediction(
    symbol: string, 
    timeframe: '24h' | '7d' | '30d'
  ): Promise<PredictionResult> {
    // Check cache first
    const cacheKey = `${symbol}-${timeframe}`;
    if (this.cache.has(cacheKey)) {
      const cached = this.cache.get(cacheKey)!;
      if (!this.isCacheExpired(cached)) {
        return cached.prediction;
      }
    }

    // Make Claude API call
    const prediction = await this.generatePrediction(symbol, timeframe);
    
    // Cache result
    this.cache.set(cacheKey, {
      prediction,
      timestamp: Date.now()
    });

    return prediction;
  }
}
```

### 2. **Prompt Engineering Strategy**

#### **Price Prediction Prompt Template**
```typescript
const PREDICTION_PROMPT = `You are a cryptocurrency market analyst with expertise in technical analysis.

Current Data:
- Symbol: {symbol}
- Current Price: ${currentPrice}
- 24h Change: {change24h}%
- Volume: ${volume}
- Market Cap: ${marketCap}
- Historical Prices: {historicalData}

Technical Indicators:
- RSI: {rsi}
- MACD: {macd}
- Moving Averages: {movingAverages}

Market Context:
- Bitcoin Price: ${btcPrice}
- Market Sentiment: {sentiment}
- Recent News: {newsHeadlines}

Task: Provide a {timeframe} price prediction for {symbol} with:
1. Predicted price range (min-max)
2. Most likely price target
3. Confidence score (0-100%)
4. Key factors influencing prediction
5. Risk assessment

Format response as JSON:
{
  "predictedRange": { "min": number, "max": number },
  "targetPrice": number,
  "confidence": number,
  "factors": string[],
  "riskLevel": "low" | "medium" | "high"
}`;
```

#### **Market Sentiment Analysis Prompt**
```typescript
const SENTIMENT_PROMPT = `Analyze cryptocurrency market sentiment for {symbol}.

Social Media Data:
- Twitter mentions: {twitterData}
- Reddit sentiment: {redditData}
- News sentiment: {newsData}

Provide analysis as JSON:
{
  "overallSentiment": "bullish" | "neutral" | "bearish",
  "sentimentScore": number, // -100 to 100
  "keyThemes": string[],
  "socialVolume": "low" | "normal" | "high",
  "influencerOpinions": object[]
}`;
```

### 3. **Caching Strategy**

```typescript
interface CacheConfig {
  pricePredictions: {
    ttl: 3600000, // 1 hour
    maxSize: 100
  },
  sentimentAnalysis: {
    ttl: 1800000, // 30 minutes
    maxSize: 50
  },
  marketOverview: {
    ttl: 900000, // 15 minutes
    maxSize: 10
  }
}

// Redis/Vercel KV implementation
export class PredictionCache {
  async get(key: string): Promise<any> {
    const cached = await kv.get(key);
    if (cached && !this.isExpired(cached)) {
      return cached.data;
    }
    return null;
  }

  async set(key: string, data: any, ttl: number): Promise<void> {
    await kv.set(key, {
      data,
      timestamp: Date.now(),
      ttl
    });
  }
}
```

### 4. **Rate Limiting & Usage Tracking**

```typescript
export class UsageTracker {
  async checkLimit(userId: string, tier: 'free' | 'pro'): Promise<boolean> {
    const limits = {
      free: { daily: 10, hourly: 3 },
      pro: { daily: 1000, hourly: 100 }
    };

    const usage = await this.getUserUsage(userId);
    return usage.daily < limits[tier].daily && 
           usage.hourly < limits[tier].hourly;
  }

  async trackUsage(userId: string, tokens: number): Promise<void> {
    await kv.hincrby(`usage:${userId}:daily`, 'count', 1);
    await kv.hincrby(`usage:${userId}:daily`, 'tokens', tokens);
    // Set expiry for daily reset
    await kv.expire(`usage:${userId}:daily`, 86400);
  }
}
```

### 5. **API Route Structure**

```typescript
// /app/api/predictions/[symbol]/route.ts
export async function POST(
  request: Request,
  { params }: { params: { symbol: string } }
) {
  try {
    // Auth check
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Rate limit check
    const canProceed = await usageTracker.checkLimit(
      session.user.id, 
      session.user.tier
    );
    if (!canProceed) {
      return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 });
    }

    // Get prediction
    const { timeframe } = await request.json();
    const prediction = await claudeService.getPricePrediction(
      params.symbol, 
      timeframe
    );

    // Track usage
    await usageTracker.trackUsage(session.user.id, prediction.tokensUsed);

    return NextResponse.json(prediction);
  } catch (error) {
    console.error('Prediction error:', error);
    return NextResponse.json(
      { error: 'Prediction failed' }, 
      { status: 500 }
    );
  }
}
```

### 6. **Error Handling & Fallbacks**

```typescript
export class PredictionErrorHandler {
  async handleError(error: any, context: PredictionContext): Promise<FallbackResponse> {
    if (error.status === 429) {
      // Claude API rate limit
      return this.getCachedOrHistoricalPrediction(context);
    }
    
    if (error.status === 500) {
      // Claude API error
      return this.getSimpleTechnicalAnalysis(context);
    }

    // Network errors
    if (!navigator.onLine) {
      return this.getOfflinePrediction(context);
    }

    throw error;
  }

  private async getCachedOrHistoricalPrediction(context: PredictionContext) {
    // Return last known good prediction
    const cached = await cache.getLastValid(context.symbol);
    if (cached) {
      return {
        ...cached,
        isStale: true,
        message: "Using recent prediction due to high demand"
      };
    }
  }
}
```

### 7. **Frontend Integration**

```typescript
// Custom hook for predictions
export function usePrediction(symbol: string, timeframe: TimeFrame) {
  return useQuery({
    queryKey: ['prediction', symbol, timeframe],
    queryFn: async () => {
      const response = await fetch(`/api/predictions/${symbol}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ timeframe })
      });

      if (!response.ok) {
        throw new Error('Prediction failed');
      }

      return response.json();
    },
    staleTime: 1000 * 60 * 60, // 1 hour
    retry: 2,
    retryDelay: 1000
  });
}

// Component usage
export function PredictionCard({ symbol }: { symbol: string }) {
  const { data, isLoading, error } = usePrediction(symbol, '24h');
  
  if (isLoading) return <SkeletonLoader />;
  if (error) return <PredictionError />;
  
  return (
    <div className="retro-card">
      <h3>AI Prediction for {symbol}</h3>
      <div className="prediction-range">
        ${data.predictedRange.min} - ${data.predictedRange.max}
      </div>
      <ConfidenceMeter value={data.confidence} />
    </div>
  );
}
```

### 8. **Security Considerations**

```typescript
// API Key Management
const securityConfig = {
  // Never expose API keys to frontend
  apiKeys: {
    anthropic: process.env.ANTHROPIC_API_KEY,
    validation: /^sk-ant-api[0-9]{2}-[a-zA-Z0-9-_]{48}$/
  },
  
  // Input sanitization
  sanitizeSymbol: (symbol: string) => {
    return symbol.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 10);
  },
  
  // Response validation
  validatePrediction: (response: any): boolean => {
    return z.object({
      predictedRange: z.object({
        min: z.number().positive(),
        max: z.number().positive()
      }),
      targetPrice: z.number().positive(),
      confidence: z.number().min(0).max(100),
      factors: z.array(z.string()),
      riskLevel: z.enum(['low', 'medium', 'high'])
    }).safeParse(response).success;
  }
};
```

### 9. **Monitoring & Analytics**

```typescript
export class PredictionAnalytics {
  async trackPredictionAccuracy(
    symbol: string,
    prediction: PredictionResult,
    actualPrice: number
  ): Promise<void> {
    const accuracy = this.calculateAccuracy(prediction, actualPrice);
    
    await analytics.track('prediction_accuracy', {
      symbol,
      timeframe: prediction.timeframe,
      accuracy,
      confidence: prediction.confidence,
      wasCorrect: accuracy > 80
    });
  }

  async getModelPerformance(): Promise<PerformanceMetrics> {
    return {
      avgAccuracy: await this.getAverageAccuracy(),
      bestPerforming: await this.getBestSymbols(),
      worstPerforming: await this.getWorstSymbols(),
      confidenceCorrelation: await this.getConfidenceAccuracyCorrelation()
    };
  }
}
```

## 🚀 Implementation Steps

1. **Setup Anthropic SDK**
   ```bash
   npm install @anthropic-ai/sdk
   ```

2. **Environment Variables**
   ```env
   ANTHROPIC_API_KEY=sk-ant-api...
   VERCEL_KV_URL=...
   VERCEL_KV_REST_API_URL=...
   VERCEL_KV_REST_API_TOKEN=...
   ```

3. **Create Service Classes**
   - ClaudeService for API calls
   - PredictionCache for caching
   - UsageTracker for rate limiting
   - PredictionAnalytics for monitoring

4. **Implement API Routes**
   - `/api/predictions/[symbol]` - Get predictions
   - `/api/sentiment/[symbol]` - Get sentiment
   - `/api/market/overview` - Market analysis

5. **Build UI Components**
   - PredictionCard with confidence meters
   - SentimentGauge with visual indicators
   - PredictionHistory chart
   - Premium upsell modals

## 📊 Cost Optimization

- **Cache Everything**: 1-hour TTL for predictions
- **Batch Requests**: Combine multiple symbols
- **Tiered Prompts**: Shorter for free users
- **Usage Caps**: Daily/hourly limits
- **Prompt Templates**: Reusable, optimized prompts

## 🎯 Success Metrics

- API response time < 2 seconds
- Cache hit rate > 60%
- Prediction accuracy > 70%
- User conversion rate > 5%
- API costs < $0.05 per user/day