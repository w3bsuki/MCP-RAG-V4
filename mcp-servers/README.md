# MCP Servers

Individual Model Context Protocol servers following single responsibility principle.

## Servers

### 1. Filesystem Server
Handles file system operations:
- `read_file` - Read file contents
- `write_file` - Write content to file
- `list_directory` - List directory contents
- `delete_file` - Delete a file

### 2. Knowledge Base Server
Manages knowledge storage and retrieval:
- `store_knowledge` - Store knowledge with categories and tags
- `search_knowledge` - Search by query, category, or tags
- `get_categories` - List all categories

### 3. Testing Tools Server
Provides testing capabilities:
- `run_tests` - Run tests with optional pattern
- `check_coverage` - Generate coverage report
- `lint_code` - Run linter with optional auto-fix
- `validate_types` - TypeScript type validation
- `benchmark` - Run performance benchmarks

### 4. Git Operations Server
Git repository information (read-only):
- `git_status` - Repository status
- `git_log` - Commit history
- `git_diff` - Show differences
- `git_branch` - List branches
- `git_current_branch` - Current branch name
- `git_remote` - List remotes
- `git_stash_list` - List stashes
- `git_worktree_list` - List worktrees

### 5. Hub Server
Coordinates and monitors other servers:
- `list_servers` - List all available servers
- `server_status` - Get specific server status
- `find_tool` - Find which server provides a tool
- `get_metrics` - Hub usage metrics
- `record_request` - Record request for metrics
- `health_check` - Check all servers health

## Installation

```bash
cd perfect-claude-env/mcp-servers
./install-all.sh
```

## Usage

Each server runs on stdio and can be configured in Claude's MCP settings:

```json
{
  "mcpServers": {
    "filesystem": {
      "command": "node",
      "args": ["perfect-claude-env/mcp-servers/filesystem/index.js"]
    },
    "knowledge-base": {
      "command": "node",
      "args": ["perfect-claude-env/mcp-servers/knowledge-base/index.js"]
    },
    "testing-tools": {
      "command": "node",
      "args": ["perfect-claude-env/mcp-servers/testing-tools/index.js"]
    },
    "git-operations": {
      "command": "node",
      "args": ["perfect-claude-env/mcp-servers/git-operations/index.js"]
    },
    "hub": {
      "command": "node",
      "args": ["perfect-claude-env/mcp-servers/hub/index.js"]
    }
  }
}
```

## Architecture

Each server:
- Has single responsibility
- Minimal dependencies
- Clean error handling
- Proper tool schemas
- Runs independently

The hub server provides coordination and monitoring without tight coupling.