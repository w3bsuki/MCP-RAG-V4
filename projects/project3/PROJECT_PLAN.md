# Crypto Vision - TDD Implementation Plan

## 🎯 Project Overview

Crypto Vision is a production-ready crypto prediction platform built with **Test-First Development**. We have 66 tests already written that are currently failing. Our goal is to implement the minimal code necessary to make these tests pass while maintaining 95% coverage.

## 📊 Current Status

- ✅ **Next.js project initialized** with TypeScript, Tailwind, and App Router
- ✅ **66 tests written** covering all core functionality
- ✅ **Pre-commit hooks configured** to enforce 95% coverage
- ❌ **0% coverage** - All tests failing (expected in TDD)
- 🎯 **Goal**: Implement code to pass all tests with 95% coverage

## 🏗️ Implementation Order (TDD Approach)

### Phase 1: Core Services (Week 1)
*These services have the most tests and form the foundation*

#### 1. PriceService Implementation (16 tests)
**Priority**: CRITICAL  
**File**: `src/lib/services/priceService.ts`  
**Dependencies**: None  
**Tests**: `tests/unit/lib/priceService.test.ts`

```typescript
// Key methods to implement:
- connectToBinance(symbol: string): void
- getHistoricalPrices(symbol: string, days: number): Promise<PriceData[]>
- getTechnicalIndicators(symbol: string): Promise<TechnicalIndicators>
- disconnect(): void
- EventEmitter functionality for real-time updates
```

**Implementation Steps**:
1. Create basic PriceService class extending EventEmitter
2. Implement WebSocket connection logic
3. Add price update event handling
4. Implement historical data fetching (mock initially)
5. Add technical indicator calculations
6. Implement reconnection logic
7. Add error handling

#### 2. PredictionEngine Implementation (15 tests)
**Priority**: CRITICAL  
**File**: `src/lib/services/predictionEngine.ts`  
**Dependencies**: PriceService  
**Tests**: `tests/unit/lib/predictionEngine.test.ts`

```typescript
// Key methods to implement:
- generatePrediction(coin: string, context: MarketContext): Promise<ClaudePrediction>
- calculateConfidence(indicators: TechnicalIndicators): number
- buildClaudePrompt(context: MarketContext): string
- cachePrediction(coin: string, prediction: ClaudePrediction): void
- getCachedPrediction(coin: string): ClaudePrediction | null
```

**Implementation Steps**:
1. Create PredictionEngine class
2. Implement Claude API integration (mock for tests)
3. Add market context building
4. Implement confidence calculations
5. Add caching with TTL
6. Implement rate limiting
7. Add error handling and retries

#### 3. API Routes Implementation (12 tests)
**Priority**: HIGH  
**Files**: `src/app/api/predictions/route.ts`  
**Dependencies**: PredictionEngine  
**Tests**: `tests/integration/api/predictions.test.ts`

```typescript
// Endpoints to implement:
- POST /api/predictions - Generate new prediction
- GET /api/predictions/[coin] - Get cached prediction
- Rate limiting middleware
- Error response formatting
```

**Implementation Steps**:
1. Create API route handlers
2. Add request validation
3. Implement rate limiting
4. Add caching headers
5. Implement error responses
6. Add CORS handling

### Phase 2: UI Components (Week 1-2)
*Components that consume the services*

#### 4. PriceDisplay Component (11 tests)
**Priority**: HIGH  
**File**: `src/components/features/PriceDisplay.tsx`  
**Dependencies**: PriceService hooks  
**Tests**: `tests/unit/components/PriceDisplay.test.tsx`

```typescript
// Component features:
- Real-time price updates
- Loading states
- Error handling
- Price formatting
- Change percentage display
- Responsive design
```

**Implementation Steps**:
1. Create component structure
2. Implement useCryptoPrice hook
3. Add loading skeleton
4. Implement error states
5. Add price formatting utilities
6. Implement real-time updates
7. Add responsive styles

#### 5. CoverageMonitor Service (12 tests)
**Priority**: MEDIUM  
**File**: `src/lib/services/coverageMonitor.ts`  
**Dependencies**: File system access  
**Tests**: `tests/unit/lib/coverageMonitor.test.ts`

```typescript
// Key methods:
- getCoverageReport(): CoverageReport
- trackCoverageTrend(): void
- generateBadge(): string
- enforceThresholds(): boolean
```

### Phase 3: Infrastructure & Database (Week 2)
*Supporting services and data persistence*

#### 6. Database Schema Implementation
**Priority**: HIGH  
**Files**: Database migrations  
**Reference**: `architecture/DATABASE_SCHEMA.md`

```sql
-- Tables to create:
- users (with tiers)
- predictions (with accuracy tracking)
- alerts
- api_usage (for rate limiting)
```

#### 7. WebSocket Infrastructure
**Priority**: HIGH  
**Files**: `src/lib/websocket/`  
**Reference**: `architecture/PERFORMANCE_BENCHMARKS.md`

