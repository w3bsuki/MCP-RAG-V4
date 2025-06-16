#!/bin/bash

# Monitor builder branch for TASK-202 completion
echo "Starting builder monitoring for TASK-202..."

while true; do
    # Fetch latest changes
    git fetch origin agent-builder-1750106374 2>/dev/null
    
    # Check for TASK-202 related commits
    TASK_COMMITS=$(git log origin/agent-builder-1750106374 --grep="TASK-202" --oneline 2>/dev/null)
    
    if [ ! -z "$TASK_COMMITS" ]; then
        echo "✅ Found TASK-202 commits:"
        echo "$TASK_COMMITS"
        echo "Starting validation process..."
        break
    fi
    
    # Check for file changes in builder branch
    CHANGED_FILES=$(git diff --name-only HEAD origin/agent-builder-1750106374 2>/dev/null)
    
    if [ ! -z "$CHANGED_FILES" ]; then
        echo "📝 Builder has made changes:"
        echo "$CHANGED_FILES" | head -10
    fi
    
    echo "⏳ No TASK-202 completion found. Checking again in 60 seconds..."
    echo "   Current time: $(date)"
    echo "   ---"
    
    sleep 60
done

echo "🎯 TASK-202 detected! Ready to begin testing."