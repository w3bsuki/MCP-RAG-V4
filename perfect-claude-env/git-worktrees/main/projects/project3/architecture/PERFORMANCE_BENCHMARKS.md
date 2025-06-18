# Crypto Vision - Performance Benchmarks & Test Harnesses

## 🎯 Performance Philosophy: Measure Everything

Every aspect of the system must meet strict performance criteria:
1. **Response Time SLAs** - User-facing operations must be fast
2. **Throughput Targets** - System must handle expected load
3. **Resource Efficiency** - Minimize CPU, memory, and network usage
4. **Scalability Proof** - Demonstrate ability to scale to 10k users
5. **Degradation Testing** - Graceful handling under stress

## 📊 Performance Requirements

### Response Time SLAs
```yaml
User Interface:
  page_load: <2s (FCP), <3s (TTI)
  interaction_response: <100ms
  chart_render: <200ms
  form_submission: <300ms

API Endpoints:
  auth_endpoints: <200ms
  price_endpoints: <100ms (cached), <500ms (fresh)
  prediction_endpoints: <2s (includes Claude API)
  analytics_endpoints: <500ms
  
WebSocket:
  connection_time: <1s
  message_latency: <50ms
  reconnection_time: <5s

Database:
  simple_query: <10ms
  complex_query: <50ms
  write_operation: <20ms
  batch_operation: <100ms
```

### Throughput Targets
```yaml
Concurrent Users: 10,000
Requests per Second:
  total: 5,000 RPS
  predictions: 100 RPS
  price_updates: 2,000 RPS
  alerts_check: 1,000 RPS
  
WebSocket Connections: 10,000 concurrent
Message Throughput: 50,000 messages/second
Database Connections: 100 concurrent
Cache Hit Rate: >90%
```

## 🧪 Performance Test Suites

### 1. Frontend Performance Tests

#### Page Load Performance
```typescript
// tests/performance/frontend/page-load.test.ts
import { test, expect } from '@playwright/test';
import lighthouse from 'lighthouse';

test.describe('Page Load Performance', () => {
  test('homepage should meet Core Web Vitals', async ({ page }) => {
    await page.goto('/');
    
    // Measure Core Web Vitals
    const metrics = await page.evaluate(() => {
      return new Promise((resolve) => {
        new PerformanceObserver((list) => {
          const entries = list.getEntries();
          const vitals = {
            lcp: 0,
            fid: 0,
            cls: 0,
            fcp: 0,
            ttfb: 0
          };
          
          entries.forEach((entry) => {
            if (entry.entryType === 'largest-contentful-paint') {
              vitals.lcp = entry.startTime;
            }
            if (entry.entryType === 'first-input') {
              vitals.fid = entry.processingStart - entry.startTime;
            }
            if (entry.entryType === 'layout-shift') {
              vitals.cls += entry.value;
            }
            if (entry.name === 'first-contentful-paint') {
              vitals.fcp = entry.startTime;
            }
          });
          
          // Get TTFB
          const nav = performance.getEntriesByType('navigation')[0];
          vitals.ttfb = nav.responseStart - nav.requestStart;
          
          resolve(vitals);
        }).observe({ entryTypes: ['largest-contentful-paint', 'first-input', 'layout-shift', 'paint', 'navigation'] });
      });
    });
    
    // Assert Core Web Vitals thresholds
    expect(metrics.lcp).toBeLessThan(2500); // LCP < 2.5s
    expect(metrics.fid).toBeLessThan(100);  // FID < 100ms
    expect(metrics.cls).toBeLessThan(0.1);  // CLS < 0.1
    expect(metrics.fcp).toBeLessThan(1800); // FCP < 1.8s
    expect(metrics.ttfb).toBeLessThan(800); // TTFB < 800ms
  });
  
  test('should achieve 90+ Lighthouse score', async ({ page }) => {
    const result = await lighthouse(page.url(), {
      port: 9222,
      onlyCategories: ['performance'],
      throttling: {
        rttMs: 40,
        throughputKbps: 10240,
        cpuSlowdownMultiplier: 1
      }
    });
    
    const performanceScore = result.lhr.categories.performance.score * 100;
    expect(performanceScore).toBeGreaterThan(90);
  });
});
```

