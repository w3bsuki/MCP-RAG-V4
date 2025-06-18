# Crypto Vision - Complete Database & Authentication Design

## 🎯 Design Philosophy

This design follows PostgreSQL best practices with security-first authentication, optimized for financial data integrity and high-performance queries needed for crypto predictions.

## 📊 Database Schema Design

### Core Tables with Relationships

```sql
-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Users table with tier-based access control
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL, -- bcrypt hash
    email_verified BOOLEAN DEFAULT FALSE,
    
    -- Subscription tier
    tier VARCHAR(20) NOT NULL DEFAULT 'free' 
        CHECK (tier IN ('free', 'pro', 'premium')),
    stripe_customer_id VARCHAR(255) UNIQUE,
    subscription_status VARCHAR(20) DEFAULT 'inactive'
        CHECK (subscription_status IN ('active', 'inactive', 'canceled', 'past_due')),
    subscription_expires_at TIMESTAMP WITH TIME ZONE,
    
    -- API access
    api_key_hash VARCHAR(255) UNIQUE,
    api_requests_today INTEGER DEFAULT 0,
    api_requests_last_reset DATE DEFAULT CURRENT_DATE,
    
    -- Profile data
    name VARCHAR(255),
    phone VARCHAR(20),
    timezone VARCHAR(50) DEFAULT 'UTC',
    
    -- Notification preferences
    notification_preferences JSONB DEFAULT '{
        "email": true,
        "sms": false,
        "webhook": false,
        "marketing": true
    }'::jsonb,
    
    -- Security
    failed_login_attempts INTEGER DEFAULT 0,
    locked_until TIMESTAMP WITH TIME ZONE,
    last_login_at TIMESTAMP WITH TIME ZONE,
    last_login_ip INET,
    
    -- Audit
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    deleted_at TIMESTAMP WITH TIME ZONE,
    
    -- Test support
    is_test_user BOOLEAN DEFAULT FALSE,
    test_scenario VARCHAR(100)
);

-- Optimized indexes for users table
CREATE INDEX idx_users_email ON users(email) WHERE deleted_at IS NULL;
CREATE INDEX idx_users_tier ON users(tier) WHERE deleted_at IS NULL;
CREATE INDEX idx_users_api_key ON users(api_key_hash) WHERE api_key_hash IS NOT NULL;
CREATE INDEX idx_users_stripe ON users(stripe_customer_id) WHERE stripe_customer_id IS NOT NULL;
CREATE INDEX idx_users_test ON users(is_test_user) WHERE is_test_user = TRUE;
CREATE INDEX idx_users_created ON users(created_at);

-- Cryptocurrencies reference table
CREATE TABLE cryptocurrencies (
    id SERIAL PRIMARY KEY,
    symbol VARCHAR(10) NOT NULL UNIQUE,
    name VARCHAR(100) NOT NULL,
    coingecko_id VARCHAR(50) UNIQUE,
    binance_symbol VARCHAR(20),
    is_active BOOLEAN DEFAULT TRUE,
    tier_requirement VARCHAR(20) DEFAULT 'free'
        CHECK (tier_requirement IN ('free', 'pro', 'premium')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert major cryptocurrencies
INSERT INTO cryptocurrencies (symbol, name, coingecko_id, binance_symbol, tier_requirement) VALUES
('BTC', 'Bitcoin', 'bitcoin', 'BTCUSDT', 'free'),
('ETH', 'Ethereum', 'ethereum', 'ETHUSDT', 'free'),
('BNB', 'Binance Coin', 'binancecoin', 'BNBUSDT', 'free'),
('SOL', 'Solana', 'solana', 'SOLUSDT', 'free'),
('ADA', 'Cardano', 'cardano', 'ADAUSDT', 'free'),
('AVAX', 'Avalanche', 'avalanche-2', 'AVAXUSDT', 'pro'),
('MATIC', 'Polygon', 'matic-network', 'MATICUSDT', 'pro'),
('DOT', 'Polkadot', 'polkadot', 'DOTUSDT', 'pro'),
('LINK', 'Chainlink', 'chainlink', 'LINKUSDT', 'premium'),
('UNI', 'Uniswap', 'uniswap', 'UNIUSDT', 'premium');

-- Predictions table with accuracy tracking
CREATE TABLE predictions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    crypto_id INTEGER REFERENCES cryptocurrencies(id),
    
    -- Prediction data
    current_price DECIMAL(20,8) NOT NULL CHECK (current_price > 0),
    seven_day_target DECIMAL(20,8) NOT NULL CHECK (seven_day_target > 0),
    thirty_day_target DECIMAL(20,8) NOT NULL CHECK (thirty_day_target > 0),
    confidence INTEGER NOT NULL CHECK (confidence >= 0 AND confidence <= 100),
    direction VARCHAR(20) NOT NULL 
        CHECK (direction IN ('strong_buy', 'buy', 'neutral', 'sell', 'strong_sell')),
    
    -- Context data for analysis
    market_context JSONB NOT NULL,
    technical_indicators JSONB NOT NULL,
    claude_response JSONB NOT NULL,
    
    -- Accuracy tracking (filled when predictions mature)
    seven_day_actual DECIMAL(20,8),
    thirty_day_actual DECIMAL(20,8),
    seven_day_accuracy DECIMAL(5,2), -- percentage accuracy
    thirty_day_accuracy DECIMAL(5,2),
    seven_day_error DECIMAL(10,2), -- absolute error in USD
    thirty_day_error DECIMAL(10,2),
    
    -- Timing
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    seven_day_target_date TIMESTAMP WITH TIME ZONE GENERATED ALWAYS AS (created_at + INTERVAL '7 days') STORED,
    thirty_day_target_date TIMESTAMP WITH TIME ZONE GENERATED ALWAYS AS (created_at + INTERVAL '30 days') STORED,
    
    -- Test support
    is_test_prediction BOOLEAN DEFAULT FALSE,
    test_fixture_id VARCHAR(100),
    mock_response_used BOOLEAN DEFAULT FALSE
);

-- High-performance indexes for predictions
CREATE INDEX idx_predictions_user_crypto ON predictions(user_id, crypto_id);
CREATE INDEX idx_predictions_crypto_created ON predictions(crypto_id, created_at DESC);
CREATE INDEX idx_predictions_target_dates ON predictions(seven_day_target_date, thirty_day_target_date) 
    WHERE seven_day_actual IS NULL OR thirty_day_actual IS NULL;
CREATE INDEX idx_predictions_accuracy ON predictions(seven_day_accuracy, thirty_day_accuracy) 
    WHERE seven_day_accuracy IS NOT NULL;
CREATE INDEX idx_predictions_test ON predictions(is_test_prediction) WHERE is_test_prediction = TRUE;
CREATE INDEX idx_predictions_created ON predictions(created_at DESC);

-- GIN index for JSONB queries
CREATE INDEX idx_predictions_market_context ON predictions USING GIN (market_context);
CREATE INDEX idx_predictions_technical ON predictions USING GIN (technical_indicators);

-- Alerts table with advanced features
CREATE TABLE alerts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    crypto_id INTEGER NOT NULL REFERENCES cryptocurrencies(id),
    
    -- Alert configuration
    alert_type VARCHAR(30) NOT NULL 
        CHECK (alert_type IN ('price_above', 'price_below', 'change_percent', 'prediction_confidence', 'volume_spike')),
    threshold DECIMAL(20,8) NOT NULL,
    comparison_operator VARCHAR(10) DEFAULT '>=' CHECK (comparison_operator IN ('>', '>=', '<', '<=', '=', '!=')),
    
    -- Notification settings
    notification_method VARCHAR(20) NOT NULL 
        CHECK (notification_method IN ('email', 'sms', 'webhook', 'push')),
    webhook_url VARCHAR(500),
    
    -- State management
    is_active BOOLEAN DEFAULT TRUE,
    triggered_count INTEGER DEFAULT 0,
    last_triggered_at TIMESTAMP WITH TIME ZONE,
    next_check_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Cooldown to prevent spam
    cooldown_minutes INTEGER DEFAULT 60,
    max_triggers_per_day INTEGER DEFAULT 10,
    triggers_today INTEGER DEFAULT 0,
    triggers_reset_date DATE DEFAULT CURRENT_DATE,
    
    -- Advanced features
    conditions JSONB, -- For complex multi-condition alerts
    custom_message TEXT,
    expires_at TIMESTAMP WITH TIME ZONE,
    
    -- Audit
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Test support
    is_test_alert BOOLEAN DEFAULT FALSE,
    should_trigger_in_test BOOLEAN DEFAULT TRUE,
    test_trigger_count INTEGER DEFAULT 0
);

-- Optimized indexes for alert checking
CREATE INDEX idx_alerts_active_checks ON alerts(crypto_id, alert_type, next_check_at) 
    WHERE is_active = TRUE AND (expires_at IS NULL OR expires_at > NOW());
CREATE INDEX idx_alerts_user ON alerts(user_id, is_active);
CREATE INDEX idx_alerts_cooldown ON alerts(last_triggered_at) WHERE is_active = TRUE;
CREATE INDEX idx_alerts_triggers ON alerts(triggers_today, triggers_reset_date) WHERE is_active = TRUE;

-- API usage tracking for rate limiting
CREATE TABLE api_usage (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    
    -- Request details
    endpoint VARCHAR(255) NOT NULL,
    method VARCHAR(10) NOT NULL,
    status_code INTEGER NOT NULL,
    response_time_ms INTEGER NOT NULL,
    request_size_bytes INTEGER DEFAULT 0,
    response_size_bytes INTEGER DEFAULT 0,
    
    -- Client info
    ip_address INET,
    user_agent TEXT,
    api_key_used BOOLEAN DEFAULT FALSE,
    
    -- Rate limiting
    rate_limit_key VARCHAR(255) NOT NULL, -- Usually user_id:endpoint
    rate_limit_remaining INTEGER,
    rate_limit_reset_at TIMESTAMP WITH TIME ZONE,
    
    -- Cost tracking for Claude API
    claude_tokens_used INTEGER DEFAULT 0,
    claude_cost_cents INTEGER DEFAULT 0,
    
    -- Timing
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Test tracking
    is_test_request BOOLEAN DEFAULT FALSE,
    test_scenario VARCHAR(100)
);

-- Partitioning by month for performance
CREATE TABLE api_usage_y2025m01 PARTITION OF api_usage
    FOR VALUES FROM ('2025-01-01') TO ('2025-02-01');
    
-- Indexes for rate limiting and analytics
CREATE INDEX idx_api_usage_rate_limit ON api_usage(rate_limit_key, created_at DESC);
CREATE INDEX idx_api_usage_user_endpoint ON api_usage(user_id, endpoint, created_at DESC);
CREATE INDEX idx_api_usage_ip ON api_usage(ip_address, created_at DESC);
CREATE INDEX idx_api_usage_test ON api_usage(is_test_request) WHERE is_test_request = TRUE;

-- Sessions table for authentication
CREATE TABLE user_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Session data
    token_hash VARCHAR(255) NOT NULL UNIQUE,
    refresh_token_hash VARCHAR(255) UNIQUE,
    device_id VARCHAR(255),
    device_name VARCHAR(100),
    
    -- Security
    ip_address INET,
    user_agent TEXT,
    is_mobile BOOLEAN DEFAULT FALSE,
    
    -- Timing
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_used_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '30 days'),
    
    -- State
    is_active BOOLEAN DEFAULT TRUE,
    revoked_at TIMESTAMP WITH TIME ZONE,
    revoked_reason VARCHAR(100)
);

-- Session indexes
CREATE INDEX idx_sessions_token ON user_sessions(token_hash) WHERE is_active = TRUE;
CREATE INDEX idx_sessions_refresh ON user_sessions(refresh_token_hash) WHERE is_active = TRUE;
CREATE INDEX idx_sessions_user ON user_sessions(user_id, is_active);
CREATE INDEX idx_sessions_cleanup ON user_sessions(expires_at) WHERE is_active = TRUE;

-- Price history table for technical analysis
CREATE TABLE price_history (
    id BIGSERIAL PRIMARY KEY,
    crypto_id INTEGER NOT NULL REFERENCES cryptocurrencies(id),
    
    -- Price data
    price DECIMAL(20,8) NOT NULL,
    volume DECIMAL(20,8) NOT NULL DEFAULT 0,
    market_cap DECIMAL(20,8),
    
    -- Timing (1-minute granularity)
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
    
    -- Source tracking
    source VARCHAR(20) DEFAULT 'binance' CHECK (source IN ('binance', 'coingecko', 'coinbase')),
    
    UNIQUE(crypto_id, timestamp, source)
);

-- Hypertable for time-series optimization (if using TimescaleDB)
-- SELECT create_hypertable('price_history', 'timestamp');

-- Time-series optimized indexes
CREATE INDEX idx_price_history_crypto_time ON price_history(crypto_id, timestamp DESC);
CREATE INDEX idx_price_history_time ON price_history(timestamp DESC);
```

