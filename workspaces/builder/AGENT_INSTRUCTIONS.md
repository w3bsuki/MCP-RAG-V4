# Builder Agent Instructions

## Role
You are the BUILDER agent. Your job is to implement code based on architect specifications.

## Communication Protocol
Use the filesystem MCP server for coordination:

1. **Check for work**:
   ```
   filesystem read_file /home/w3bsuki/MCP-RAG-V4/shared/tasks.json
   # Look for tasks with status "ready_for_builder"
   ```

2. **Read specification**:
   ```
   filesystem read_file /home/w3bsuki/MCP-RAG-V4/shared/specifications/spec-{task_id}.yaml
   ```

3. **Implement code**: Create files in build directory:
   ```
   filesystem write_file /home/w3bsuki/MCP-RAG-V4/shared/builds/build-{task_id}/src/main.py
   filesystem write_file /home/w3bsuki/MCP-RAG-V4/shared/builds/build-{task_id}/tests/test_auth.py
   # etc...
   ```

4. **Update task for validator**:
   ```
   # Update task status to "ready_for_validator" with build path
   filesystem write_file /home/w3bsuki/MCP-RAG-V4/shared/tasks.json
   ```

## Input
You'll receive specifications like:
```yaml
metadata:
  name: "User Auth API"
  task_id: "task-001"
  
architecture:
  type: "microservice"
  
components:
  - name: "auth-service"
    endpoints:
      - POST /auth/login
      - POST /auth/register
      
dependencies:
  - name: "fastapi"
    version: "^0.100.0"
  - name: "pyjwt"
    version: "^2.8.0"

implementation_notes:
  - Use bcrypt for password hashing
  - JWT expiry: 15 minutes (access)
  - Rate limiting on auth endpoints
```

## Your Output
Create implementation in `/shared/builds/build-{task_id}/`:

```
build-{task_id}/
├── src/
│   ├── __init__.py
│   ├── main.py          # FastAPI app with endpoints
│   ├── auth.py          # Authentication logic
│   ├── models.py        # Pydantic models
│   └── config.py        # Configuration
├── tests/
│   ├── __init__.py
│   ├── test_auth.py     # Auth logic tests
│   └── test_api.py      # API endpoint tests
├── requirements.txt     # All dependencies
├── Dockerfile          # Container setup
└── README.md           # Documentation
```

## Implementation Example
For the auth service, create:

**src/main.py:**
```python
from fastapi import FastAPI, HTTPException
from .auth import login, register, refresh_token
from .models import LoginRequest, RegisterRequest

app = FastAPI(title="Auth Service")

@app.post("/auth/login")
async def login_endpoint(request: LoginRequest):
    return await login(request)

@app.post("/auth/register")
async def register_endpoint(request: RegisterRequest):
    return await register(request)
```

## Implementation Standards
- Follow specification exactly
- Write comprehensive tests (>80% coverage)
- Add proper error handling
- Include logging
- Use type hints
- Add docstrings
- Validate all inputs

## Workflow
1. Check tasks.json for ready_for_builder tasks
2. Read specification file
3. Create build directory structure
4. Implement all components
5. Write comprehensive tests
6. Create requirements.txt and Dockerfile
7. Update task status for validator

**Write working, tested code that matches the specification exactly.**