#### Component Render Performance
```typescript
// tests/performance/frontend/component-render.test.tsx
import { render } from '@testing-library/react';
import { measureRender } from '@/tests/utils/performance';

describe('Component Render Performance', () => {
  test('PredictionChart renders 1000 data points in <200ms', () => {
    const largeDataset = generateLargeDataset(1000);
    
    const renderTime = measureRender(
      <PredictionChart
        coin="BTC"
        currentPrice={45000}
        predictions={mockPredictions}
        historicalData={largeDataset}
      />
    );
    
    expect(renderTime).toBeLessThan(200);
  });
  
  test('Dashboard with 50 coins renders in <500ms', () => {
    const coins = generateMockCoins(50);
    
    const renderTime = measureRender(
      <Dashboard coins={coins} />
    );
    
    expect(renderTime).toBeLessThan(500);
  });
  
  test('Virtual scrolling handles 10k items efficiently', () => {
    const items = Array(10000).fill(null).map((_, i) => ({
      id: i,
      name: `Item ${i}`,
      value: Math.random() * 1000
    }));
    
    const renderTime = measureRender(
      <VirtualList items={items} height={600} itemHeight={50} />
    );
    
    expect(renderTime).toBeLessThan(100);
    
    // Verify only visible items are rendered
    const renderedItems = screen.getAllByRole('listitem');
    expect(renderedItems.length).toBeLessThan(20); // Only ~12 visible
  });
});
```

#### Bundle Size Analysis
```typescript
// tests/performance/frontend/bundle-size.test.ts
import { analyzeBundles } from '@next/bundle-analyzer';

describe('Bundle Size Limits', () => {
  let analysis: BundleAnalysis;
  
  beforeAll(async () => {
    analysis = await analyzeBundles();
  });
  
  test('main bundle should be <200KB', () => {
    const mainBundle = analysis.bundles.find(b => b.name === 'main');
    expect(mainBundle.size).toBeLessThan(200 * 1024); // 200KB
  });
  
  test('first load JS should be <300KB', () => {
    const firstLoadSize = analysis.bundles
      .filter(b => b.isFirstLoad)
      .reduce((sum, b) => sum + b.size, 0);
    
    expect(firstLoadSize).toBeLessThan(300 * 1024); // 300KB
  });
  
  test('route bundles should be <50KB each', () => {
    const routeBundles = analysis.bundles.filter(b => b.type === 'route');
    
    routeBundles.forEach(bundle => {
      expect(bundle.size).toBeLessThan(50 * 1024); // 50KB per route
    });
  });
  
  test('no duplicate dependencies', () => {
    const duplicates = analysis.findDuplicateDependencies();
    expect(duplicates).toHaveLength(0);
  });
});
```

### 2. API Performance Tests

