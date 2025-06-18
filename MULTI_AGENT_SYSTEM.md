# Multi-Agent System Instructions

## How This Works

You have 3 Claude Code instances running in parallel, each taking a specific role:

### 1. ARCHITECT Claude Code Instance
- **Working Directory**: `/home/w3bsuki/MCP-RAG-V4/workspaces/architect`
- **Role**: Read `AGENT_INSTRUCTIONS.md` and BECOME the architect
- **Job**: Create specifications from tasks
- **Communication**: 
  - Read tasks from `/shared/tasks.json`
  - Write specs to `/shared/specifications/`
  - Update task status in tasks.json

### 2. BUILDER Claude Code Instance  
- **Working Directory**: `/home/w3bsuki/MCP-RAG-V4/workspaces/builder`
- **Role**: Read `AGENT_INSTRUCTIONS.md` and BECOME the builder
- **Job**: Implement code from specifications
- **Communication**:
  - Read specs from `/shared/specifications/`
  - Write code to `/shared/builds/`
  - Update task status in tasks.json

### 3. VALIDATOR Claude Code Instance
- **Working Directory**: `/home/w3bsuki/MCP-RAG-V4/workspaces/validator`
- **Role**: Read `AGENT_INSTRUCTIONS.md` and BECOME the validator
- **Job**: Test and validate implementations
- **Communication**:
  - Read code from `/shared/builds/`
  - Write reports to `/shared/validation-reports/`
  - Update task status in tasks.json

## Starting the System

1. **Create a task**:
   ```bash
   python3 create_task.py "API Name" "Description" "features"
   ```

2. **Start Claude Code instances** (3 separate terminals):

   **Terminal 1 - Architect**:
   ```bash
   cd /home/w3bsuki/MCP-RAG-V4/workspaces/architect
   # Start Claude Code here
   # First command: Read AGENT_INSTRUCTIONS.md
   # Then start working on tasks
   ```

   **Terminal 2 - Builder**:
   ```bash
   cd /home/w3bsuki/MCP-RAG-V4/workspaces/builder
   # Start Claude Code here
   # First command: Read AGENT_INSTRUCTIONS.md
   # Then wait for architect to create specs
   ```

   **Terminal 3 - Validator**:
   ```bash
   cd /home/w3bsuki/MCP-RAG-V4/workspaces/validator
   # Start Claude Code here
   # First command: Read AGENT_INSTRUCTIONS.md
   # Then wait for builder to create code
   ```

## Key Points

- Each Claude Code instance has the SAME `.mcp.json` config (filesystem + github)
- They communicate by reading/writing shared files
- They don't interfere because they work on different directories
- Task coordination happens through `/shared/tasks.json`

## Example Workflow

1. **Human creates task** → saved to `/shared/tasks.json`
2. **Architect Claude** reads task → creates spec → updates task status
3. **Builder Claude** sees updated status → reads spec → builds code
4. **Validator Claude** sees code ready → runs tests → creates report

All communication happens through the filesystem MCP server!