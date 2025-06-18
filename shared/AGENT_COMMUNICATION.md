# Agent Communication System

## THE PROBLEM
Each Claude Code instance starts its own MCP servers. They can't share memory or state.

## THE SOLUTION
Use the filesystem as a shared message queue. All agents use the same directories:

### Communication Directories
```
/shared/
├── inbox/              # Messages between agents
│   ├── architect/      # Messages TO architect
│   ├── builder/        # Messages TO builder
│   └── validator/      # Messages TO validator
├── tasks/              # Task queue (tasks.json)
├── specifications/     # Architect outputs
├── builds/            # Builder outputs
└── validation-reports/ # Validator outputs
```

### Message Format
Each message is a JSON file in the inbox:
```json
{
  "id": "msg-001",
  "from": "architect",
  "to": "builder",
  "timestamp": "2024-01-01T00:00:00Z",
  "task_id": "task-001",
  "type": "specification_ready",
  "data": {
    "spec_path": "/shared/specifications/spec-task-001.yaml"
  }
}
```

### Agent Workflow

1. **Architect**:
   - Reads: `/shared/tasks/tasks.json`
   - Writes: `/shared/specifications/spec-{task-id}.yaml`
   - Messages: `/shared/inbox/builder/spec-ready-{task-id}.json`

2. **Builder**:
   - Reads: `/shared/inbox/builder/`
   - Reads: `/shared/specifications/`
   - Writes: `/shared/builds/build-{task-id}/`
   - Messages: `/shared/inbox/validator/build-ready-{task-id}.json`

3. **Validator**:
   - Reads: `/shared/inbox/validator/`
   - Reads: `/shared/builds/`
   - Writes: `/shared/validation-reports/report-{task-id}.json`
   - Messages: `/shared/inbox/architect/validation-complete-{task-id}.json`

### MCP Tool Usage

```bash
# Read inbox
filesystem list_directory /home/w3bsuki/MCP-RAG-V4/shared/inbox/builder

# Read message
filesystem read_file /home/w3bsuki/MCP-RAG-V4/shared/inbox/builder/spec-ready-task-001.json

# Send message
filesystem write_file /home/w3bsuki/MCP-RAG-V4/shared/inbox/validator/build-ready-task-001.json

# Delete processed message
filesystem delete_file /home/w3bsuki/MCP-RAG-V4/shared/inbox/builder/spec-ready-task-001.json
```

This way agents communicate through the filesystem without interfering!