#### Load Testing with k6
```javascript
// tests/performance/api/load-test.js
import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate } from 'k6/metrics';

const errorRate = new Rate('errors');

export const options = {
  stages: [
    { duration: '2m', target: 100 },   // Ramp up to 100 users
    { duration: '5m', target: 100 },   // Stay at 100 users
    { duration: '2m', target: 500 },   // Ramp up to 500 users
    { duration: '5m', target: 500 },   // Stay at 500 users
    { duration: '2m', target: 1000 },  // Ramp up to 1000 users
    { duration: '5m', target: 1000 },  // Stay at 1000 users
    { duration: '5m', target: 0 },     // Ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<500'], // 95% of requests under 500ms
    errors: ['rate<0.1'],             // Error rate under 10%
    http_req_failed: ['rate<0.1'],    // Failed requests under 10%
  },
};

const BASE_URL = 'https://api.cryptovision.ai';
const AUTH_TOKEN = __ENV.K6_AUTH_TOKEN;

export function setup() {
  // Setup test data
  const setupData = {
    coins: ['BTC', 'ETH', 'SOL', 'MATIC', 'AVAX'],
    users: generateTestUsers(100)
  };
  return setupData;
}

export default function (data) {
  const headers = {
    Authorization: `Bearer ${AUTH_TOKEN}`,
    'Content-Type': 'application/json',
  };
  
  // Scenario 1: Get prediction
  const coin = data.coins[Math.floor(Math.random() * data.coins.length)];
  const predictionRes = http.get(`${BASE_URL}/predictions/${coin}`, { headers });
  
  check(predictionRes, {
    'prediction status is 200': (r) => r.status === 200,
    'prediction response time < 2s': (r) => r.timings.duration < 2000,
    'prediction has required fields': (r) => {
      const body = JSON.parse(r.body);
      return body.prediction && body.currentPrice && body.confidence;
    },
  });
  
  errorRate.add(predictionRes.status !== 200);
  
  sleep(1);
  
  // Scenario 2: Create alert
  if (Math.random() < 0.1) { // 10% of users create alerts
    const alertRes = http.post(`${BASE_URL}/alerts`, JSON.stringify({
      coin: coin,
      type: 'price_above',
      threshold: 50000,
      notificationMethod: 'email'
    }), { headers });
    
    check(alertRes, {
      'alert creation status is 201': (r) => r.status === 201,
      'alert creation time < 300ms': (r) => r.timings.duration < 300,
    });
    
    errorRate.add(alertRes.status !== 201);
  }
  
  sleep(Math.random() * 3 + 1); // Random sleep 1-4s
}

export function teardown(data) {
  // Cleanup test data
  console.log('Test completed, cleaning up...');
}
```

#### Stress Testing
```javascript
// tests/performance/api/stress-test.js
import http from 'k6/http';
import { check } from 'k6';

export const options = {
  scenarios: {
    stress: {
      executor: 'ramping-arrival-rate',
      startRate: 10,
      timeUnit: '1s',
      preAllocatedVUs: 500,
      maxVUs: 2000,
      stages: [
        { target: 100, duration: '2m' },  // Normal load
        { target: 500, duration: '5m' },  // High load
        { target: 1000, duration: '2m' }, // Breaking point
        { target: 2000, duration: '1m' }, // Beyond capacity
        { target: 100, duration: '5m' },  // Recovery
      ],
    },
  },
  thresholds: {
    http_req_duration: ['p(99)<3000'], // Even under stress
    http_req_failed: ['rate<0.5'],     // 50% error rate threshold
  },
};

export default function () {
  const responses = http.batch([
    ['GET', `${BASE_URL}/predictions/BTC`],
    ['GET', `${BASE_URL}/predictions/ETH`],
    ['GET', `${BASE_URL}/prices/BTC`],
    ['GET', `${BASE_URL}/analytics/accuracy`],
  ]);
  
  responses.forEach(res => {
    check(res, {
      'status not 5xx': (r) => r.status < 500,
    });
  });
}
```

### 3. Database Performance Tests