- Implement reconnection logic
- Add connection pooling
- Implement message queuing
- Add heartbeat mechanism

#### 8. Authentication System
**Priority**: MEDIUM  
**Files**: `src/lib/auth/`  
**Stack**: NextAuth.js

- JWT implementation
- Tier-based access control
- API key generation for premium users

### Phase 4: Advanced Features (Week 2-3)
*Features that depend on core functionality*

#### 9. Alert System
**Priority**: MEDIUM  
**Files**: `src/lib/services/alertService.ts`
- Price threshold monitoring
- Email/SMS notifications
- Alert cooldown logic

#### 10. Analytics Dashboard
**Priority**: MEDIUM  
**Files**: `src/components/features/Analytics/`
- Prediction accuracy tracking
- Historical performance charts
- User metrics

## 📋 Task Breakdown for Builder

### Immediate Tasks (Next 4 Hours)

1. **TASK-P3-001**: Implement PriceService Class
   - Create file structure
   - Implement WebSocket connection
   - Make first 5 tests pass
   - Target: 30% of PriceService tests passing

2. **TASK-P3-002**: Complete PriceService Implementation
   - Add historical data fetching
   - Implement technical indicators
   - Make all 16 tests pass
   - Target: 100% of PriceService tests passing

3. **TASK-P3-003**: Start PredictionEngine
   - Create class structure
   - Implement Claude prompt building
   - Make first 5 tests pass
   - Target: 30% of PredictionEngine tests passing

### Today's Goals
- ✅ PriceService fully implemented (16/16 tests)
- ✅ PredictionEngine 50% complete (8/15 tests)
- ✅ Coverage > 50% overall

### This Week's Goals
- ✅ All unit tests passing (54/54)
- ✅ All integration tests passing (12/12)
- ✅ Coverage > 95%
- ✅ Basic UI functional

## 🛠️ Technical Implementation Details

### Directory Structure Required
```
src/
├── lib/
│   ├── services/
│   │   ├── priceService.ts
│   │   ├── predictionEngine.ts
│   │   ├── coverageMonitor.ts
│   │   └── alertService.ts
│   ├── websocket/
│   │   └── binanceConnector.ts
│   ├── auth/
│   │   └── authService.ts
│   └── utils/
│       ├── formatters.ts
│       └── validators.ts
├── components/
│   ├── features/
│   │   ├── PriceDisplay.tsx
│   │   ├── PredictionChart.tsx
│   │   └── AlertForm.tsx
│   └── ui/
│       └── (shared components)
└── app/
    └── api/
        └── predictions/
            └── route.ts
```

### Environment Variables Needed
```env
# .env.local
ANTHROPIC_API_KEY=your_claude_api_key
DATABASE_URL=postgresql://...
REDIS_URL=redis://...
NEXT_PUBLIC_WS_URL=wss://stream.binance.com:9443
```

### Key Dependencies to Install
```json
{
  "dependencies": {
    "@anthropic-ai/sdk": "^0.17.0",
    "ws": "^8.16.0",
    "@upstash/redis": "^1.28.0",
    "zod": "^3.22.4",
    "next-auth": "^5.0.0",
    "recharts": "^2.10.0"
  }
}
```

## 📊 Success Metrics

### Coverage Requirements
- **Lines**: 95% minimum
- **Functions**: 90% minimum
- **Branches**: 90% minimum
- **Statements**: 95% minimum

### Performance Targets
- API response time: <500ms (p95)
- WebSocket latency: <50ms
- Page load time: <2s
- Real-time updates: <100ms

### Quality Gates
- ✅ All tests passing
- ✅ Coverage thresholds met
- ✅ No TypeScript errors
- ✅ No security vulnerabilities
- ✅ Performance benchmarks met

## 🚀 Implementation Strategy

1. **Start with the tests** - Run them, see them fail
2. **Implement minimal code** - Just enough to pass
3. **Refactor if needed** - Keep it clean
4. **Check coverage** - Must maintain 95%
5. **Commit frequently** - Small, tested changes

## ⚠️ Critical Rules

1. **NO implementation without failing tests first**
2. **NO commits below 95% coverage** (enforced by pre-commit)
3. **NO skipping tests** - Fix or remove
4. **NO console.logs in production code**
5. **NO hardcoded values** - Use environment variables

## 📝 Notes for Builder

- Start with PriceService - it has no dependencies
- Use the existing test files as your specification
- Mock external services (Binance, Claude) for unit tests
- Real implementations can come after tests pass
- Focus on making tests pass, not perfect code initially
- The pre-commit hook will prevent bad commits

## 🎯 Definition of Done

A feature is complete when:
1. ✅ All related tests pass
2. ✅ Coverage is ≥95%
3. ✅ TypeScript compiles without errors
4. ✅ Code is committed with proper message
5. ✅ Feature works in the browser
6. ✅ Performance targets are met

---

**Ready to start implementation!** The tests are waiting to guide us. 🚀