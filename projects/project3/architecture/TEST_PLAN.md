# Crypto Vision - Master Test Plan
## 🎯 Coverage Requirements: 95% MINIMUM

### Test Philosophy
**EVERY feature starts with a test. NO EXCEPTIONS.**

## 📊 Coverage Targets

```yaml
Global Requirements:
  branches: 90%
  functions: 90%
  lines: 95%
  statements: 95%

Per Module Requirements:
  lib/predictions: 98%     # Core business logic
  lib/claude: 95%          # AI integration
  lib/websocket: 95%       # Real-time data
  api/routes: 95%          # API endpoints
  components: 90%          # UI components
```

## 🧪 Test Categories

### 1. Unit Tests (60% of all tests)

#### Price Service Tests
```typescript
// src/lib/__tests__/price-service.test.ts
describe('PriceService', () => {
  describe('getCurrentPrice', () => {
    it('should fetch current price from cache first');
    it('should fallback to API if cache miss');
    it('should handle API errors gracefully');
    it('should validate price data format');
    it('should update cache after successful fetch');
  });

  describe('getHistoricalPrices', () => {
    it('should return prices for specified timeframe');
    it('should handle missing data points');
    it('should interpolate gaps in data');
    it('should throw for invalid timeframes');
  });

  describe('calculatePriceChange', () => {
    it('should calculate 24h change correctly');
    it('should handle zero/negative prices');
    it('should format percentage properly');
  });
});
```

#### Prediction Engine Tests
```typescript
// src/lib/__tests__/prediction-engine.test.ts
describe('PredictionEngine', () => {
  describe('generatePrediction', () => {
    it('should aggregate all market indicators');
    it('should call Claude API with correct prompt');
    it('should parse Claude response correctly');
    it('should handle Claude API errors');
    it('should cache predictions for 1 hour');
    it('should validate prediction confidence');
  });

  describe('calculateTechnicalIndicators', () => {
    it('should calculate RSI correctly');
    it('should calculate MACD with proper parameters');
    it('should handle insufficient data gracefully');
    it('should return null for invalid inputs');
  });

  describe('assessMarketSentiment', () => {
    it('should parse fear/greed index');
    it('should weight social mentions appropriately');
    it('should handle missing sentiment data');
  });
});
```

#### Alert System Tests
```typescript
// src/lib/__tests__/alert-system.test.ts
describe('AlertSystem', () => {
  describe('checkAlertConditions', () => {
    it('should trigger when price crosses threshold');
    it('should respect alert cooldown period');
    it('should handle multiple alerts per user');
    it('should not trigger disabled alerts');
  });

  describe('sendAlert', () => {
    it('should send email for email alerts');
    it('should send SMS for premium users');
    it('should retry failed sends');
    it('should log all alert attempts');
  });
});
```

### 2. Integration Tests (25% of all tests)

#### API Route Tests
```typescript
// src/api/__tests__/predictions.test.ts
describe('POST /api/predictions', () => {
  it('should require authentication');
  it('should validate request body');
  it('should rate limit requests');
  it('should return prediction with confidence');
  it('should track API usage');
  it('should handle concurrent requests');
});

describe('GET /api/prices/:symbol', () => {
  it('should return real-time price');
  it('should include 24h change');
  it('should cache response appropriately');
  it('should handle unknown symbols');
});
```

#### WebSocket Tests
```typescript
// src/lib/__tests__/websocket.integration.test.ts
describe('WebSocket Integration', () => {
  it('should connect to Binance stream');
  it('should reconnect on disconnect');
  it('should handle malformed messages');
  it('should update prices in real-time');
  it('should scale to 1000 connections');
});
```

#### Database Tests
```typescript
// src/lib/__tests__/database.integration.test.ts
describe('Database Operations', () => {
  it('should save predictions with proper indexing');
  it('should handle concurrent writes');
  it('should enforce unique constraints');
  it('should clean up old predictions');
  it('should handle connection pool exhaustion');
});
```

### 3. E2E Tests (10% of all tests)

#### Critical User Flows
```typescript
// tests/e2e/user-flows.spec.ts
test.describe('Prediction Flow', () => {
  test('user can view BTC prediction', async ({ page }) => {
    await page.goto('/');
    await page.click('text=Bitcoin');
    await expect(page.locator('.prediction-chart')).toBeVisible();
    await expect(page.locator('.confidence-score')).toContainText('%');
  });

  test('user can set price alert', async ({ page }) => {
    await loginUser(page);
    await page.goto('/alerts');
    await page.click('text=New Alert');
    await page.fill('#coin', 'BTC');
    await page.fill('#threshold', '50000');
    await page.click('text=Save');
    await expect(page.locator('.alert-saved')).toBeVisible();
  });

  test('user can upgrade to premium', async ({ page }) => {
    await loginUser(page);
    await page.goto('/pricing');
    await page.click('text=Upgrade to Premium');
    await fillPaymentForm(page);
    await expect(page.locator('.premium-badge')).toBeVisible();
  });
});
```

### 4. Performance Tests (5% of all tests)