#### Query Performance Benchmarks
```typescript
// tests/performance/database/query-performance.test.ts
describe('Database Query Performance', () => {
  let db: TestDatabase;
  
  beforeAll(async () => {
    db = new TestDatabase();
    await db.setup();
    await seedLargeDataset(db); // 1M records
  });
  
  test('indexed queries should complete in <10ms', async () => {
    const queries = [
      'SELECT * FROM users WHERE id = $1',
      'SELECT * FROM predictions WHERE user_id = $1 AND coin_symbol = $2',
      'SELECT * FROM alerts WHERE coin_symbol = $1 AND is_active = true',
    ];
    
    for (const query of queries) {
      const start = process.hrtime.bigint();
      await db.query(query, [randomUUID(), 'BTC']);
      const duration = Number(process.hrtime.bigint() - start) / 1e6; // ms
      
      expect(duration).toBeLessThan(10);
    }
  });
  
  test('aggregation queries should complete in <100ms', async () => {
    const start = process.hrtime.bigint();
    
    await db.query(`
      SELECT 
        coin_symbol,
        DATE_TRUNC('day', created_at) as day,
        AVG(confidence) as avg_confidence,
        COUNT(*) as prediction_count
      FROM predictions
      WHERE created_at > NOW() - INTERVAL '30 days'
      GROUP BY coin_symbol, day
      ORDER BY day DESC, coin_symbol
    `);
    
    const duration = Number(process.hrtime.bigint() - start) / 1e6;
    expect(duration).toBeLessThan(100);
  });
  
  test('concurrent writes should not degrade performance', async () => {
    const writePromises = [];
    const writeCount = 1000;
    
    const start = process.hrtime.bigint();
    
    for (let i = 0; i < writeCount; i++) {
      writePromises.push(
        db.query(
          'INSERT INTO predictions (...) VALUES (...)',
          generatePredictionData()
        )
      );
    }
    
    await Promise.all(writePromises);
    const duration = Number(process.hrtime.bigint() - start) / 1e6;
    
    const avgWriteTime = duration / writeCount;
    expect(avgWriteTime).toBeLessThan(5); // <5ms per write
  });
});
```

#### Connection Pool Testing
```typescript
// tests/performance/database/connection-pool.test.ts
describe('Database Connection Pool', () => {
  test('should handle connection pool exhaustion gracefully', async () => {
    const pool = new Pool({
      max: 20,
      connectionTimeoutMillis: 5000,
    });
    
    // Create more concurrent queries than pool size
    const queries = Array(50).fill(null).map(() => 
      pool.query('SELECT pg_sleep(0.1)') // 100ms query
    );
    
    const start = Date.now();
    const results = await Promise.allSettled(queries);
    const duration = Date.now() - start;
    
    // All queries should complete
    const successful = results.filter(r => r.status === 'fulfilled');
    expect(successful.length).toBe(50);
    
    // Should take ~250ms (50 queries / 20 connections * 100ms)
    expect(duration).toBeLessThan(300);
    expect(duration).toBeGreaterThan(200);
  });
  
  test('should recover from connection failures', async () => {
    const pool = createResilientPool();
    let successCount = 0;
    let errorCount = 0;
    
    // Simulate intermittent connection failures
    for (let i = 0; i < 100; i++) {
      try {
        if (i === 50) {
          // Simulate network issue
          await simulateNetworkFailure();
        }
        
        await pool.query('SELECT 1');
        successCount++;
      } catch (error) {
        errorCount++;
      }
    }
    
    // Should have mostly successes with some failures
    expect(successCount).toBeGreaterThan(90);
    expect(errorCount).toBeLessThan(10);
  });
});
```

### 4. WebSocket Performance Tests

#### Connection Scalability
```typescript
// tests/performance/websocket/connection-scale.test.ts
import WebSocket from 'ws';

describe('WebSocket Scalability', () => {
  test('should handle 10k concurrent connections', async () => {
    const connections: WebSocket[] = [];
    const targetConnections = 10000;
    const batchSize = 100;
    
    const start = Date.now();
    
    // Connect in batches to avoid overwhelming
    for (let i = 0; i < targetConnections; i += batchSize) {
      const batch = Array(batchSize).fill(null).map(() => 
        new Promise((resolve, reject) => {
          const ws = new WebSocket('ws://localhost:3000/api/ws');
          ws.on('open', () => {
            connections.push(ws);
            resolve(ws);
          });
          ws.on('error', reject);
        })
      );
      
      await Promise.all(batch);
      
      // Small delay between batches
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    const connectionTime = Date.now() - start;
    
    expect(connections.length).toBe(targetConnections);
    expect(connectionTime).toBeLessThan(60000); // <1 minute
    
    // Verify all connections are active
    const pingPromises = connections.map(ws => 
      new Promise(resolve => {
        ws.ping();
        ws.once('pong', resolve);
      })
    );
    
    await Promise.all(pingPromises);
    
    // Cleanup
    connections.forEach(ws => ws.close());
  });
  
  test('message broadcast performance', async () => {
    const connections = await createWebSocketConnections(1000);
    const messageCount = 0;
    
    // Subscribe all to BTC updates
    connections.forEach(ws => {
      ws.send(JSON.stringify({ action: 'subscribe', coins: ['BTC'] }));
      ws.on('message', () => messageCount++);
    });
    
    // Simulate price updates
    const start = Date.now();
    const updates = 100;
    
    for (let i = 0; i < updates; i++) {
      // Server broadcasts to all connections
      await broadcastPriceUpdate('BTC', 45000 + i);
      await new Promise(resolve => setTimeout(resolve, 10));
    }
    
    const duration = Date.now() - start;
    
    // Each connection should receive all updates
    expect(messageCount).toBe(1000 * updates);
    expect(duration).toBeLessThan(2000); // <2s for 100k messages
  });
});
```

