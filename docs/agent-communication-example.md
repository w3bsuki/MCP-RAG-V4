# Agent Communication Example

## Workflow: API Design to Implementation

### 1. Admin creates task
```json
{
  "task_id": "task-001",
  "title": "Create User Authentication API",
  "description": "Design and implement JWT-based auth system",
  "priority": "high",
  "assigned_to": "architect"
}
```

### 2. Architect claims task via MCP
```bash
# Using task-manager MCP
task-manager claim-task --id task-001 --agent architect
```

### 3. Architect creates specification
```yaml
# Saved to shared/specifications/auth-api-v1.yaml
specification:
  name: "User Authentication API"
  version: "1.0.0"
  endpoints:
    - POST /auth/register
    - POST /auth/login
    - POST /auth/refresh
    - POST /auth/logout
```

### 4. Architect notifies Builder via RabbitMQ
```python
# Using RabbitMQ MCP
message = AgentMessage(
    from_agent="architect",
    to_agent="builder", 
    action="implement_specification",
    payload={
        "specification_path": "/shared/specifications/auth-api-v1.yaml",
        "task_id": "task-001",
        "deadline": "2024-01-20T00:00:00Z"
    }
)

# Send via MCP
rabbitmq.send_message("builder_tasks", message.to_json())
```

### 5. Builder receives and implements
```bash
# Builder uses multiple MCP tools
filesystem read /shared/specifications/auth-api-v1.yaml
context7 search "JWT implementation best practices"
git-mcp checkout -b feature/auth-api
filesystem write /src/auth/controller.py
testing-tools run-tests /src/auth/
git-mcp commit -m "feat: implement authentication API"
```

### 6. Builder notifies Validator
```python
message = AgentMessage(
    from_agent="builder",
    to_agent="validator",
    action="validate_implementation", 
    payload={
        "branch": "feature/auth-api",
        "files": ["/src/auth/controller.py", "/tests/auth/"],
        "task_id": "task-001"
    }
)
```

### 7. Validator runs tests
```bash
# Validator uses MCP tools
git-mcp checkout feature/auth-api
testing-tools run-security-scan /src/auth/
testing-tools run-tests /tests/auth/
testing-tools check-coverage /src/auth/
```

### 8. Validator reports results
```json
{
  "validation_report": {
    "task_id": "task-001",
    "status": "PASS",
    "security": {
      "vulnerabilities": [],
      "risk_level": "LOW"
    },
    "quality": {
      "coverage": 92,
      "tests_passed": 45,
      "tests_failed": 0
    },
    "approved": true
  }
}
```

### 9. Task marked complete
```bash
task-manager complete-task --id task-001 --report validation_report.json
```

## MCP Tools Used

1. **task-manager**: Task lifecycle management
2. **rabbitmq**: Inter-agent messaging
3. **filesystem**: File operations
4. **context7**: Documentation lookup
5. **git-mcp**: Version control
6. **testing-tools**: Quality assurance
7. **redis**: Shared state
8. **coordination-hub**: Workflow orchestration

## Benefits

- **Isolation**: Each agent works in its own git worktree
- **Communication**: Async messaging via MCP protocols
- **Persistence**: Tasks and state stored in SQLite/Redis
- **Auditability**: All actions logged via MCP
- **Scalability**: Can run agents on different machines
- **Reliability**: Message queues ensure delivery