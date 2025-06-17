# Crypto Vision - Testable API Specification

## 🎯 API Design Philosophy: Contract-First Testing

Every endpoint is designed with:
1. **Request/Response contracts with validation**
2. **Test scenarios covering all edge cases**
3. **Performance benchmarks and rate limits**
4. **Mock responses for testing**
5. **Error scenarios and recovery paths**

## 📡 Core API Architecture

### Base Configuration
```typescript
// API Base URL
const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'https://api.cryptovision.ai/v1';

// Rate Limiting Tiers
const RATE_LIMITS = {
  free: { requests_per_hour: 100, burst: 10 },
  pro: { requests_per_hour: 1000, burst: 50 },
  premium: { requests_per_hour: 10000, burst: 200 }
};

// Response Time SLAs
const PERFORMANCE_TARGETS = {
  simple_endpoints: 100,    // ms
  prediction_endpoints: 2000, // ms (includes Claude API)
  analytics_endpoints: 500   // ms
};
```

## 🔐 Authentication

### POST /api/auth/login
Login with email and password, returns JWT token.

#### Contract
```typescript
interface LoginRequest {
  email: string;
  password: string;
}

interface LoginResponse {
  token: string;
  user: {
    id: string;
    email: string;
    tier: 'free' | 'pro' | 'premium';
  };
  expiresAt: string; // ISO 8601
}
```

#### Test Scenarios
```typescript
// src/api/__tests__/auth/login.test.ts
describe('POST /api/auth/login', () => {
  // Success cases
  it('should login with valid credentials', async () => {
    const response = await request(app)
      .post('/api/auth/login')
      .send({ email: 'test@example.com', password: 'validPassword123!' });
    
    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      token: expect.stringMatching(/^eyJ/), // JWT format
      user: {
        id: expect.any(String),
        email: 'test@example.com',
        tier: expect.stringMatching(/free|pro|premium/)
      },
      expiresAt: expect.any(String)
    });
    
    // Verify token is valid
    const decoded = jwt.verify(response.body.token, process.env.JWT_SECRET);
    expect(decoded.userId).toBe(response.body.user.id);
  });
  
  // Validation cases
  it('should reject invalid email format', async () => {
    const response = await request(app)
      .post('/api/auth/login')
      .send({ email: 'notanemail', password: 'password123' });
    
    expect(response.status).toBe(400);
    expect(response.body).toMatchObject({
      error: 'INVALID_EMAIL',
      message: 'Email format is invalid'
    });
  });
  
  it('should reject missing password', async () => {
    const response = await request(app)
      .post('/api/auth/login')
      .send({ email: 'test@example.com' });
    
    expect(response.status).toBe(400);
    expect(response.body.error).toBe('MISSING_PASSWORD');
  });
  
  // Security cases
  it('should rate limit after 5 failed attempts', async () => {
    const email = 'bruteforce@test.com';
    
    // Make 5 failed attempts
    for (let i = 0; i < 5; i++) {
      await request(app)
        .post('/api/auth/login')
        .send({ email, password: 'wrongpassword' });
    }
    
    // 6th attempt should be rate limited
    const response = await request(app)
      .post('/api/auth/login')
      .send({ email, password: 'wrongpassword' });
    
    expect(response.status).toBe(429);
    expect(response.body).toMatchObject({
      error: 'RATE_LIMITED',
      retryAfter: expect.any(Number)
    });
  });
  
  it('should prevent timing attacks', async () => {
    const timings = [];
    
    // Time valid user with wrong password
    const start1 = Date.now();
    await request(app)
      .post('/api/auth/login')
      .send({ email: 'existing@test.com', password: 'wrongpassword' });
    timings.push(Date.now() - start1);
    
    // Time non-existent user
    const start2 = Date.now();
    await request(app)
      .post('/api/auth/login')
      .send({ email: 'nonexistent@test.com', password: 'wrongpassword' });
    timings.push(Date.now() - start2);
    
    // Response times should be similar (within 50ms)
    expect(Math.abs(timings[0] - timings[1])).toBeLessThan(50);
  });
  
  // Performance cases
  it('should respond within 200ms', async () => {
    const start = Date.now();
    await request(app)
      .post('/api/auth/login')
      .send({ email: 'test@example.com', password: 'password123' });
    const duration = Date.now() - start;
    
    expect(duration).toBeLessThan(200);
  });
});
```

## 💰 Predictions API

### GET /api/predictions/:coin
Get latest AI prediction for a specific cryptocurrency.

