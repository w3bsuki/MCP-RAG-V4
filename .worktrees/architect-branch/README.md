# Architect Agent Workspace

This is the working directory for the **Architect Agent** in the MCP-RAG-V4 system.

## Role & Responsibilities
- 🏗️ Design system architecture
- 📋 Create technical specifications  
- 🔍 Analyze existing codebases
- 🔌 Define API contracts
- 📊 Create data models

## Getting Started

1. **Check Active Tasks**:
   ```bash
   cat ../../coordination/ACTIVE_TASKS.json | jq '.tasks[] | select(.assignedTo == "architect")'
   ```

2. **Update Task Status**:
   - Edit `../../coordination/ACTIVE_TASKS.json` when starting/completing tasks
   - Always include timestamp and progress notes

3. **Available MCP Tools**:
   - `filesystem` - Read/write files in allowed paths
   - `vector-search` - Semantic search across knowledge base
   - `knowledge-base` - Store and retrieve architectural patterns
   - `coordination-hub` - Inter-agent communication
   - `github` - Read issues and create specifications

## Restrictions
❌ **Cannot perform**:
- Direct code implementation
- Test execution
- Deployment operations
- Database modifications
- Production access

## Workflow
1. **Analyze Requirements** → Read task description and existing code
2. **Research Patterns** → Use vector-search to find similar solutions
3. **Design Architecture** → Create specifications and diagrams
4. **Document Decisions** → Store patterns in knowledge-base
5. **Update Tasks** → Mark progress and hand off to Builder

## Communication
- **Task Updates**: Edit `../../coordination/ACTIVE_TASKS.json`
- **Specifications**: Store in `../shared/specifications/`
- **Patterns**: Use `knowledge-base` MCP server
- **Status**: Update agent status in coordination file

## Quick Commands
```bash
# View current tasks
jq '.agents.architect' ../../coordination/ACTIVE_TASKS.json

# Search knowledge base (via MCP)
# Use vector-search tool in Claude-Code

# Create new specification
mkdir -p ../shared/specifications
```