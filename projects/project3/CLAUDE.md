# Project3: Crypto Vision - Agent Rules & Workflow

## 🚨 CRITICAL: LESSONS FROM PROJECTS 1 & 2

### What Failed Before
- **Project1**: ZERO tests written (complete failure)
- **Project2**: Only 15% test coverage (claimed 92% falsely)
- **Validator**: Didn't validate anything, just rubber-stamped
- **ALL PROJECTS**: NO PROPER TECH STACK INITIALIZATION

### What We're Changing
1. **TECH STACK INITIALIZATION FIRST - ALWAYS**
2. **Test-First Development ENFORCED**
3. **Real-time test monitoring**
4. **Automatic rejection of untested code**
5. **Validator has VETO power**

## 📋 Agent-Specific Rules

### ARCHITECT AGENT
```yaml
responsibilities:
  - Create TESTABLE design documents
  - Specify test requirements for EVERY feature
  - Define performance benchmarks upfront
  
deliverables:
  - architecture/DESIGN.md with test specs
  - test/TEST_PLAN.md with coverage goals
  - benchmarks/PERFORMANCE.md with targets
  
forbidden:
  - Designs without test specifications
  - Vague requirements ("make it fast")
  - Missing error scenarios
```

### BUILDER AGENT
```yaml
workflow:
  0. INITIALIZE PROJECT FIRST (NON-NEGOTIABLE):
     - npx create-next-app@latest . --typescript --tailwind --app
     - npm install
     - Create ALL directories: app/, components/, lib/
     - npm run dev (MUST WORK before proceeding)
  1. THEN read test specifications
  2. Write failing test
  3. Run test (confirm it fails)
  4. Write minimal code to pass
  5. Run test (confirm it passes)
  6. Refactor if needed
  7. Run coverage report
  8. Only commit if >95% coverage
  
forbidden:
  - Writing tests before project exists
  - Skipping project initialization
  - Committing without test coverage
  - Marking tasks complete without tests
  - "I'll add tests later" - NO!
  
tools:
  - Must run: npm test -- --coverage
  - Must check: coverage/lcov-report/index.html
  - Must achieve: 95% line coverage minimum
```

### VALIDATOR AGENT
```yaml
responsibilities:
  - Run tests every 30 minutes
  - Check coverage reports
  - REJECT any code below 95% coverage
  - Verify performance benchmarks
  - Security scan all code
  
veto_power:
  - Can BLOCK any commit
  - Can REVERT untested code
  - Can STOP deployment
  - Must document why blocked
  
reports:
  - validation/DAILY_REPORT.md
  - validation/COVERAGE_TREND.md
  - validation/BLOCKED_COMMITS.md
```

## 🚨 MANDATORY FIRST STEP: PROJECT INITIALIZATION

### BEFORE WRITING ANY TESTS, BUILDER MUST:
```bash
# 1. Initialize Next.js (REQUIRED)
npx create-next-app@latest . --typescript --tailwind --app --src-dir

# 2. Install dependencies (REQUIRED)
npm install

# 3. Verify it runs (REQUIRED)
npm run dev
# MUST see "Ready on http://localhost:3000"

# 4. Create directory structure (REQUIRED)
mkdir -p src/{components,lib,types}
mkdir -p src/app/{api,dashboard,predictions,alerts}

# 5. Install test dependencies (REQUIRED)
npm install --save-dev jest @testing-library/react @testing-library/jest-dom
npm install --save-dev @types/jest jest-environment-jsdom
```

### ONLY AFTER ALL ABOVE STEPS ARE COMPLETE, THEN:

## 🏗️ Project Structure with Tests

```
project3/
├── src/
│   ├── app/                    # Next.js app router
│   ├── components/             # UI components
│   ├── lib/                    # Core logic
│   └── __tests__/             # Test files
├── tests/
│   ├── unit/                  # Unit tests
│   ├── integration/           # API tests
│   ├── e2e/                   # Playwright tests
│   └── performance/           # Load tests
├── coverage/                  # Coverage reports
└── benchmarks/               # Performance tests
```

## 🧪 Test Requirements

### Unit Tests (95% minimum)
```typescript
// EVERY function must have tests
describe('calculatePredictionConfidence', () => {
  it('should return high confidence for strong signals', () => {
    const result = calculatePredictionConfidence(mockStrongSignals);
    expect(result).toBeGreaterThan(80);
  });
  
  it('should handle missing data gracefully', () => {
    const result = calculatePredictionConfidence({});
    expect(result).toBe(0);
  });
});
```