## 🔐 Authentication System Design

### JWT Token Strategy

```typescript
// Authentication service implementation
interface TokenPayload {
  userId: string;
  email: string;
  tier: UserTier;
  sessionId: string;
  iat: number;
  exp: number;
}

interface RefreshTokenPayload {
  userId: string;
  sessionId: string;
  tokenVersion: number;
  iat: number;
  exp: number;
}

class AuthService {
  // Access token: 15 minutes
  // Refresh token: 30 days
  
  async generateTokens(userId: string, sessionId: string): Promise<{
    accessToken: string;
    refreshToken: string;
  }> {
    const user = await this.getUserById(userId);
    
    const accessTokenPayload: TokenPayload = {
      userId,
      email: user.email,
      tier: user.tier,
      sessionId,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + (15 * 60) // 15 minutes
    };
    
    const refreshTokenPayload: RefreshTokenPayload = {
      userId,
      sessionId,
      tokenVersion: user.tokenVersion,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + (30 * 24 * 60 * 60) // 30 days
    };
    
    const accessToken = jwt.sign(accessTokenPayload, process.env.JWT_SECRET!);
    const refreshToken = jwt.sign(refreshTokenPayload, process.env.JWT_REFRESH_SECRET!);
    
    // Store session in database
    await this.createSession(userId, sessionId, accessToken, refreshToken);
    
    return { accessToken, refreshToken };
  }
}
```