#### Contract
```typescript
interface PredictionResponse {
  coin: string;
  currentPrice: number;
  lastUpdated: string;
  prediction: {
    sevenDay: {
      target: number;
      changePercent: number;
      direction: 'strong_buy' | 'buy' | 'neutral' | 'sell' | 'strong_sell';
    };
    thirtyDay: {
      target: number;
      changePercent: number;
      direction: 'strong_buy' | 'buy' | 'neutral' | 'sell' | 'strong_sell';
    };
    confidence: number; // 0-100
    keyFactors: string[];
    riskAssessment: string;
    lastAnalyzed: string;
  };
  technicalIndicators: {
    rsi: number;
    macd: { signal: number; histogram: number };
    bollingerBands: { upper: number; lower: number; middle: number };
  };
}
```

#### Test Scenarios
```typescript
// src/api/__tests__/predictions/get-prediction.test.ts
describe('GET /api/predictions/:coin', () => {
  // Success cases
  it('should return prediction for valid coin', async () => {
    const response = await request(app)
      .get('/api/predictions/BTC')
      .set('Authorization', `Bearer ${validToken}`);
    
    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      coin: 'BTC',
      currentPrice: expect.any(Number),
      prediction: {
        sevenDay: {
          target: expect.any(Number),
          changePercent: expect.any(Number),
          direction: expect.stringMatching(/strong_buy|buy|neutral|sell|strong_sell/)
        },
        confidence: expect.numberBetween(0, 100),
        keyFactors: expect.arrayContaining([expect.any(String)])
      }
    });
  });
  
  // Cache testing
  it('should return cached prediction within TTL', async () => {
    // First request
    const response1 = await request(app)
      .get('/api/predictions/BTC')
      .set('Authorization', `Bearer ${validToken}`);
    
    // Second request immediately after
    const response2 = await request(app)
      .get('/api/predictions/BTC')
      .set('Authorization', `Bearer ${validToken}`);
    
    // Should return same prediction (cached)
    expect(response2.body.prediction.lastAnalyzed)
      .toBe(response1.body.prediction.lastAnalyzed);
    
    // Response should be faster due to cache
    expect(response2.headers['x-cache']).toBe('HIT');
  });
  
  // Authorization testing
  it('should enforce tier limits', async () => {
    const freeUserToken = await getTokenForTier('free');
    
    // Free users can only access top 10 coins
    const response = await request(app)
      .get('/api/predictions/OBSCURECOIN')
      .set('Authorization', `Bearer ${freeUserToken}`);
    
    expect(response.status).toBe(403);
    expect(response.body).toMatchObject({
      error: 'TIER_LIMIT',
      message: 'Upgrade to Pro to access more cryptocurrencies',
      upgradeUrl: '/pricing'
    });
  });
  
  // Error cases
  it('should handle Claude API failures gracefully', async () => {
    // Mock Claude API to fail
    mockClaudeAPI.failNext();
    
    const response = await request(app)
      .get('/api/predictions/BTC')
      .set('Authorization', `Bearer ${validToken}`);
    
    expect(response.status).toBe(503);
    expect(response.body).toMatchObject({
      error: 'PREDICTION_UNAVAILABLE',
      message: 'Unable to generate prediction at this time',
      retryAfter: 60
    });
  });
  
  // Performance testing
  it('should generate prediction within 2 seconds', async () => {
    const start = Date.now();
    const response = await request(app)
      .get('/api/predictions/BTC')
      .set('Authorization', `Bearer ${validToken}`)
      .set('X-No-Cache', 'true'); // Force fresh prediction
    
    const duration = Date.now() - start;
    
    expect(response.status).toBe(200);
    expect(duration).toBeLessThan(2000);
  });
  
  // Input validation
  it('should validate coin symbol format', async () => {
    const invalidSymbols = ['BTC!', '123', 'WAYTOOLONGCOIN', ''];
    
    for (const symbol of invalidSymbols) {
      const response = await request(app)
        .get(`/api/predictions/${symbol}`)
        .set('Authorization', `Bearer ${validToken}`);
      
      expect(response.status).toBe(400);
      expect(response.body.error).toBe('INVALID_COIN_SYMBOL');
    }
  });
});
```

### POST /api/predictions/batch
Get predictions for multiple cryptocurrencies (premium feature).

