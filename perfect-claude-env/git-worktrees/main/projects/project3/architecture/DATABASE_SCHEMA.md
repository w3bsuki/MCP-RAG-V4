# Crypto Vision - Testable Database Schema

## 🎯 Design Philosophy: Test-First Database Architecture

Every table, column, and constraint is designed with testing in mind. Each schema element includes:
1. Test data generators
2. Validation rules with test cases
3. Performance benchmarks
4. Edge case scenarios

## 📊 Core Schema Design

### Users Table
```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) NOT NULL UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  tier VARCHAR(20) NOT NULL DEFAULT 'free' CHECK (tier IN ('free', 'pro', 'premium')),
  stripe_customer_id VARCHAR(255) UNIQUE,
  api_key_hash VARCHAR(255) UNIQUE,
  notification_preferences JSONB DEFAULT '{"email": true, "sms": false, "webhook": false}'::jsonb,
  
  -- Test-specific columns
  is_test_user BOOLEAN DEFAULT FALSE,
  test_scenario VARCHAR(100) -- e.g., 'high_volume', 'rate_limit', 'payment_failure'
);

-- Indexes for performance testing
CREATE INDEX idx_users_tier ON users(tier);
CREATE INDEX idx_users_created ON users(created_at);
CREATE INDEX idx_users_test ON users(is_test_user) WHERE is_test_user = TRUE;
```

#### Test Data Generator
```typescript
// src/lib/__tests__/generators/user.generator.ts
export function generateTestUser(scenario: TestScenario = 'default'): UserData {
  const scenarios = {
    default: {
      email: faker.internet.email(),
      tier: 'free',
      notification_preferences: { email: true, sms: false, webhook: false }
    },
    premium: {
      email: `premium_${faker.datatype.uuid()}@test.com`,
      tier: 'premium',
      stripe_customer_id: `cus_test_${faker.datatype.uuid()}`,
      api_key_hash: generateApiKeyHash(),
      notification_preferences: { email: true, sms: true, webhook: true }
    },
    rate_limited: {
      email: `rate_limit_${faker.datatype.uuid()}@test.com`,
      tier: 'free',
      test_scenario: 'rate_limit'
    },
    high_volume: {
      email: `high_volume_${faker.datatype.uuid()}@test.com`,
      tier: 'premium',
      test_scenario: 'high_volume'
    }
  };
  
  return {
    ...scenarios[scenario],
    is_test_user: true,
    created_at: faker.date.past()
  };
}

// Bulk generator for load testing
export function generateBulkUsers(count: number, distribution = {
  free: 0.7,
  pro: 0.2,
  premium: 0.1
}): UserData[] {
  const users = [];
  
  for (let i = 0; i < count; i++) {
    const rand = Math.random();
    let tier = 'free';
    
    if (rand > 0.7 && rand <= 0.9) tier = 'pro';
    else if (rand > 0.9) tier = 'premium';
    
    users.push(generateTestUser(tier as any));
  }
  
  return users;
}
```

#### Validation Tests
```typescript
// src/lib/__tests__/validation/user.validation.test.ts
describe('User Table Validation', () => {
  describe('Email Validation', () => {
    it('should reject invalid email formats', async () => {
      const invalidEmails = ['notanemail', '@test.com', 'test@', 'test..@test.com'];
      
      for (const email of invalidEmails) {
        await expect(db.query(
          'INSERT INTO users (email) VALUES ($1)',
          [email]
        )).rejects.toThrow(/invalid email/);
      }
    });
    
    it('should enforce unique emails', async () => {
      const email = 'duplicate@test.com';
      await createTestUser({ email });
      
      await expect(createTestUser({ email }))
        .rejects.toThrow(/duplicate key value/);
    });
  });
  
  describe('Tier Validation', () => {
    it('should only allow valid tiers', async () => {
      await expect(createTestUser({ tier: 'invalid' }))
        .rejects.toThrow(/check constraint/);
    });
  });
});
```