### Password Security

```typescript
// Password hashing with bcrypt
class PasswordService {
  private static readonly SALT_ROUNDS = 12;
  
  static async hashPassword(password: string): Promise<string> {
    // Validate password strength
    if (!this.isPasswordStrong(password)) {
      throw new Error('Password does not meet security requirements');
    }
    
    return bcrypt.hash(password, this.SALT_ROUNDS);
  }
  
  static async verifyPassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }
  
  private static isPasswordStrong(password: string): boolean {
    // At least 8 characters, 1 uppercase, 1 lowercase, 1 number
    const strongPasswordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d@$!%*?&]{8,}$/;
    return strongPasswordRegex.test(password);
  }
}
```

## 🔄 Row Level Security (RLS) Policies

```sql
-- Enable RLS on all user-data tables
ALTER TABLE predictions ENABLE ROW LEVEL SECURITY;
ALTER TABLE alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_sessions ENABLE ROW LEVEL SECURITY;

-- Users can only see their own predictions
CREATE POLICY predictions_user_isolation ON predictions
    FOR ALL USING (user_id = current_setting('app.current_user_id')::UUID);

-- Users can only manage their own alerts
CREATE POLICY alerts_user_isolation ON alerts
    FOR ALL USING (user_id = current_setting('app.current_user_id')::UUID);

-- API usage isolation
CREATE POLICY api_usage_user_isolation ON api_usage
    FOR ALL USING (user_id = current_setting('app.current_user_id')::UUID);

-- Session isolation
CREATE POLICY sessions_user_isolation ON user_sessions
    FOR ALL USING (user_id = current_setting('app.current_user_id')::UUID);

-- Admin role can see everything (for support)
CREATE ROLE crypto_admin;
GRANT ALL ON ALL TABLES IN SCHEMA public TO crypto_admin;

-- Application role with limited permissions
CREATE ROLE crypto_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON users, predictions, alerts, api_usage, user_sessions TO crypto_app;
GRANT SELECT ON cryptocurrencies, price_history TO crypto_app;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO crypto_app;
```

