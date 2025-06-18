#!/bin/bash
set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info() { echo -e "${BLUE}ℹ️  $1${NC}"; }
log_success() { echo -e "${GREEN}✅ $1${NC}"; }
log_warning() { echo -e "${YELLOW}⚠️  $1${NC}"; }
log_error() { echo -e "${RED}❌ $1${NC}"; }

echo "🧹 Cleaning MCP-RAG-V4 Worktrees"
echo "================================="
echo ""

WORKTREE_DIR=".worktrees"

if [[ ! -d "$WORKTREE_DIR" ]]; then
    log_warning "Worktrees directory $WORKTREE_DIR does not exist"
    exit 0
fi

log_warning "This will delete ALL content in the following directories:"
echo ""
for dir in "$WORKTREE_DIR"/*; do
    if [[ -d "$dir" ]]; then
        echo "  • $(basename "$dir")"
        if [[ -n "$(ls -A "$dir" 2>/dev/null || true)" ]]; then
            echo "    $(ls -A "$dir" | wc -l) items found"
        else
            echo "    (empty)"
        fi
    fi
done

echo ""
echo "⚠️  WARNING: This action cannot be undone!"
echo ""
read -p "Are you absolutely sure you want to proceed? (type 'DELETE' to confirm): " confirmation

if [[ "$confirmation" != "DELETE" ]]; then
    log_info "Operation cancelled"
    exit 0
fi

echo ""
log_info "Starting cleanup..."

# Clean each worktree directory
CLEANED=0
FAILED=0

for agent_dir in "$WORKTREE_DIR"/*; do
    if [[ -d "$agent_dir" ]]; then
        agent_name=$(basename "$agent_dir")
        log_info "Cleaning $agent_name worktree..."
        
        # Remove all contents but keep the directory
        if rm -rf "$agent_dir"/* "$agent_dir"/.[^.]* "$agent_dir"/..?* 2>/dev/null; then
            # Recreate the README
            cat > "$agent_dir/README.md" << EOF
# ${agent_name^} Agent Workspace

This workspace has been cleaned and reset.

## Getting Started
1. Check active tasks: \`cat ../../coordination/ACTIVE_TASKS.json\`
2. Read agent documentation in the main README files
3. Begin work on assigned tasks

## Status
- Workspace: Clean
- Last reset: $(date)
- Ready for: New tasks
EOF
            
            log_success "$agent_name worktree cleaned"
            CLEANED=$((CLEANED + 1))
        else
            log_error "Failed to clean $agent_name worktree"
            FAILED=$((FAILED + 1))
        fi
    fi
done

# Reset coordination tasks
log_info "Resetting coordination system..."

if [[ -f "coordination/ACTIVE_TASKS.json" ]]; then
    # Backup current tasks
    cp "coordination/ACTIVE_TASKS.json" "coordination/ACTIVE_TASKS.backup.$(date +%Y%m%d-%H%M%S).json"
    log_success "Backed up current tasks"
    
    # Reset to clean state
    cat > "coordination/ACTIVE_TASKS.json" << 'EOF'
{
  "version": "1.0.0",
  "lastUpdated": "TIMESTAMP_PLACEHOLDER",
  "system": {
    "status": "reset",
    "activeAgents": [],
    "systemHealth": "green"
  },
  "tasks": [
    {
      "id": "reset-001",
      "title": "System Reset - Ready for New Tasks",
      "description": "Worktrees have been cleaned and system is ready for new task assignments",
      "assignedTo": "unassigned",
      "status": "completed",
      "priority": "low",
      "created": "TIMESTAMP_PLACEHOLDER",
      "updated": "TIMESTAMP_PLACEHOLDER",
      "estimatedHours": 0,
      "dependencies": [],
      "subtasks": [],
      "tags": ["system", "reset", "cleanup"],
      "branch": "main"
    }
  ],
  "agents": {
    "architect": {
      "role": "System Designer & Architect",
      "workingDirectory": "./.worktrees/architect-branch",
      "lastActive": null,
      "currentTask": null
    },
    "builder": {
      "role": "Implementation Specialist & Code Developer",
      "workingDirectory": "./.worktrees/builder-branch",
      "lastActive": null,
      "currentTask": null
    },
    "validator": {
      "role": "Quality Assurance & Validation Specialist",
      "workingDirectory": "./.worktrees/validator-branch",
      "lastActive": null,
      "currentTask": null
    }
  }
}
EOF
    
    # Replace timestamp placeholders
    current_timestamp=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
    sed -i "s/TIMESTAMP_PLACEHOLDER/$current_timestamp/g" "coordination/ACTIVE_TASKS.json"
    
    log_success "Reset coordination system"
fi

# Clean shared directories but keep structure
log_info "Cleaning shared directories..."

SHARED_DIRS=("shared/specifications" "shared/artifacts" "shared/validation-reports" "shared/communication")

for dir in "${SHARED_DIRS[@]}"; do
    if [[ -d "$dir" ]]; then
        rm -rf "$dir"/*
        echo "# $(basename "$dir" | tr '[:lower:]' '[:upper:]')" > "$dir/.gitkeep"
        echo "" >> "$dir/.gitkeep"
        echo "This directory is ready for new $(basename "$dir")." >> "$dir/.gitkeep"
        echo "Last cleaned: $(date)" >> "$dir/.gitkeep"
    fi
done

log_success "Shared directories cleaned"

echo ""
log_success "Cleanup completed!"
echo ""
echo "📊 Summary:"
echo "  • Worktrees cleaned: $CLEANED"
echo "  • Failed cleanups: $FAILED"
echo "  • Coordination system: Reset"
echo "  • Shared directories: Cleaned"
echo ""
echo "🚀 Next steps:"
echo "  1. Review system status: make status"
echo "  2. Assign new tasks in coordination/ACTIVE_TASKS.json"
echo "  3. Start working with clean agent workspaces"
echo ""