### Predictions Table
```sql
CREATE TABLE predictions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  coin_symbol VARCHAR(10) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Prediction data
  current_price DECIMAL(20,8) NOT NULL CHECK (current_price > 0),
  seven_day_target DECIMAL(20,8) NOT NULL CHECK (seven_day_target > 0),
  thirty_day_target DECIMAL(20,8) NOT NULL CHECK (thirty_day_target > 0),
  confidence INTEGER NOT NULL CHECK (confidence >= 0 AND confidence <= 100),
  direction VARCHAR(20) NOT NULL CHECK (direction IN ('strong_buy', 'buy', 'neutral', 'sell', 'strong_sell')),
  
  -- Context data for testing reproducibility
  market_context JSONB NOT NULL,
  technical_indicators JSONB NOT NULL,
  claude_response JSONB NOT NULL,
  
  -- Accuracy tracking
  seven_day_actual DECIMAL(20,8),
  thirty_day_actual DECIMAL(20,8),
  seven_day_accuracy DECIMAL(5,2),
  thirty_day_accuracy DECIMAL(5,2),
  
  -- Test metadata
  is_test_prediction BOOLEAN DEFAULT FALSE,
  test_fixture_id VARCHAR(100), -- Links to specific test scenarios
  mock_response_used BOOLEAN DEFAULT FALSE
);

-- Performance indexes
CREATE INDEX idx_predictions_user ON predictions(user_id);
CREATE INDEX idx_predictions_coin ON predictions(coin_symbol);
CREATE INDEX idx_predictions_created ON predictions(created_at DESC);
CREATE INDEX idx_predictions_accuracy ON predictions(seven_day_accuracy, thirty_day_accuracy) 
  WHERE seven_day_accuracy IS NOT NULL;

-- Composite index for common queries
CREATE INDEX idx_predictions_user_coin_date ON predictions(user_id, coin_symbol, created_at DESC);
```

#### Test Data Generator
```typescript
// src/lib/__tests__/generators/prediction.generator.ts
export function generateTestPrediction(options: {
  coin?: string;
  accuracy?: 'high' | 'medium' | 'low';
  timeframe?: 'past' | 'current' | 'future';
  direction?: PredictionDirection;
} = {}): PredictionData {
  const coin = options.coin || faker.helpers.arrayElement(['BTC', 'ETH', 'SOL', 'MATIC']);
  const currentPrice = faker.datatype.float({ min: 100, max: 50000, precision: 0.01 });
  
  // Generate realistic price targets based on direction
  const directionMultipliers = {
    strong_buy: { seven: 1.15, thirty: 1.35 },
    buy: { seven: 1.07, thirty: 1.15 },
    neutral: { seven: 1.02, thirty: 1.05 },
    sell: { seven: 0.93, thirty: 0.85 },
    strong_sell: { seven: 0.85, thirty: 0.70 }
  };
  
  const direction = options.direction || faker.helpers.arrayElement(Object.keys(directionMultipliers));
  const multipliers = directionMultipliers[direction];
  
  // Generate confidence based on accuracy scenario
  const confidenceRanges = {
    high: { min: 75, max: 95 },
    medium: { min: 50, max: 74 },
    low: { min: 25, max: 49 }
  };
  
  const accuracy = options.accuracy || 'medium';
  const confidence = faker.datatype.number(confidenceRanges[accuracy]);
  
  // Generate market context for reproducibility
  const marketContext = {
    fearGreedIndex: faker.datatype.number({ min: 0, max: 100 }),
    btcDominance: faker.datatype.float({ min: 35, max: 65, precision: 0.1 }),
    volume24h: faker.datatype.float({ min: 1000000, max: 1000000000 }),
    priceChange24h: faker.datatype.float({ min: -20, max: 20, precision: 0.01 })
  };
  
  // Generate technical indicators
  const technicalIndicators = {
    rsi: faker.datatype.number({ min: 0, max: 100 }),
    macd: {
      signal: faker.datatype.float({ min: -100, max: 100, precision: 0.01 }),
      histogram: faker.datatype.float({ min: -50, max: 50, precision: 0.01 })
    },
    bollingerBands: {
      upper: currentPrice * 1.02,
      lower: currentPrice * 0.98
    }
  };
  
  // Generate mock Claude response
  const claudeResponse = {
    sevenDayTarget: currentPrice * multipliers.seven,
    thirtyDayTarget: currentPrice * multipliers.thirty,
    confidence,
    direction,
    keyFactors: [
      `RSI at ${technicalIndicators.rsi}`,
      `Fear & Greed at ${marketContext.fearGreedIndex}`,
      `Volume ${marketContext.volume24h > 500000000 ? 'increasing' : 'decreasing'}`
    ],
    riskAssessment: 'Generated test prediction for validation'
  };
  
  return {
    coin_symbol: coin,
    current_price: currentPrice,
    seven_day_target: claudeResponse.sevenDayTarget,
    thirty_day_target: claudeResponse.thirtyDayTarget,
    confidence: claudeResponse.confidence,
    direction: claudeResponse.direction,
    market_context: marketContext,
    technical_indicators: technicalIndicators,
    claude_response: claudeResponse,
    is_test_prediction: true,
    test_fixture_id: `${accuracy}_${direction}_${coin}`,
    mock_response_used: true
  };
}

// Generate historical predictions with actual results
export function generateHistoricalPrediction(daysAgo: number, accuracy: number): PredictionData {
  const prediction = generateTestPrediction();
  const createdAt = new Date();
  createdAt.setDate(createdAt.getDate() - daysAgo);
  
  // Calculate actual prices based on desired accuracy
  const accuracyMultiplier = 1 - (Math.abs(100 - accuracy) / 100);
  
  return {
    ...prediction,
    created_at: createdAt,
    seven_day_actual: daysAgo >= 7 
      ? prediction.seven_day_target * accuracyMultiplier 
      : null,
    thirty_day_actual: daysAgo >= 30 
      ? prediction.thirty_day_target * accuracyMultiplier 
      : null,
    seven_day_accuracy: daysAgo >= 7 
      ? accuracy 
      : null,
    thirty_day_accuracy: daysAgo >= 30 
      ? accuracy 
      : null
  };
}
```

