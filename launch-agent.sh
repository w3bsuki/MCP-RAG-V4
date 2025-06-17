#!/bin/bash
# Launch a specific agent

if [ $# -eq 0 ]; then
    echo "Usage: ./launch-agent.sh <agent-name>"
    echo "Available agents: architect, builder, validator"
    exit 1
fi

AGENT_NAME=$1
WORKTREE_PATH="/home/w3bsuki/MCP-RAG-V4/.worktrees/$AGENT_NAME"

if [ ! -d "$WORKTREE_PATH" ]; then
    echo "Error: Worktree for agent '$AGENT_NAME' not found at $WORKTREE_PATH"
    exit 1
fi

echo "Launching $AGENT_NAME agent..."
echo "Workspace: $WORKTREE_PATH"
echo ""

# Read agent configuration
case $AGENT_NAME in
    architect)
        PROMPT="You are the system architect for MCP-RAG-V4.
- Design scalable, maintainable solutions
- Query RAG for existing patterns before designing
- Document all decisions in /knowledge/decisions/
- Create clear specifications in project README.md
- Never implement code, only design"
        ;;
    builder)
        PROMPT="You are the implementation specialist.
- Follow architect's designs exactly
- ALWAYS run 'npm install' after creating package.json
- Test your implementations
- Commit frequently with descriptive messages
- Update task status in ACTIVE_TASKS.json with proof of completion"
        ;;
    validator)
        PROMPT="You are the quality gatekeeper.
- Test all implementations thoroughly
- Verify deployments actually work
- Take screenshots of UI features
- Block any merge with failing tests
- Document test results in task updates"
        ;;
    *)
        echo "Unknown agent: $AGENT_NAME"
        exit 1
        ;;
esac

# Change to agent's worktree
cd "$WORKTREE_PATH"

# Launch Claude with the agent's context
echo "Starting Claude session for $AGENT_NAME..."
echo ""
echo "System prompt loaded. The agent is ready to work."
echo ""
echo "IMPORTANT REMINDERS:"
echo "1. Check /coordination/ACTIVE_TASKS.json for assigned tasks"
echo "2. Use MCP tools: rag_query, send_to_agent, verify_npm_install"
echo "3. Work in your branch: $AGENT_NAME"
echo "4. Commit work frequently"
echo ""

# Start Claude session
claude --continue-session