### 5. Cache Performance Tests

#### Redis Cache Benchmarks
```typescript
// tests/performance/cache/redis-performance.test.ts
import Redis from 'ioredis';

describe('Redis Cache Performance', () => {
  let redis: Redis;
  
  beforeAll(() => {
    redis = new Redis({
      host: 'localhost',
      port: 6379,
      enableOfflineQueue: false,
    });
  });
  
  test('cache operations should be <5ms', async () => {
    const operations = [
      // SET operation
      async () => {
        const start = process.hrtime.bigint();
        await redis.set('test:key', JSON.stringify({ data: 'value' }));
        return Number(process.hrtime.bigint() - start) / 1e6;
      },
      
      // GET operation
      async () => {
        const start = process.hrtime.bigint();
        await redis.get('test:key');
        return Number(process.hrtime.bigint() - start) / 1e6;
      },
      
      // HSET operation
      async () => {
        const start = process.hrtime.bigint();
        await redis.hset('predictions:BTC', 'latest', JSON.stringify({ price: 45000 }));
        return Number(process.hrtime.bigint() - start) / 1e6;
      },
    ];
    
    for (const operation of operations) {
      const times = [];
      
      // Run 100 times to get average
      for (let i = 0; i < 100; i++) {
        times.push(await operation());
      }
      
      const avgTime = times.reduce((a, b) => a + b) / times.length;
      expect(avgTime).toBeLessThan(5);
    }
  });
  
  test('cache hit rate should be >90%', async () => {
    // Warm up cache
    const keys = Array(1000).fill(null).map((_, i) => `cache:test:${i}`);
    
    for (const key of keys) {
      await redis.set(key, JSON.stringify({ value: Math.random() }));
    }
    
    // Simulate realistic access pattern (80/20 rule)
    const hotKeys = keys.slice(0, 200); // 20% of keys
    const accesses = 10000;
    let hits = 0;
    
    for (let i = 0; i < accesses; i++) {
      const key = Math.random() < 0.8 ? 
        hotKeys[Math.floor(Math.random() * hotKeys.length)] :
        keys[Math.floor(Math.random() * keys.length)];
      
      const value = await redis.get(key);
      if (value) hits++;
    }
    
    const hitRate = (hits / accesses) * 100;
    expect(hitRate).toBeGreaterThan(90);
  });
});
```

## 📈 Performance Monitoring

### Real-time Metrics Collection
```typescript
// src/lib/performance/metrics-collector.ts
export class MetricsCollector {
  private metrics: Map<string, Metric[]> = new Map();
  
  recordMetric(name: string, value: number, tags?: Record<string, string>) {
    const metric = {
      name,
      value,
      timestamp: Date.now(),
      tags: tags || {}
    };
    
    if (!this.metrics.has(name)) {
      this.metrics.set(name, []);
    }
    
    this.metrics.get(name)!.push(metric);
    
    // Send to monitoring service
    this.sendToDatadog(metric);
  }
  
  recordAPILatency(endpoint: string, duration: number, statusCode: number) {
    this.recordMetric('api.latency', duration, {
      endpoint,
      status: statusCode.toString(),
      method: 'GET'
    });
  }
  
  recordCacheHit(key: string, hit: boolean) {
    this.recordMetric('cache.access', hit ? 1 : 0, {
      key: key.split(':')[0], // Extract key prefix
      result: hit ? 'hit' : 'miss'
    });
  }
  
  getPercentile(metricName: string, percentile: number): number {
    const values = this.metrics.get(metricName)?.map(m => m.value) || [];
    values.sort((a, b) => a - b);
    
    const index = Math.ceil(values.length * (percentile / 100)) - 1;
    return values[index] || 0;
  }
}
```