#### Contract
```typescript
interface BatchPredictionRequest {
  coins: string[]; // Max 50 for premium
}

interface BatchPredictionResponse {
  predictions: {
    [coin: string]: {
      currentPrice: number;
      sevenDayTarget: number;
      thirtyDayTarget: number;
      confidence: number;
      direction: string;
    };
  };
  generated: string;
  ttl: number; // seconds until refresh
}
```

#### Test Scenarios
```typescript
describe('POST /api/predictions/batch', () => {
  it('should return predictions for multiple coins', async () => {
    const response = await request(app)
      .post('/api/predictions/batch')
      .set('Authorization', `Bearer ${premiumToken}`)
      .send({ coins: ['BTC', 'ETH', 'SOL'] });
    
    expect(response.status).toBe(200);
    expect(Object.keys(response.body.predictions)).toHaveLength(3);
    expect(response.body.predictions.BTC).toBeDefined();
  });
  
  it('should enforce batch size limits by tier', async () => {
    const freeToken = await getTokenForTier('free');
    
    const response = await request(app)
      .post('/api/predictions/batch')
      .set('Authorization', `Bearer ${freeToken}`)
      .send({ coins: ['BTC', 'ETH', 'SOL'] }); // 3 coins
    
    expect(response.status).toBe(403);
    expect(response.body.error).toBe('BATCH_NOT_AVAILABLE');
  });
  
  it('should handle partial failures', async () => {
    mockClaudeAPI.failForCoin('ETH');
    
    const response = await request(app)
      .post('/api/predictions/batch')
      .set('Authorization', `Bearer ${premiumToken}`)
      .send({ coins: ['BTC', 'ETH', 'SOL'] });
    
    expect(response.status).toBe(207); // Multi-status
    expect(response.body.predictions.BTC).toBeDefined();
    expect(response.body.predictions.SOL).toBeDefined();
    expect(response.body.errors.ETH).toBe('PREDICTION_FAILED');
  });
});
```

## 🔔 Alerts API

### POST /api/alerts
Create a new price alert.

#### Contract
```typescript
interface CreateAlertRequest {
  coin: string;
  type: 'price_above' | 'price_below' | 'change_percent' | 'prediction_confidence';
  threshold: number;
  notificationMethod: 'email' | 'sms' | 'webhook';
}

interface CreateAlertResponse {
  id: string;
  coin: string;
  type: string;
  threshold: number;
  isActive: true;
  createdAt: string;
  estimatedTriggerTime: string | null;
}
```

#### Test Scenarios
```typescript
describe('POST /api/alerts', () => {
  // Validation tests
  it('should validate threshold values', async () => {
    const response = await request(app)
      .post('/api/alerts')
      .set('Authorization', `Bearer ${validToken}`)
      .send({
        coin: 'BTC',
        type: 'price_above',
        threshold: -100, // Invalid negative price
        notificationMethod: 'email'
      });
    
    expect(response.status).toBe(400);
    expect(response.body.error).toBe('INVALID_THRESHOLD');
  });
  
  // Tier enforcement
  it('should enforce alert limits by tier', async () => {
    const freeToken = await getTokenForTier('free');
    
    // Create 5 alerts (free tier limit)
    for (let i = 0; i < 5; i++) {
      await createAlert(freeToken, { threshold: 40000 + i * 1000 });
    }
    
    // 6th alert should fail
    const response = await request(app)
      .post('/api/alerts')
      .set('Authorization', `Bearer ${freeToken}`)
      .send({
        coin: 'BTC',
        type: 'price_above',
        threshold: 50000,
        notificationMethod: 'email'
      });
    
    expect(response.status).toBe(403);
    expect(response.body).toMatchObject({
      error: 'ALERT_LIMIT_REACHED',
      message: 'Free tier limited to 5 alerts. Upgrade for more.',
      currentCount: 5,
      limit: 5
    });
  });
  
  // SMS validation
  it('should only allow SMS for pro/premium tiers', async () => {
    const freeToken = await getTokenForTier('free');
    
    const response = await request(app)
      .post('/api/alerts')
      .set('Authorization', `Bearer ${freeToken}`)
      .send({
        coin: 'BTC',
        type: 'price_above',
        threshold: 50000,
        notificationMethod: 'sms'
      });
    
    expect(response.status).toBe(403);
    expect(response.body.error).toBe('SMS_NOT_AVAILABLE');
  });
  
  // Duplicate prevention
  it('should prevent duplicate alerts', async () => {
    const alertData = {
      coin: 'BTC',
      type: 'price_above',
      threshold: 50000,
      notificationMethod: 'email'
    };
    
    // Create first alert
    await request(app)
      .post('/api/alerts')
      .set('Authorization', `Bearer ${validToken}`)
      .send(alertData);
    
    // Try to create duplicate
    const response = await request(app)
      .post('/api/alerts')
      .set('Authorization', `Bearer ${validToken}`)
      .send(alertData);
    
    expect(response.status).toBe(409);
    expect(response.body.error).toBe('DUPLICATE_ALERT');
  });
});
```

