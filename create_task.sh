#!/bin/bash
# Create a new task for the agents

echo "📝 Creating New Task"
echo "==================="
echo ""

# Get task details
read -p "Task Title: " TITLE
read -p "Task Description: " DESC
read -p "Priority (low/medium/high): " PRIORITY
read -p "Type (design/implementation/validation): " TYPE

# Default values
PRIORITY=${PRIORITY:-medium}
TYPE=${TYPE:-design}

# Generate task ID
TASK_ID="task-$(date +%s)"

# Determine assigned agent based on type
case $TYPE in
    design)
        AGENT="architect"
        ;;
    implementation)
        AGENT="builder"
        ;;
    validation)
        AGENT="validator"
        ;;
    *)
        AGENT="architect"
        ;;
esac

# Create task JSON
TASK_JSON=$(cat << EOF
{
  "id": "$TASK_ID",
  "title": "$TITLE",
  "description": "$DESC",
  "type": "$TYPE",
  "priority": "$PRIORITY",
  "assigned_to": "$AGENT",
  "status": "pending",
  "created_at": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "progress": 0
}
EOF
)

# Add task to shared/tasks.json
if [ -f shared/tasks.json ]; then
    # Read existing tasks
    EXISTING=$(cat shared/tasks.json)
    
    # Add new task using Python
    python3 -c "
import json
existing = json.loads('$EXISTING')
new_task = json.loads('$TASK_JSON')
existing['tasks'].append(new_task)
print(json.dumps(existing, indent=2))
" > shared/tasks.json.tmp
    
    mv shared/tasks.json.tmp shared/tasks.json
    
    echo ""
    echo "✅ Task created successfully!"
    echo ""
    echo "Task Details:"
    echo "  ID:        $TASK_ID"
    echo "  Title:     $TITLE"
    echo "  Assigned:  $AGENT"
    echo "  Priority:  $PRIORITY"
    echo ""
    echo "The $AGENT agent will pick up this task automatically!"
else
    echo "❌ Error: shared/tasks.json not found. Run ./start_all.sh first!"
fi