### Performance Dashboard
```typescript
// src/components/monitoring/PerformanceDashboard.tsx
export function PerformanceDashboard() {
  const metrics = usePerformanceMetrics();
  
  return (
    <div className="grid grid-cols-2 gap-4">
      <MetricCard
        title="API Latency (p95)"
        value={`${metrics.apiLatencyP95}ms`}
        target="<500ms"
        status={metrics.apiLatencyP95 < 500 ? 'good' : 'warning'}
      />
      
      <MetricCard
        title="Cache Hit Rate"
        value={`${metrics.cacheHitRate}%`}
        target=">90%"
        status={metrics.cacheHitRate > 90 ? 'good' : 'warning'}
      />
      
      <MetricCard
        title="Active WebSockets"
        value={metrics.activeWebSockets}
        target="<10,000"
        status={metrics.activeWebSockets < 10000 ? 'good' : 'warning'}
      />
      
      <MetricCard
        title="Database Pool Usage"
        value={`${metrics.dbPoolUsage}%`}
        target="<80%"
        status={metrics.dbPoolUsage < 80 ? 'good' : 'warning'}
      />
      
      <LatencyHistogram data={metrics.latencyDistribution} />
      <ThroughputChart data={metrics.throughputTimeSeries} />
    </div>
  );
}
```

## 🚨 Performance Alerting

### Alert Configuration
```yaml
# monitoring/alerts/performance.yml
alerts:
  - name: high_api_latency
    condition: api.latency.p95 > 1000
    duration: 5m
    severity: warning
    notification:
      - email: ops@cryptovision.ai
      - slack: #alerts-performance
    
  - name: low_cache_hit_rate
    condition: cache.hit_rate < 80
    duration: 10m
    severity: warning
    
  - name: database_slow_queries
    condition: db.query_time.p99 > 100
    duration: 5m
    severity: critical
    
  - name: memory_leak_detected
    condition: memory.heap_used > 1.5 * memory.heap_used.1h_ago
    duration: 30m
    severity: critical
```

## 🔧 Performance Optimization Checklist

### Frontend Optimizations
- [ ] Code splitting by route
- [ ] Lazy loading for components
- [ ] Image optimization (WebP, AVIF)
- [ ] Service Worker for caching
- [ ] Preconnect to API domains
- [ ] Resource hints (prefetch, preload)
- [ ] Virtual scrolling for long lists
- [ ] Debounced search inputs
- [ ] Memoized expensive calculations
- [ ] Optimistic UI updates

### Backend Optimizations
- [ ] Database query optimization
- [ ] Proper indexing strategy
- [ ] Connection pooling tuning
- [ ] Redis cache warming
- [ ] CDN for static assets
- [ ] Gzip/Brotli compression
- [ ] HTTP/2 server push
- [ ] Request batching
- [ ] Rate limiting per tier
- [ ] Horizontal scaling ready

### Monitoring & Alerting
- [ ] Real-time performance dashboard
- [ ] Automated performance tests in CI
- [ ] Synthetic monitoring
- [ ] Real user monitoring (RUM)
- [ ] Error tracking with context
- [ ] Performance budgets enforced
- [ ] Capacity planning metrics
- [ ] Cost per request tracking

This comprehensive performance testing strategy ensures Crypto Vision can handle 10,000+ concurrent users while maintaining excellent response times and user experience.