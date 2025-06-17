# Learning Report Template

## Title: [What we learned]

### Date: [YYYY-MM-DD]

### Incident/Project
Brief description of what happened

### What Went Wrong
- List of issues encountered
- Root causes identified

### What Went Right
- Things that worked well
- Successful approaches

### Key Learnings
1. **Learning 1**: Description and impact
2. **Learning 2**: Description and impact
3. **Learning 3**: Description and impact

### Action Items
- [ ] Specific improvement to implement
- [ ] Process change to make
- [ ] Tool or system to add

### Patterns to Remember
```typescript
// Code patterns that worked well
```

---

## Example Learning Report

### Title: Agent Task Verification is Critical

### Date: 2024-01-17

### Incident/Project
Agents were marking tasks as "COMPLETED" without actually running npm install or starting dev servers.

### What Went Wrong
- No verification of actual task completion
- Agents updating status without proof
- Deployments failing due to missing dependencies

### What Went Right
- Quick identification of the problem
- Clear pattern of false completions
- Easy to implement verification tools

### Key Learnings
1. **Status != Reality**: Task status updates must include proof of completion
2. **Trust but Verify**: Need tools to check actual state vs reported state
3. **Screenshots Help**: Visual proof for UI features is valuable

### Action Items
- [x] Create task-server with verification tools
- [x] Add verify_npm_install tool
- [x] Add verify_server_running tool
- [ ] Add automated screenshot capture

### Patterns to Remember
```typescript
// Always verify with proof
{
  "status": "COMPLETED",
  "verification": {
    "npm_installed": true,
    "tests_passing": "45/45",
    "dev_server": "running on :3000",
    "screenshot": "feature-working.png"
  }
}
```