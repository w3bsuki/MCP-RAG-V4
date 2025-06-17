# Architecture Decision Record (ADR) Template

## Title: [Short descriptive title]

### Status
[Proposed | Accepted | Rejected | Deprecated | Superseded by ADR-XXX]

### Context
What is the issue we're facing? What forces are at play?

### Decision
What have we decided to do?

### Consequences
What are the positive and negative consequences of this decision?

### Alternatives Considered
What other options did we evaluate?

---

## Example ADR

### Title: Use Git Worktrees for Agent Isolation

### Status
Accepted

### Context
- Multiple agents need to work on the same codebase simultaneously
- Agents were getting stuck due to directory access restrictions
- File conflicts between agents were causing issues

### Decision
Use git worktrees to give each agent their own full copy of the repository on separate branches.

### Consequences
**Positive:**
- Complete isolation between agents
- Full repository access for each agent
- Can run npm install and dev servers independently
- Easy to merge changes back to main

**Negative:**
- Requires more disk space
- Need to sync changes between worktrees
- More complex setup initially

### Alternatives Considered
1. **Shared workspace**: Too many conflicts
2. **Docker containers**: Too complex for agents to manage
3. **Separate clones**: Harder to manage branches and merging