## 📋 Implementation Tasks for Builder

### TASK-P3-DB-001: Database Setup & Migrations
**Priority**: CRITICAL  
**Estimated Hours**: 2  
**Dependencies**: None

**Completion Criteria**:
1. ✅ Neon PostgreSQL database created and connected
2. ✅ All table creation scripts executed successfully
3. ✅ All indexes created and verified with EXPLAIN ANALYZE
4. ✅ Sample data inserted (cryptocurrencies table)
5. ✅ RLS policies enabled and tested
6. ✅ Database connection pool configured (max 20 connections)
7. ✅ Environment variables configured: `DATABASE_URL`
8. ✅ Migration scripts created in `src/lib/db/migrations/`

**Step-by-Step Implementation**:
```bash
# 1. Create Neon database
# Go to neon.tech, create new project "crypto-vision"
# Copy connection string to .env.local

# 2. Install database dependencies
npm install pg @types/pg drizzle-orm drizzle-kit

# 3. Create database configuration
mkdir -p src/lib/db
touch src/lib/db/connection.ts
touch src/lib/db/schema.ts
touch src/lib/db/migrations/001_initial.sql

# 4. Run migrations
npx drizzle-kit push:pg
```

**Files to Create**:
- `src/lib/db/connection.ts` - Database connection pool
- `src/lib/db/schema.ts` - TypeScript schema definitions
- `src/lib/db/migrations/001_initial.sql` - Initial schema
- `src/lib/db/seed.ts` - Sample data insertion