### Alerts Table
```sql
CREATE TABLE alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  coin_symbol VARCHAR(10) NOT NULL,
  alert_type VARCHAR(20) NOT NULL CHECK (alert_type IN ('price_above', 'price_below', 'change_percent', 'prediction_confidence')),
  threshold DECIMAL(20,8) NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  triggered_at TIMESTAMP WITH TIME ZONE,
  triggered_count INTEGER DEFAULT 0,
  last_triggered_at TIMESTAMP WITH TIME ZONE,
  notification_method VARCHAR(20) NOT NULL CHECK (notification_method IN ('email', 'sms', 'webhook')),
  
  -- Cooldown to prevent spam
  cooldown_minutes INTEGER DEFAULT 60,
  
  -- Test specific
  is_test_alert BOOLEAN DEFAULT FALSE,
  should_trigger_in_test BOOLEAN DEFAULT TRUE,
  test_trigger_count INTEGER DEFAULT 0
);

-- Indexes for fast alert checking
CREATE INDEX idx_alerts_active ON alerts(coin_symbol, alert_type) WHERE is_active = TRUE;
CREATE INDEX idx_alerts_user ON alerts(user_id);
CREATE INDEX idx_alerts_cooldown ON alerts(last_triggered_at) WHERE is_active = TRUE;
```