### Integration Tests
```typescript
// EVERY API route must be tested
describe('POST /api/predictions', () => {
  it('should generate prediction with valid data', async () => {
    const response = await request(app)
      .post('/api/predictions')
      .send({ symbol: 'BTC', timeframe: '7d' });
    
    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('prediction');
    expect(response.body.confidence).toBeGreaterThan(0);
  });
});
```

### E2E Tests
```typescript
// Critical user flows must be tested
test('user can view prediction and set alert', async ({ page }) => {
  await page.goto('/');
  await page.click('text=Bitcoin');
  await expect(page.locator('.prediction-chart')).toBeVisible();
  await page.click('text=Set Alert');
  await page.fill('#threshold', '50000');
  await page.click('text=Save Alert');
  await expect(page.locator('.alert-confirmation')).toBeVisible();
});
```

## 📊 Monitoring Requirements

### Real-Time Metrics
```typescript
interface AgentMetrics {
  testFilesCreated: number;
  testsWritten: number;
  testsPassing: number;
  coveragePercent: number;
  timeSinceLastTest: number; // minutes
  blockedCommits: number;
}
```

### Alert Thresholds
- ⚠️ Warning: No test written in 30 minutes
- 🚨 Critical: Coverage drops below 90%
- 🛑 Blocker: Code committed without tests

## 🔄 Workflow Enforcement

### Pre-Commit Hook
```bash
#!/bin/sh
# .husky/pre-commit

# Run tests
npm test -- --coverage

# Check coverage
COVERAGE=$(cat coverage/coverage-summary.json | jq '.total.lines.pct')
if (( $(echo "$COVERAGE < 95" | bc -l) )); then
  echo "❌ Coverage is ${COVERAGE}%, must be 95% or higher"
  exit 1
fi

# Run linter
npm run lint

echo "✅ All checks passed!"
```

### CI/CD Pipeline
```yaml
name: Quality Gates
on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Install dependencies
        run: npm ci
      
      - name: Run tests with coverage
        run: npm test -- --coverage
      
      - name: Check coverage threshold
        run: |
          COVERAGE=$(cat coverage/coverage-summary.json | jq '.total.lines.pct')
          if (( $(echo "$COVERAGE < 95" | bc -l) )); then
            echo "Coverage is ${COVERAGE}%, must be 95% or higher"
            exit 1
          fi
      
      - name: Run E2E tests
        run: npm run test:e2e
      
      - name: Performance tests
        run: npm run test:performance
```

## 📝 Task Completion Criteria

### Definition of Done
A task is ONLY complete when:
1. ✅ Feature implemented
2. ✅ Unit tests written (>95% coverage)
3. ✅ Integration tests written
4. ✅ E2E tests for user flows
5. ✅ Documentation updated
6. ✅ Performance benchmarks met
7. ✅ Security scan passed
8. ✅ Code reviewed by validator
9. ✅ PR merged with all checks green

### Task Board Updates
```json
{
  "task": {
    "id": "implement-price-prediction",
    "status": "in_progress",
    "checklist": {
      "tests_written": true,
      "coverage_percent": 96.5,
      "integration_tests": true,
      "e2e_tests": false,  // Can't mark complete!
      "validator_approved": false
    }
  }
}
```

## 🚦 Quality Gates

### Commit Gate
- No commit without 95% coverage
- No commit without passing tests
- No commit without linter passing

### PR Gate
- All tests must pass
- Coverage must be >95%
- No security vulnerabilities
- Performance benchmarks met

### Deployment Gate
- E2E tests must pass
- Load tests must pass
- Validator must approve
- No critical bugs in last 24h

## 📈 Success Metrics

### Daily Tracking
- Tests written per feature
- Coverage trend (must go up)
- Test execution time
- Failed test recovery time

### Weekly Review
- Average coverage percentage
- Validator intervention count
- Blocked commit reasons
- Test-to-code ratio

## 🛑 ENFORCEMENT RULES

1. **NO EXCEPTIONS**: Even "small fixes" need tests
2. **NO RUSHING**: "We'll add tests later" = NEVER
3. **NO EXCUSES**: "It's hard to test" = redesign it
4. **NO SHORTCUTS**: 94.9% coverage = FAIL

Remember: **A feature without tests is a bug waiting to happen**

---

## Monitoring Commands for Human Supervisor

```bash
# Check current coverage
npm test -- --coverage

# Watch test execution
npm test -- --watch

# Check specific file coverage
npm test -- --coverage src/lib/predictions.ts

# Run E2E tests with UI
npm run test:e2e -- --headed

# Generate coverage report
npm run coverage:report
```

Use these commands to monitor agent progress in real-time!