### DELETE /api/alerts/:id
Delete an alert.

#### Test Scenarios
```typescript
describe('DELETE /api/alerts/:id', () => {
  it('should delete own alert', async () => {
    const alert = await createTestAlert(userId);
    
    const response = await request(app)
      .delete(`/api/alerts/${alert.id}`)
      .set('Authorization', `Bearer ${validToken}`);
    
    expect(response.status).toBe(204);
    
    // Verify deleted
    const getResponse = await request(app)
      .get(`/api/alerts/${alert.id}`)
      .set('Authorization', `Bearer ${validToken}`);
    
    expect(getResponse.status).toBe(404);
  });
  
  it('should not delete other users alerts', async () => {
    const otherUserAlert = await createTestAlert(otherUserId);
    
    const response = await request(app)
      .delete(`/api/alerts/${otherUserAlert.id}`)
      .set('Authorization', `Bearer ${validToken}`);
    
    expect(response.status).toBe(403);
  });
});
```

## 📊 Analytics API

### GET /api/analytics/accuracy
Get prediction accuracy statistics.

#### Contract
```typescript
interface AccuracyResponse {
  overall: {
    sevenDay: { accuracy: number; sampleSize: number };
    thirtyDay: { accuracy: number; sampleSize: number };
  };
  byCoins: {
    [coin: string]: {
      sevenDay: { accuracy: number; sampleSize: number };
      thirtyDay: { accuracy: number; sampleSize: number };
    };
  };
  byTimeframe: {
    [date: string]: { accuracy: number; predictions: number };
  };
}
```

#### Test Scenarios
```typescript
describe('GET /api/analytics/accuracy', () => {
  beforeEach(async () => {
    // Seed historical predictions with known outcomes
    await seedHistoricalPredictions({
      count: 1000,
      accuracyRange: [60, 80],
      daysBack: 60
    });
  });
  
  it('should calculate accuracy correctly', async () => {
    const response = await request(app)
      .get('/api/analytics/accuracy')
      .set('Authorization', `Bearer ${validToken}`);
    
    expect(response.status).toBe(200);
    expect(response.body.overall.sevenDay.accuracy).toBeGreaterThan(0);
    expect(response.body.overall.sevenDay.accuracy).toBeLessThan(100);
    expect(response.body.overall.sevenDay.sampleSize).toBeGreaterThan(0);
  });
  
  it('should cache analytics for performance', async () => {
    // First request
    const start1 = Date.now();
    await request(app)
      .get('/api/analytics/accuracy')
      .set('Authorization', `Bearer ${validToken}`);
    const duration1 = Date.now() - start1;
    
    // Second request (should be cached)
    const start2 = Date.now();
    const response2 = await request(app)
      .get('/api/analytics/accuracy')
      .set('Authorization', `Bearer ${validToken}`);
    const duration2 = Date.now() - start2;
    
    expect(response2.headers['x-cache']).toBe('HIT');
    expect(duration2).toBeLessThan(duration1 / 2); // Much faster
  });
});
```

## 🔄 WebSocket API

### WS /api/ws
Real-time price updates via WebSocket.

#### Contract
```typescript
// Client -> Server
interface SubscribeMessage {
  action: 'subscribe' | 'unsubscribe';
  coins: string[];
}

// Server -> Client
interface PriceUpdateMessage {
  type: 'price_update';
  data: {
    coin: string;
    price: number;
    change24h: number;
    volume24h: number;
    timestamp: string;
  };
}

interface PredictionUpdateMessage {
  type: 'prediction_update';
  data: {
    coin: string;
    confidence: number;
    direction: string;
  };
}
```

