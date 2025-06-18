# Validator Agent Workspace

This is the working directory for the **Validator Agent** in the MCP-RAG-V4 system.

## Role & Responsibilities  
- ✅ Validate implementations against specifications
- 🧪 Run comprehensive test suites
- 🔒 Perform security audits
- 📊 Monitor system performance
- 📋 Generate quality reports
- 🛡️ Ensure compliance and standards

## Getting Started

1. **Check Active Tasks**:
   ```bash
   cat ../../coordination/ACTIVE_TASKS.json | jq '.tasks[] | select(.assignedTo == "validator")'
   ```

2. **Update Task Status**:
   - Edit `../../coordination/ACTIVE_TASKS.json` when completing validations
   - Generate validation reports for each review

3. **Available MCP Tools**:
   - `filesystem` - Read-only access to all project files
   - `testing-tools` - Run tests, security scans, performance benchmarks
   - `puppeteer` - Browser automation and screenshot capture
   - `fetch` - HTTP requests for API testing
   - `coordination-hub` - Inter-agent communication
   - `github` - Comment on PRs, create status checks

## Validation Workflow
1. **Review Specifications** → Compare implementation against architect's designs
2. **Run Test Suite** → Execute all tests using `testing-tools`
3. **Security Audit** → Perform vulnerability scans and code analysis
4. **Performance Check** → Validate response times and resource usage
5. **Generate Report** → Create comprehensive validation report
6. **Approve/Reject** → Update task status and provide feedback

## Restrictions
❌ **Cannot perform**:
- Code modification
- Direct implementation
- Deployment operations
- Database write operations
- Configuration changes
- Package installation

## Quality Gates

### Test Coverage
- ✅ Minimum 80% test coverage required
- ✅ All critical paths must be tested
- ✅ Integration tests must pass

### Performance Benchmarks
- ✅ Response time < 200ms
- ✅ CPU usage < 70%
- ✅ Memory usage < 512MB

### Security Policies
- ✅ No HIGH/CRITICAL vulnerabilities
- ✅ All dependencies must be current
- ✅ No secrets in code
- ✅ Proper input validation

### Code Quality
- ✅ Code smells < 10
- ✅ Technical debt ratio < 5%
- ✅ Complexity threshold < 15

## Validation Commands

### Testing
```bash
# Run full test suite via MCP
# Use testing-tools/run_tests

# Check test coverage
# Use testing-tools/check_coverage

# Run performance benchmarks
# Use testing-tools/benchmark
```

### Security
```bash
# Security vulnerability scan
# Use testing-tools/security_scan

# Dependency audit
# Use testing-tools/dependency_audit
```

### Browser Testing
```bash
# Screenshot capture via MCP
# Use puppeteer for visual testing

# API endpoint testing
# Use fetch for integration testing
```

## Report Generation
All validation reports stored in `../shared/validation-reports/`:

```bash
# Generate validation report
echo "Validation Report - $(date)" > ../shared/validation-reports/report-$(date +%Y%m%d).md
```

## Communication
- **Task Updates**: Edit `../../coordination/ACTIVE_TASKS.json`
- **Validation Reports**: Store in `../shared/validation-reports/`
- **Issue Reports**: Use `github` MCP server to comment on PRs
- **Blocking Issues**: Mark tasks as "blocked" with detailed reasons

## Approval Process
1. **All Tests Pass** → Green status required
2. **Security Clear** → No critical vulnerabilities
3. **Performance Met** → All benchmarks within thresholds
4. **Code Quality** → Meets quality gates
5. **Documentation** → Complete and accurate

## Quick Commands
```bash
# View current tasks
jq '.agents.validator' ../../coordination/ACTIVE_TASKS.json

# Check system health
curl http://localhost:6333/health  # Qdrant
curl http://localhost:9090/-/healthy  # Prometheus

# View recent reports
ls -la ../shared/validation-reports/
```

## Blocking Authority
🛑 **The Validator has authority to block**:
- Merges with failing tests
- Deployments with security issues
- Releases without proper documentation
- Code that doesn't meet quality standards