**Testing**:
```typescript
// Test database connection
describe('Database Connection', () => {
  it('should connect to database', async () => {
    const db = await getDatabase();
    const result = await db.query('SELECT NOW()');
    expect(result.rows).toHaveLength(1);
  });
  
  it('should have all required tables', async () => {
    const tables = await db.query(`
      SELECT tablename FROM pg_tables 
      WHERE schemaname = 'public'
    `);
    
    const tableNames = tables.rows.map(row => row.tablename);
    expect(tableNames).toContain('users');
    expect(tableNames).toContain('predictions');
    expect(tableNames).toContain('alerts');
  });
});
```

### TASK-P3-DB-002: Authentication Service Implementation
**Priority**: CRITICAL  
**Estimated Hours**: 2  
**Dependencies**: TASK-P3-DB-001

**Completion Criteria**:
1. ✅ AuthService class with all methods implemented
2. ✅ Password hashing with bcrypt (12 rounds)
3. ✅ JWT token generation (access + refresh)
4. ✅ Session management in database
5. ✅ Rate limiting for login attempts
6. ✅ Account lockout after 5 failed attempts
7. ✅ Email verification flow
8. ✅ All 25 auth tests passing (create test file)

**Files to Create**:
- `src/lib/auth/authService.ts` - Main authentication service
- `src/lib/auth/passwordService.ts` - Password utilities
- `src/lib/auth/tokenService.ts` - JWT utilities
- `src/lib/auth/middleware.ts` - Auth middleware for API routes
- `tests/unit/lib/auth/authService.test.ts` - Comprehensive auth tests

**API Endpoints to Create**:
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `POST /api/auth/refresh` - Token refresh
- `POST /api/auth/logout` - Logout (revoke session)
- `GET /api/auth/me` - Get current user
- `POST /api/auth/verify-email` - Email verification

**Security Implementation**:
```typescript
// Rate limiting implementation
const loginAttempts = new Map<string, { count: number; lastAttempt: Date }>();

async function checkRateLimit(ip: string): Promise<boolean> {
  const attempts = loginAttempts.get(ip);
  if (!attempts) return true;
  
  const timeDiff = Date.now() - attempts.lastAttempt.getTime();
  const cooldownPeriod = Math.min(300000, Math.pow(2, attempts.count) * 1000); // Max 5 min
  
  return timeDiff > cooldownPeriod;
}
```

