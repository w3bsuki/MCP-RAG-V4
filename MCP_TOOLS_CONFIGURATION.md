# 🛠️ MCP TOOLS CONFIGURATION FOR AGENTS

## 🎯 Overview
Enhanced toolset for our agents using FREE MCP servers that don't require API keys.

## 📋 Recommended Tools (All FREE)

### 1. **Web Search (No API Key)** 🔍
```json
{
  "web-search": {
    "command": "npx",
    "args": ["-y", "pskill9/web-search"],
    "description": "Free Google search without API keys"
  }
}
```
**Use Cases:**
- Search documentation
- Find package info
- Debug errors
- Research best practices

### 2. **Puppeteer (Browser Automation)** 🌐
```json
{
  "puppeteer": {
    "command": "npx",
    "args": ["-y", "@modelcontextprotocol/server-puppeteer"],
    "description": "Browser automation, screenshots, testing"
  }
}
```
**Use Cases:**
- Screenshot deployed apps
- Test UI functionality
- Scrape data (like crypto prices)
- Verify deployments

### 3. **Fetch (HTTP Requests)** 🔌
```json
{
  "fetch": {
    "command": "npx",
    "args": ["-y", "@modelcontextprotocol/server-fetch"],
    "description": "Make HTTP requests, test APIs"
  }
}
```
**Use Cases:**
- Test API endpoints
- Fetch JSON data
- Check deployment health
- Validate webhooks

### 4. **Filesystem Enhanced** 📁
```json
{
  "filesystem": {
    "command": "npx",
    "args": ["-y", "@modelcontextprotocol/server-filesystem"],
    "description": "Enhanced file operations"
  }
}
```
**Use Cases:**
- Advanced file searching
- Bulk operations
- Directory analysis

## 🚀 Implementation Steps

### Step 1: Update Agent CLAUDE.md Files

Add to each agent's CLAUDE.md:

```markdown
## 🛠️ AVAILABLE MCP TOOLS

### Core Tools (Already Available):
- File operations (read/write/edit)
- Git commands
- Bash execution
- RAG memory system

### NEW Tools (Now Available):
- **web-search**: Search Google without API keys
- **puppeteer**: Browser automation & screenshots
- **fetch**: HTTP requests & API testing
- **filesystem**: Enhanced file operations

### Tool Usage Examples:
```bash
# Search for documentation
mcp__web-search__search("Next.js 15 app router best practices")

# Take screenshot
mcp__puppeteer__screenshot("http://localhost:3000", "dashboard.png")

# Test API
mcp__fetch__get("https://api.coingecko.com/api/v3/simple/price?ids=bitcoin")
```
```

### Step 2: Configure MCP Servers

Create `.mcp.json` in project root:

```json
{
  "mcpServers": {
    "web-search": {
      "command": "npx",
      "args": ["-y", "pskill9/web-search"]
    },
    "puppeteer": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-puppeteer"]
    },
    "fetch": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-fetch"]
    },
    "filesystem": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-filesystem"]
    }
  }
}
```

### Step 3: Test Tools Work

Quick test commands:
```bash
# Test web search
mcp__web-search__search("Claude AI cryptocurrency predictions tutorial")

# Test fetch
mcp__fetch__get("https://api.github.com/repos/anthropics/claude-code")

# Test puppeteer
mcp__puppeteer__navigate("https://www.coingecko.com")
mcp__puppeteer__screenshot("crypto-prices.png")
```

## 🎯 Impact on Project4

With these tools, agents can now:

1. **Builder** can:
   - Search for Stripe integration examples
   - Test API endpoints directly
   - Screenshot the UI for validation
   - Fetch real crypto prices

2. **Architect** can:
   - Research best practices
   - Find architectural patterns
   - Check latest documentation
   - Verify API designs

3. **Validator** can:
   - Screenshot UI for visual testing
   - Test deployed endpoints
   - Search for security best practices
   - Validate API responses

## 📊 Tool Priority & Usage

### High Priority (Use Often):
- **web-search**: For finding solutions/docs
- **fetch**: For API testing

### Medium Priority (Use When Needed):
- **puppeteer**: For UI verification
- **filesystem**: For complex file ops

### Future Additions (If Needed):
- **github**: Direct GitHub operations
- **sqlite**: Local database
- **playwright**: Alternative to puppeteer

## 🚨 Important Notes

1. **No API Keys Required**: All these tools are FREE
2. **Security**: Tools respect file permissions
3. **Performance**: Tools are lightweight
4. **Compatibility**: Work with all agents

## 🔧 Troubleshooting

If tools don't work:
1. Check `.mcp.json` exists
2. Verify npx is available
3. Test with simple command first
4. Check agent has permissions

---

**These tools will DRAMATICALLY improve agent capabilities without any API key costs!**