#### Test Data Generator
```typescript
// src/lib/__tests__/generators/alert.generator.ts
export function generateTestAlert(options: {
  type?: AlertType;
  shouldTrigger?: boolean;
  coin?: string;
  user?: { id: string; tier: string };
} = {}): AlertData {
  const alertTypes = {
    price_above: {
      threshold: faker.datatype.float({ min: 30000, max: 70000 }),
      shouldTrigger: options.shouldTrigger ?? false
    },
    price_below: {
      threshold: faker.datatype.float({ min: 20000, max: 40000 }),
      shouldTrigger: options.shouldTrigger ?? true
    },
    change_percent: {
      threshold: faker.datatype.float({ min: 5, max: 20 }),
      shouldTrigger: options.shouldTrigger ?? false
    },
    prediction_confidence: {
      threshold: faker.datatype.number({ min: 70, max: 90 }),
      shouldTrigger: options.shouldTrigger ?? true
    }
  };
  
  const type = options.type || faker.helpers.arrayElement(Object.keys(alertTypes));
  const config = alertTypes[type];
  
  // Determine notification method based on user tier
  const notificationMethods = {
    free: ['email'],
    pro: ['email', 'sms'],
    premium: ['email', 'sms', 'webhook']
  };
  
  const userTier = options.user?.tier || 'free';
  const availableMethods = notificationMethods[userTier];
  
  return {
    user_id: options.user?.id || faker.datatype.uuid(),
    coin_symbol: options.coin || faker.helpers.arrayElement(['BTC', 'ETH', 'SOL']),
    alert_type: type,
    threshold: config.threshold,
    notification_method: faker.helpers.arrayElement(availableMethods),
    is_test_alert: true,
    should_trigger_in_test: config.shouldTrigger,
    cooldown_minutes: faker.datatype.number({ min: 30, max: 120 })
  };
}

// Generate alerts for trigger testing
export function generateTriggerableAlerts(count: number): AlertData[] {
  const alerts = [];
  const currentBtcPrice = 45000;
  
  // Generate mix of alerts that should and shouldn't trigger
  for (let i = 0; i < count; i++) {
    const shouldTrigger = i < count / 2;
    
    alerts.push(generateTestAlert({
      type: 'price_above',
      shouldTrigger,
      coin: 'BTC',
      threshold: shouldTrigger ? currentBtcPrice - 1000 : currentBtcPrice + 1000
    }));
  }
  
  return alerts;
}
```

### API Usage Tracking Table
```sql
CREATE TABLE api_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  endpoint VARCHAR(255) NOT NULL,
  method VARCHAR(10) NOT NULL,
  status_code INTEGER NOT NULL,
  response_time_ms INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Rate limiting
  rate_limit_key VARCHAR(255) NOT NULL,
  rate_limit_remaining INTEGER,
  
  -- Cost tracking for Claude API
  claude_tokens_used INTEGER DEFAULT 0,
  claude_cost_cents INTEGER DEFAULT 0,
  
  -- Test tracking
  is_test_request BOOLEAN DEFAULT FALSE,
  test_scenario VARCHAR(100)
);

-- Indexes for rate limiting and analytics
CREATE INDEX idx_api_usage_user_endpoint ON api_usage(user_id, endpoint, created_at DESC);
CREATE INDEX idx_api_usage_rate_limit ON api_usage(rate_limit_key, created_at DESC);
CREATE INDEX idx_api_usage_test ON api_usage(is_test_request) WHERE is_test_request = TRUE;

-- Materialized view for usage analytics
CREATE MATERIALIZED VIEW hourly_api_usage AS
SELECT 
  date_trunc('hour', created_at) as hour,
  endpoint,
  COUNT(*) as request_count,
  AVG(response_time_ms) as avg_response_time,
  PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY response_time_ms) as p95_response_time,
  SUM(claude_tokens_used) as total_tokens,
  SUM(claude_cost_cents) as total_cost_cents
FROM api_usage
WHERE NOT is_test_request
GROUP BY date_trunc('hour', created_at), endpoint;

CREATE INDEX idx_hourly_usage_hour ON hourly_api_usage(hour DESC);
```

## 🧪 Database Test Utilities

### Test Database Setup
```typescript
// src/lib/__tests__/db/test-db-setup.ts
import { Pool } from 'pg';
import { migrate } from '../migrations';

export class TestDatabase {
  private pool: Pool;
  private dbName: string;
  
  constructor() {
    this.dbName = `crypto_vision_test_${Date.now()}`;
  }
  
  async setup() {
    // Create test database
    const setupPool = new Pool({ database: 'postgres' });
    await setupPool.query(`CREATE DATABASE ${this.dbName}`);
    await setupPool.end();
    
    // Connect to test database
    this.pool = new Pool({ database: this.dbName });
    
    // Run migrations
    await migrate(this.pool);
    
    // Create test utilities
    await this.createTestUtilities();
  }
  
  async createTestUtilities() {
    // Function to clean test data
    await this.pool.query(`
      CREATE OR REPLACE FUNCTION clean_test_data()
      RETURNS void AS $$
      BEGIN
        DELETE FROM api_usage WHERE is_test_request = TRUE;
        DELETE FROM alerts WHERE is_test_alert = TRUE;
        DELETE FROM predictions WHERE is_test_prediction = TRUE;
        DELETE FROM users WHERE is_test_user = TRUE;
      END;
      $$ LANGUAGE plpgsql;
    `);
    
    // Function to generate time series test data
    await this.pool.query(`
      CREATE OR REPLACE FUNCTION generate_price_history(
        p_coin VARCHAR,
        p_days INTEGER,
        p_base_price DECIMAL
      )
      RETURNS TABLE(timestamp TIMESTAMP, price DECIMAL) AS $$
      BEGIN
        RETURN QUERY
        SELECT 
          NOW() - (n || ' hours')::INTERVAL as timestamp,
          p_base_price * (1 + (RANDOM() - 0.5) * 0.1) as price
        FROM generate_series(0, p_days * 24) n;
      END;
      $$ LANGUAGE plpgsql;
    `);
  }
  
  async teardown() {
    await this.pool.end();
    const setupPool = new Pool({ database: 'postgres' });
    await setupPool.query(`DROP DATABASE IF EXISTS ${this.dbName}`);
    await setupPool.end();
  }
  
  getPool() {
    return this.pool;
  }
}
```