#### Test Scenarios
```typescript
// src/api/__tests__/websocket/websocket.test.ts
describe('WebSocket API', () => {
  let ws: WebSocket;
  
  beforeEach(() => {
    ws = new WebSocket('ws://localhost:3000/api/ws', {
      headers: { Authorization: `Bearer ${validToken}` }
    });
  });
  
  afterEach(() => {
    ws.close();
  });
  
  it('should receive price updates after subscribing', (done) => {
    ws.on('open', () => {
      ws.send(JSON.stringify({
        action: 'subscribe',
        coins: ['BTC', 'ETH']
      }));
    });
    
    ws.on('message', (data) => {
      const message = JSON.parse(data.toString());
      expect(message.type).toBe('price_update');
      expect(['BTC', 'ETH']).toContain(message.data.coin);
      expect(message.data.price).toBeGreaterThan(0);
      done();
    });
  });
  
  it('should handle reconnection gracefully', async () => {
    const messages = [];
    
    ws.on('message', (data) => {
      messages.push(JSON.parse(data.toString()));
    });
    
    // Subscribe
    ws.send(JSON.stringify({
      action: 'subscribe',
      coins: ['BTC']
    }));
    
    // Simulate disconnect
    ws.close();
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // Reconnect
    ws = new WebSocket('ws://localhost:3000/api/ws', {
      headers: { Authorization: `Bearer ${validToken}` }
    });
    
    // Should resume receiving updates
    await new Promise(resolve => {
      ws.on('message', () => resolve(true));
    });
    
    expect(messages.length).toBeGreaterThan(0);
  });
  
  it('should rate limit subscriptions', async () => {
    const coins = Array(100).fill(null).map((_, i) => `COIN${i}`);
    
    ws.on('open', () => {
      ws.send(JSON.stringify({
        action: 'subscribe',
        coins: coins // Too many coins
      }));
    });
    
    const errorMessage = await new Promise(resolve => {
      ws.on('message', (data) => {
        const message = JSON.parse(data.toString());
        if (message.type === 'error') {
          resolve(message);
        }
      });
    });
    
    expect(errorMessage).toMatchObject({
      type: 'error',
      error: 'SUBSCRIPTION_LIMIT',
      message: 'Maximum 20 simultaneous subscriptions allowed'
    });
  });
  
  it('should handle 1000 concurrent connections', async () => {
    const connections = [];
    
    // Create 1000 connections
    for (let i = 0; i < 1000; i++) {
      const ws = new WebSocket('ws://localhost:3000/api/ws', {
        headers: { Authorization: `Bearer ${validToken}` }
      });
      connections.push(ws);
    }
    
    // Wait for all to connect
    await Promise.all(
      connections.map(ws => 
        new Promise(resolve => ws.on('open', resolve))
      )
    );
    
    // All should be connected
    const openConnections = connections.filter(ws => ws.readyState === WebSocket.OPEN);
    expect(openConnections.length).toBe(1000);
    
    // Cleanup
    connections.forEach(ws => ws.close());
  });
});
```

## 🏎️ Performance Test Harness

### Load Testing Configuration
```typescript
// tests/performance/api-load-test.ts
import autocannon from 'autocannon';

describe('API Load Tests', () => {
  const scenarios = [
    {
      name: 'Prediction Endpoint',
      url: '/api/predictions/BTC',
      connections: 100,
      duration: 30,
      expectedRPS: 1000,
      expectedP95: 200
    },
    {
      name: 'Batch Predictions',
      url: '/api/predictions/batch',
      method: 'POST',
      body: JSON.stringify({ coins: ['BTC', 'ETH', 'SOL'] }),
      connections: 50,
      duration: 30,
      expectedRPS: 100,
      expectedP95: 2000
    }
  ];
  
  scenarios.forEach(scenario => {
    it(`should handle load for ${scenario.name}`, async () => {
      const result = await autocannon({
        url: `http://localhost:3000${scenario.url}`,
        connections: scenario.connections,
        duration: scenario.duration,
        headers: {
          Authorization: `Bearer ${loadTestToken}`,
          'Content-Type': 'application/json'
        },
        method: scenario.method || 'GET',
        body: scenario.body
      });
      
      expect(result.requests.average).toBeGreaterThan(scenario.expectedRPS);
      expect(result.latency.p95).toBeLessThan(scenario.expectedP95);
      expect(result.errors).toBe(0);
    });
  });
});
```

## 🧪 Mock API Server

### Test Mock Implementation
```typescript
// tests/mocks/api-server.mock.ts
export class MockAPIServer {
  private responses: Map<string, any> = new Map();
  private delays: Map<string, number> = new Map();
  private failureRates: Map<string, number> = new Map();
  
  constructor() {
    this.setupDefaultResponses();
  }
  
