# Popular MCP Servers for Multi-Agent Systems

## Official MCP Servers Repository
**Repository**: [modelcontextprotocol/servers](https://github.com/modelcontextprotocol/servers)
- **Description**: Official reference implementations demonstrating MCP features
- **Key Servers**:
  - Everything - Reference server with prompts, resources, and tools
  - Fetch - Web content fetching and conversion
  - Filesystem - Secure file operations with access controls

## 1. Context7 MCP Server
**Repository**: [upstash/context7](https://github.com/upstash/context7)
- **Purpose**: Provides up-to-date code documentation for LLMs and AI code editors
- **Features**:
  - Real-time documentation access
  - Version-specific code examples
  - No hallucinations from outdated APIs
- **Use Case**: Essential for agents needing current library documentation

## 2. Task Management MCP Servers

### Task Manager MCP
**Repository**: [tradesdontlie/task-manager-mcp](https://github.com/tradesdontlie/task-manager-mcp)
- **Features**:
  - Project organization
  - Task tracking with subtasks
  - PRD parsing into actionable tasks
  - Task complexity estimation

### MCP Task Manager Server
**Repository**: [bsmi021/mcp-task-manager-server](https://github.com/bsmi021/mcp-task-manager-server)
- **Features**:
  - SQLite persistence
  - Project-based task organization
  - Status tracking
  - Subtask expansion

### Task Master (Todoist Integration)
**Repository**: [mingolladaniele/taskMaster-todoist-mcp](https://github.com/mingolladaniele/taskMaster-todoist-mcp)
- **Features**: Natural language Todoist integration

## 3. Git Operations MCP Servers

### Git MCP
**Description**: Allows LLM to interact with local git repositories
- **Features**:
  - Repository interaction
  - Optional push support
  - Branch management

### GitMCP
**Website**: gitmcp.io
- **Features**:
  - Connect to ANY GitHub repository
  - Project documentation access
  - Remote repository operations

## 4. Testing & Validation Tools

### MCP Inspector
**Repository**: [modelcontextprotocol/inspector](https://github.com/modelcontextprotocol/inspector)
- **Purpose**: Visual testing tool for MCP servers
- **Features**:
  - Interactive debugging interface
  - Protocol bridge (stdio, SSE, HTTP)
  - Export server launch configurations

## 5. Database & Storage MCP Servers

### Vector Search Servers
- **Qdrant MCP**: Vector search engine integration
- **Chroma MCP**: Embeddings, vector search, document storage

### Traditional Databases
- PostgreSQL MCP
- MySQL MCP
- MongoDB MCP
- Snowflake MCP

## 6. Communication & Messaging

### AWS Messaging Services
- **Amazon SNS/SQS MCP**: Event-driven messaging and queue management
- **Amazon MQ MCP**: Message broker for RabbitMQ and ActiveMQ

### RabbitMQ MCP
- **Features**:
  - Admin operations
  - Message enqueue/dequeue
  - Queue management

## 7. Development Tool Integrations

### IDE & Editor Support
- VS Code MCP integration
- Zed MCP support
- Cursor compatibility
- Windsurf integration

### API & Service Integrations
- **Perplexity MCP**: Real-time web research via Sonar API
- **Kagi Search MCP**: Web search using Kagi's API
- **Google Admin MCP**: Google Admin API interaction
- **Gmail MCP**: Gmail integration with auto-auth

## 8. Project Management Platform Integrations

### Popular Platforms
- **Jira MCP**: Issue creation, modification, querying
- **Asana MCP**: Task automation and project tracking
- **Linear MCP**: Automated workflow management
- **Trello MCP**: Board interactions via REST API

## 9. Specialized MCP Servers

### GDB MCP
- **Purpose**: Remote application debugging
- **Features**: GDB/MI protocol support for AI-assisted debugging

### Puppeteer MCP
- **Purpose**: Browser automation
- **Features**: Web scraping, testing, automation

## 10. Curated MCP Server Collections

### Awesome MCP Servers
Multiple curated lists exist:
- [wong2/awesome-mcp-servers](https://github.com/wong2/awesome-mcp-servers)
- [punkpeye/awesome-mcp-servers](https://github.com/punkpeye/awesome-mcp-servers)
- [appcypher/awesome-mcp-servers](https://github.com/appcypher/awesome-mcp-servers)
- [TensorBlock/awesome-mcp-servers](https://github.com/TensorBlock/awesome-mcp-servers)

## Implementation Languages

MCP servers support multiple SDKs:
- TypeScript/JavaScript (most common)
- Python
- C# (with Microsoft)
- Java (with Spring AI)
- Ruby (with Shopify)
- Swift
- Rust

## Recommendations for Multi-Agent Systems

For your multi-agent system, consider integrating:

1. **Task Management**: Use task-manager-mcp for agent task coordination
2. **Documentation**: Context7 for up-to-date library docs
3. **Version Control**: Git MCP for code management
4. **Testing**: MCP Inspector for debugging
5. **Communication**: RabbitMQ or AWS SNS/SQS for agent messaging
6. **Storage**: Qdrant for vector search (already implemented)
7. **Validation**: Custom validation servers following MCP protocol

## Getting Started

Most servers can be installed via:
```bash
# NPM
npm install @package/mcp-server

# Or via npx
npx -y @package/mcp-server
```

Configure in `.mcp.json` following your existing pattern.