### TASK-P3-DB-003: User Tier Management
**Priority**: HIGH  
**Estimated Hours**: 1.5  
**Dependencies**: TASK-P3-DB-002

**Completion Criteria**:
1. ✅ TierService class with tier validation
2. ✅ Middleware for tier-based access control
3. ✅ Subscription status tracking
4. ✅ API rate limiting by tier
5. ✅ Feature gating by tier (coins, alerts, API calls)
6. ✅ Stripe webhook handling for subscription events
7. ✅ All 15 tier management tests passing

**Implementation**:
```typescript
// Tier limits configuration
const TIER_LIMITS = {
  free: {
    predictions_per_hour: 10,
    alerts_max: 5,
    coins_access: ['BTC', 'ETH', 'BNB', 'SOL', 'ADA'],
    api_calls_per_day: 100
  },
  pro: {
    predictions_per_hour: 60,
    alerts_max: 50,
    coins_access: 'top_50', // First 50 by market cap
    api_calls_per_day: 1000,
    sms_alerts: true
  },
  premium: {
    predictions_per_hour: 'unlimited',
    alerts_max: 'unlimited',
    coins_access: 'all',
    api_calls_per_day: 10000,
    sms_alerts: true,
    webhook_alerts: true,
    api_access: true
  }
};
```

### TASK-P3-DB-004: Test Data Generators
**Priority**: MEDIUM  
**Estimated Hours**: 1  
**Dependencies**: TASK-P3-DB-001

**Completion Criteria**:
1. ✅ User generator with all tiers
2. ✅ Prediction generator with historical data
3. ✅ Alert generator with different scenarios
4. ✅ API usage generator for testing rate limits
5. ✅ Performance tested with 10k+ records
6. ✅ Cleanup utilities for tests
7. ✅ All generators have TypeScript types

**Test Utilities**:
```typescript
// Test data generator example
export async function generateTestUsers(count: number): Promise<User[]> {
  const users = [];
  
  for (let i = 0; i < count; i++) {
    const tier = ['free', 'pro', 'premium'][Math.floor(Math.random() * 3)];
    const user = await createUser({
      email: `test${i}@cryptovision.ai`,
      tier: tier as UserTier,
      is_test_user: true
    });
    users.push(user);
  }
  
  return users;
}
```

## 🔍 Performance Optimization

### Query Optimization
```sql
-- Materialized views for analytics
CREATE MATERIALIZED VIEW prediction_accuracy_stats AS
SELECT 
    c.symbol,
    COUNT(*) as total_predictions,
    AVG(p.seven_day_accuracy) as avg_7d_accuracy,
    AVG(p.thirty_day_accuracy) as avg_30d_accuracy,
    PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY p.seven_day_accuracy) as median_7d_accuracy
FROM predictions p
JOIN cryptocurrencies c ON p.crypto_id = c.id
WHERE p.seven_day_accuracy IS NOT NULL
GROUP BY c.symbol;

-- Refresh every hour
CREATE OR REPLACE FUNCTION refresh_prediction_stats()
RETURNS void AS $$
BEGIN
    REFRESH MATERIALIZED VIEW prediction_accuracy_stats;
END;
$$ LANGUAGE plpgsql;

-- Scheduled refresh
SELECT cron.schedule('refresh-stats', '0 * * * *', 'SELECT refresh_prediction_stats()');
```

### Connection Pooling
```typescript
// Optimized connection pool
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 20, // Maximum connections
  min: 5,  // Minimum connections
  acquireTimeoutMillis: 30000,
  createTimeoutMillis: 30000,
  destroyTimeoutMillis: 5000,
  idleTimeoutMillis: 30000,
  reapIntervalMillis: 1000,
  createRetryIntervalMillis: 200
});
```

## 🚀 Ready for Implementation

The Builder should start with **TASK-P3-DB-001** and work through the database tasks sequentially. Each task has:

- ✅ **Clear completion criteria**
- ✅ **Step-by-step implementation guide** 
- ✅ **All files to create specified**
- ✅ **Test requirements defined**
- ✅ **Security considerations included**

The database and authentication system will provide the foundation for all other Crypto Vision features.