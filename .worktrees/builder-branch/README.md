# Builder Agent Workspace

This is the working directory for the **Builder Agent** in the MCP-RAG-V4 system.

## Role & Responsibilities
- 🔨 Implement architectural designs
- 💻 Write production-quality code
- 🧪 Create unit and integration tests
- ♻️ Refactor existing code
- 🔌 Integrate APIs and services
- 🏗️ Setup development environments

## Getting Started

1. **Check Active Tasks**:
   ```bash
   cat ../../coordination/ACTIVE_TASKS.json | jq '.tasks[] | select(.assignedTo == "builder")'
   ```

2. **Update Task Status**:
   - Edit `../../coordination/ACTIVE_TASKS.json` when starting/completing tasks
   - Always commit with proof of completion

3. **Available MCP Tools**:
   - `filesystem` - Read/write/execute files in project areas
   - `vector-search` - Search for code examples and patterns
   - `knowledge-base` - Store implementation patterns and solutions
   - `git-ops` - Git operations with confirmation flags
   - `testing-tools` - Run tests, lint, format, security scans
   - `coordination-hub` - Inter-agent communication
   - `github` - Create PRs, comment on issues

## Development Workflow
1. **Read Specifications** → Review architect's designs from `../shared/specifications/`
2. **Implement Code** → Write clean, tested, documented code
3. **Run Tests** → Use `testing-tools` to validate implementation
4. **Commit Changes** → Use `git-ops` with proper commit messages
5. **Update Tasks** → Mark progress and notify Validator

## Restrictions
❌ **Cannot perform**:
- Production deployment
- Database schema changes
- Security-critical modifications without review
- Deletion of production data
- Modification of CI/CD pipeline

## Available Commands

### Testing & Quality
```bash
# Run tests via MCP
# Use testing-tools/run_tests

# Lint code
# Use testing-tools/lint_code

# Security scan
# Use testing-tools/security_scan

# Check coverage
# Use testing-tools/check_coverage
```

### Git Operations
```bash
# All git operations via git-ops MCP server
# Includes automatic confirmation for destructive operations
```

### Environment Setup
```bash
# Install dependencies
npm install  # or pip install -r requirements.txt

# Start development server
npm run dev  # or python app.py
```

## Communication
- **Task Updates**: Edit `../../coordination/ACTIVE_TASKS.json`
- **Code Artifacts**: Store in `../shared/artifacts/`
- **Implementation Notes**: Use `knowledge-base` MCP server
- **PR Creation**: Use `github` MCP server

## Quality Standards
- ✅ Code must pass all tests before commit
- ✅ Code must be linted and formatted
- ✅ Security scans must pass
- ✅ Documentation must be updated
- ✅ Commit messages must follow conventional format

## Quick Commands
```bash
# View current tasks
jq '.agents.builder' ../../coordination/ACTIVE_TASKS.json

# Check system status
npm run stack:status

# View logs
npm run stack:logs
```