### Performance Test Benchmarks
```typescript
// src/lib/__tests__/db/performance.test.ts
describe('Database Performance Benchmarks', () => {
  let db: TestDatabase;
  
  beforeAll(async () => {
    db = new TestDatabase();
    await db.setup();
    
    // Generate test data
    const users = generateBulkUsers(10000);
    await bulkInsert(db.getPool(), 'users', users);
    
    // Generate predictions (100 per user average)
    const predictions = [];
    for (const user of users.slice(0, 1000)) {
      for (let i = 0; i < 100; i++) {
        predictions.push({
          ...generateTestPrediction(),
          user_id: user.id
        });
      }
    }
    await bulkInsert(db.getPool(), 'predictions', predictions);
  });
  
  describe('Query Performance', () => {
    it('should fetch user predictions in <50ms', async () => {
      const userId = (await db.getPool().query(
        'SELECT id FROM users LIMIT 1'
      )).rows[0].id;
      
      const start = Date.now();
      await db.getPool().query(
        `SELECT * FROM predictions 
         WHERE user_id = $1 
         ORDER BY created_at DESC 
         LIMIT 20`,
        [userId]
      );
      const duration = Date.now() - start;
      
      expect(duration).toBeLessThan(50);
    });
    
    it('should calculate accuracy stats in <100ms', async () => {
      const start = Date.now();
      await db.getPool().query(`
        SELECT 
          coin_symbol,
          AVG(seven_day_accuracy) as avg_accuracy,
          COUNT(*) as prediction_count
        FROM predictions
        WHERE seven_day_accuracy IS NOT NULL
        GROUP BY coin_symbol
      `);
      const duration = Date.now() - start;
      
      expect(duration).toBeLessThan(100);
    });
    
    it('should check active alerts in <20ms', async () => {
      // Insert test alerts
      const alerts = generateTriggerableAlerts(1000);
      await bulkInsert(db.getPool(), 'alerts', alerts);
      
      const start = Date.now();
      await db.getPool().query(`
        SELECT * FROM alerts
        WHERE is_active = TRUE
        AND coin_symbol = $1
        AND (
          last_triggered_at IS NULL 
          OR last_triggered_at < NOW() - INTERVAL '1 hour' * cooldown_minutes / 60
        )
      `, ['BTC']);
      const duration = Date.now() - start;
      
      expect(duration).toBeLessThan(20);
    });
  });
  
  describe('Write Performance', () => {
    it('should insert prediction in <10ms', async () => {
      const prediction = generateTestPrediction();
      
      const start = Date.now();
      await db.getPool().query(
        `INSERT INTO predictions 
         (user_id, coin_symbol, current_price, seven_day_target, thirty_day_target, 
          confidence, direction, market_context, technical_indicators, claude_response)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
        [/* values */]
      );
      const duration = Date.now() - start;
      
      expect(duration).toBeLessThan(10);
    });
    
    it('should handle 1000 concurrent inserts', async () => {
      const predictions = Array(1000).fill(null).map(() => generateTestPrediction());
      
      const start = Date.now();
      await Promise.all(
        predictions.map(p => 
          db.getPool().query(/* INSERT query */)
        )
      );
      const duration = Date.now() - start;
      
      expect(duration).toBeLessThan(5000); // 5 seconds for 1000 inserts
    });
  });
  
  afterAll(async () => {
    await db.teardown();
  });
});
```

## 📊 Test Coverage Requirements

### Schema Coverage
- ✅ Every table has test data generators
- ✅ Every constraint has validation tests
- ✅ Every index has performance benchmarks
- ✅ Every foreign key has referential integrity tests

### Performance Targets
```yaml
Query Performance:
  simple_select: <10ms
  join_query: <50ms
  aggregation: <100ms
  full_text_search: <200ms