  setupDefaultResponses() {
    // Prediction response
    this.responses.set('GET:/api/predictions/:coin', (params) => ({
      coin: params.coin,
      currentPrice: this.generatePrice(params.coin),
      prediction: {
        sevenDay: {
          target: this.generatePrice(params.coin) * 1.05,
          changePercent: 5,
          direction: 'buy'
        },
        thirtyDay: {
          target: this.generatePrice(params.coin) * 1.15,
          changePercent: 15,
          direction: 'strong_buy'
        },
        confidence: 75,
        keyFactors: ['RSI oversold', 'MACD bullish'],
        lastAnalyzed: new Date().toISOString()
      }
    }));
    
    // Auth response
    this.responses.set('POST:/api/auth/login', (body) => ({
      token: 'mock_jwt_token_' + Date.now(),
      user: {
        id: 'mock_user_id',
        email: body.email,
        tier: 'pro'
      },
      expiresAt: new Date(Date.now() + 3600000).toISOString()
    }));
  }
  
  setResponseDelay(endpoint: string, delayMs: number) {
    this.delays.set(endpoint, delayMs);
  }
  
  setFailureRate(endpoint: string, rate: number) {
    this.failureRates.set(endpoint, rate);
  }
  
  async handleRequest(method: string, path: string, body?: any) {
    const endpoint = `${method}:${path}`;
    
    // Simulate failure
    const failureRate = this.failureRates.get(endpoint) || 0;
    if (Math.random() < failureRate) {
      throw new Error('Simulated API failure');
    }
    
    // Simulate delay
    const delay = this.delays.get(endpoint) || 0;
    if (delay > 0) {
      await new Promise(resolve => setTimeout(resolve, delay));
    }
    
    // Return mock response
    const responseGenerator = this.responses.get(endpoint);
    if (!responseGenerator) {
      throw new Error(`No mock response for ${endpoint}`);
    }
    
    return responseGenerator(body);
  }
  
  private generatePrice(coin: string): number {
    const basePrices = {
      BTC: 45000,
      ETH: 3000,
      SOL: 100,
      MATIC: 1.5
    };
    
    const base = basePrices[coin] || 100;
    return base * (0.95 + Math.random() * 0.1); // ±5% variation
  }
}
```

## 📋 API Testing Checklist

### For Every Endpoint
- [ ] Request validation (all fields)
- [ ] Response format validation
- [ ] Authentication/authorization
- [ ] Rate limiting
- [ ] Error scenarios (4xx, 5xx)
- [ ] Performance benchmarks
- [ ] Concurrent request handling
- [ ] Cache behavior
- [ ] Security (injection, XSS, etc.)
- [ ] Tier-based access control

### Integration Test Suite
```bash
# Run all API tests
npm run test:api

# Run with coverage
npm run test:api -- --coverage

# Run specific endpoint tests
npm run test:api -- predictions

# Run load tests
npm run test:load

# Run security tests
npm run test:security
```

## 🔒 Security Test Specifications

### API Security Tests
```typescript
describe('API Security', () => {
  it('should prevent SQL injection in all endpoints', async () => {
    const maliciousInputs = [
      "'; DROP TABLE users; --",
      "1' OR '1'='1",
      "<script>alert('xss')</script>"
    ];
    
    for (const input of maliciousInputs) {
      const response = await request(app)
        .get(`/api/predictions/${input}`)
        .set('Authorization', `Bearer ${validToken}`);
      
      // Should handle gracefully, not execute
      expect(response.status).toBe(400);
      expect(response.body.error).toBe('INVALID_COIN_SYMBOL');
    }
  });
  
  it('should validate JWT signatures', async () => {
    const tamperedToken = validToken.slice(0, -1) + 'X'; // Tamper with signature
    
    const response = await request(app)
      .get('/api/predictions/BTC')
      .set('Authorization', `Bearer ${tamperedToken}`);
    
    expect(response.status).toBe(401);
    expect(response.body.error).toBe('INVALID_TOKEN');
  });
  
  it('should enforce CORS policy', async () => {
    const response = await request(app)
      .get('/api/predictions/BTC')
      .set('Origin', 'http://malicious-site.com')
      .set('Authorization', `Bearer ${validToken}`);
    
    expect(response.headers['access-control-allow-origin'])
      .not.toBe('http://malicious-site.com');
  });
});
```

This comprehensive API specification ensures every endpoint is thoroughly tested with multiple scenarios, performance benchmarks, and security considerations. Each test is designed to be maintainable and provides clear coverage metrics for our 95% requirement.