#### Load Tests
```typescript
// tests/performance/load.test.ts
describe('Performance Benchmarks', () => {
  it('should handle 10k concurrent WebSocket connections');
  it('should serve predictions in <100ms (p95)');
  it('should process 1000 alerts/second');
  it('should maintain <2s page load time');
});
```

## 🏗️ Test Infrastructure

### Test Database
```typescript
// tests/helpers/test-db.ts
export async function setupTestDB() {
  const db = postgres('postgresql://test:test@localhost:5432/crypto_vision_test');
  await db.sql`TRUNCATE TABLE users, predictions, alerts CASCADE`;
  return db;
}

export async function seedTestData(db: Database) {
  await db.sql`
    INSERT INTO users (email, tier) VALUES 
    ('free@test.com', 'free'),
    ('pro@test.com', 'pro'),
    ('premium@test.com', 'premium')
  `;
}
```

### Mock Services
```typescript
// tests/mocks/claude.mock.ts
export const mockClaudeAPI = {
  generatePrediction: jest.fn().mockResolvedValue({
    sevenDayTarget: 52000,
    thirtyDayTarget: 58000,
    confidence: 75,
    direction: 'buy',
    keyFactors: ['RSI oversold', 'MACD bullish crossover']
  })
};

// tests/mocks/websocket.mock.ts
export class MockWebSocket {
  onmessage: ((event: MessageEvent) => void) | null = null;
  
  constructor(public url: string) {
    setTimeout(() => {
      this.simulateMessage({
        s: 'BTCUSDT',
        p: '45000.00'
      });
    }, 100);
  }
  
  simulateMessage(data: any) {
    if (this.onmessage) {
      this.onmessage(new MessageEvent('message', { data: JSON.stringify(data) }));
    }
  }
}
```

### Test Utilities
```typescript
// tests/utils/test-helpers.ts
export function generateMockPriceData(days: number) {
  const prices = [];
  let price = 40000 + Math.random() * 10000;
  
  for (let i = 0; i < days * 24; i++) {
    price += (Math.random() - 0.5) * 1000;
    prices.push({
      timestamp: Date.now() - (i * 3600000),
      price: Math.max(price, 100),
      volume: Math.random() * 1000000000
    });
  }
  
  return prices;
}

export function expectPredictionFormat(prediction: any) {
  expect(prediction).toMatchObject({
    sevenDayTarget: expect.any(Number),
    thirtyDayTarget: expect.any(Number),
    confidence: expect.any(Number),
    direction: expect.stringMatching(/buy|sell|neutral|strong_buy|strong_sell/),
    keyFactors: expect.arrayContaining([expect.any(String)])
  });
}
```

## 📋 Test Execution Strategy

### Local Development
```bash
# Run all tests with coverage
npm test -- --coverage

# Run specific test file
npm test price-service.test.ts

# Run tests in watch mode
npm test -- --watch

# Run only unit tests
npm test -- --testPathPattern=unit

# Generate coverage report
npm run coverage:report
```

### CI Pipeline
```yaml
test:
  script:
    - npm ci
    - npm run test:unit -- --coverage
    - npm run test:integration
    - npm run test:e2e
    - npm run test:performance
  coverage: '/Lines\s*:\s*(\d+\.\d+)%/'
  artifacts:
    reports:
      coverage_report:
        coverage_format: cobertura
        path: coverage/cobertura-coverage.xml
```

## 📊 Coverage Monitoring

### Real-time Dashboard
```typescript
// Show these metrics on monitoring dashboard
interface TestMetrics {
  totalTests: number;
  passingTests: number;
  failingTests: number;
  coveragePercent: {
    lines: number;
    branches: number;
    functions: number;
    statements: number;
  };
  testExecutionTime: number;
  lastTestRun: Date;
}
```

### Coverage Trends
Track daily coverage percentage - MUST NEVER GO DOWN!

### Failure Alerts
- Any test failure blocks deployment
- Coverage drop below 95% triggers alert
- Test execution time >5min triggers optimization

## 🚨 Test Enforcement Rules

1. **NO code without tests** - Write test first, then code
2. **NO commits below 95%** - Pre-commit hook enforces this
3. **NO "todo" tests** - All tests must have implementations
4. **NO skipped tests** - Fix or remove, don't skip
5. **NO console.logs** - Use proper test assertions
6. **NO hardcoded waits** - Use proper async handling
7. **NO external dependencies** - Mock all external services

## 📈 Success Metrics

### Daily Goals
- [ ] 50+ new tests written
- [ ] 0 failing tests
- [ ] Coverage ≥ 95%
- [ ] All PRs have tests

### Weekly Goals
- [ ] 300+ total tests
- [ ] <5min total test runtime
- [ ] 0 flaky tests
- [ ] 100% critical path coverage

## 🎯 Test-First Workflow

```mermaid
graph LR
    A[Read Feature Spec] --> B[Write Failing Test]
    B --> C[Run Test - Confirm Fail]
    C --> D[Write Minimal Code]
    D --> E[Run Test - Confirm Pass]
    E --> F[Refactor if Needed]
    F --> G[Check Coverage]
    G --> H{Coverage ≥ 95%?}
    H -->|No| B
    H -->|Yes| I[Commit]
```

**REMEMBER: A feature without tests is a bug waiting to happen!**