Write Performance:
  single_insert: <10ms
  bulk_insert_1000: <1000ms
  update_single: <10ms
  delete_cascade: <50ms

Connection Pool:
  max_connections: 100
  connection_timeout: 5s
  idle_timeout: 30s
```

### Migration Testing
```typescript
// src/lib/__tests__/db/migration.test.ts
describe('Database Migrations', () => {
  it('should run all migrations successfully', async () => {
    const db = new TestDatabase();
    await expect(db.setup()).resolves.not.toThrow();
    await db.teardown();
  });
  
  it('should be idempotent', async () => {
    const db = new TestDatabase();
    await db.setup();
    
    // Run migrations again
    await expect(migrate(db.getPool())).resolves.not.toThrow();
    
    await db.teardown();
  });
  
  it('should rollback cleanly', async () => {
    const db = new TestDatabase();
    await db.setup();
    
    // Test rollback
    await expect(rollback(db.getPool())).resolves.not.toThrow();
    
    await db.teardown();
  });
});
```

## 🔒 Security Test Scenarios

### SQL Injection Tests
```typescript
describe('SQL Injection Prevention', () => {
  it('should sanitize user input in queries', async () => {
    const maliciousInputs = [
      "'; DROP TABLE users; --",
      "1' OR '1'='1",
      "admin'--",
      "1; UPDATE users SET tier='premium'--"
    ];
    
    for (const input of maliciousInputs) {
      await expect(
        db.query('SELECT * FROM users WHERE email = $1', [input])
      ).resolves.not.toThrow();
      
      // Verify tables still exist
      const tables = await db.query(
        "SELECT tablename FROM pg_tables WHERE schemaname = 'public'"
      );
      expect(tables.rows.length).toBeGreaterThan(0);
    }
  });
});
```

### Access Control Tests
```typescript
describe('Row Level Security', () => {
  it('should prevent users from accessing other users data', async () => {
    // Test RLS policies
    const user1 = await createTestUser();
    const user2 = await createTestUser();
    
    // Set role to user1
    await db.query(`SET LOCAL role = 'user_${user1.id}'`);
    
    // Try to access user2's predictions
    const result = await db.query(
      'SELECT * FROM predictions WHERE user_id = $1',
      [user2.id]
    );
    
    expect(result.rows).toHaveLength(0);
  });
});
```

## 📈 Test Metrics Dashboard

The database schema includes built-in test metrics:

```sql
CREATE VIEW test_metrics AS
SELECT 
  COUNT(DISTINCT u.id) FILTER (WHERE u.is_test_user) as test_users,
  COUNT(DISTINCT p.id) FILTER (WHERE p.is_test_prediction) as test_predictions,
  COUNT(DISTINCT a.id) FILTER (WHERE a.is_test_alert) as test_alerts,
  COUNT(DISTINCT api.id) FILTER (WHERE api.is_test_request) as test_api_calls,
  
  -- Performance metrics
  AVG(api.response_time_ms) FILTER (WHERE api.is_test_request) as avg_test_response_time,
  MAX(api.response_time_ms) FILTER (WHERE api.is_test_request) as max_test_response_time,
  
  -- Coverage metrics
  COUNT(DISTINCT p.test_fixture_id) as unique_test_scenarios,
  SUM(a.test_trigger_count) as total_alert_triggers_in_tests

FROM users u
FULL OUTER JOIN predictions p ON u.id = p.user_id
FULL OUTER JOIN alerts a ON u.id = a.user_id
FULL OUTER JOIN api_usage api ON u.id = api.user_id;
```

This testable database schema ensures that every aspect of our data layer can be thoroughly tested, validated, and benchmarked. The built-in test data generators and validation rules make it easy to maintain our 95% test coverage requirement.