# MCP-RAG-V4 System Launcher

## 🚀 Quick Start

Launch the complete MCP-RAG-V4 system with separate Claude Code terminals for each agent:

```bash
# Launch default system (admin, architect, builder agents)
./start_claude_system.sh

# Launch with dashboard monitoring
./start_claude_system.sh --dashboard

# Launch specific agents
./start_claude_system.sh --agents admin architect

# Launch all agents including validator
./start_claude_system.sh --agents admin architect builder validator --dashboard
```

## 🎯 What It Does

The launcher opens separate terminal windows, each running:
- **Claude Code** with `--dangerously-skip-permissions`
- **Individual agent scripts** with full MCP access
- **Proper environment setup** (virtual env, Python path, etc.)

### Agent Terminals

- **Admin Agent**: Task orchestration and coordination
- **Architect Agent**: System design and specifications  
- **Builder Agent**: Code implementation from specs
- **Validator Agent**: Testing and quality assurance
- **Dashboard** (optional): System monitoring

## 📋 Prerequisites

### 1. WSL2 + X11 Setup
```bash
# Install X11 server (VcXsrv, Xming, etc.) on Windows
# Set display in WSL2
export DISPLAY=:0

# Install terminal emulator
sudo apt install gnome-terminal
```

### 2. Claude Code Installation
```bash
# Install Claude Code from GitHub
# https://github.com/anthropics/claude-code
```

### 3. Project Dependencies
```bash
# Virtual environment (already created)
source mcp-venv/bin/activate
pip install mcp

# Verify Claude Code
claude --version
```

## 🎛️ System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    MCP-RAG-V4 System                       │
├─────────────────┬─────────────────┬─────────────────────────┤
│   Admin Agent   │ Architect Agent │    Builder Agent        │
│   (Terminal 1)  │   (Terminal 2)  │    (Terminal 3)         │
│                 │                 │                         │
│ • Task routing  │ • System design │ • Code generation       │
│ • Coordination  │ • Specifications│ • Implementation        │
│ • CLI interface │ • Architecture  │ • Testing               │
└─────────────────┴─────────────────┴─────────────────────────┘
                           │
                    ┌─────────────┐
                    │   Shared    │
                    │ File System │
                    │             │
                    │ • Messages  │
                    │ • Specs     │
                    │ • Builds    │
                    │ • Reports   │
                    └─────────────┘
```

## 📂 Directory Structure

```
MCP-RAG-V4/
├── agents/                    # Agent implementations
│   ├── admin/
│   ├── architect/
│   └── builder/
├── mcp-servers/              # MCP server implementations  
├── shared/                   # Agent communication
│   ├── specifications/       # Architecture specs
│   ├── adrs/                # Architecture decisions
│   ├── builds/              # Generated code
│   └── reports/             # Validation reports
├── logs/                    # System logs
├── .mcp.json               # MCP configuration
├── start_claude_system.sh  # Main launcher (shell)
├── start_system.py         # Advanced launcher (Python)
└── run_agent.sh           # Individual agent runner
```

## 🔧 Configuration

### MCP Servers (`.mcp.json`)
- **filesystem**: Secure file operations
- **knowledge-base**: Pattern storage and retrieval
- **vector-search**: Semantic search with Qdrant
- **coordination-hub**: Inter-agent coordination

### Agent Communication
- **File-based messaging**: `shared/messages.log`
- **Status broadcasting**: Real-time task updates
- **Specification handoffs**: Architect → Builder → Validator

## 💡 Usage Tips

### Starting the System
1. Run the launcher script
2. Wait for terminals to open (2-3 seconds between each)
3. Each terminal loads Claude Code with the agent script
4. Agents automatically connect to MCP servers

### Workflow Example
1. **Admin Agent**: Submit task via interactive CLI
2. **Architect Agent**: Creates system specification
3. **Builder Agent**: Implements code from specification  
4. **Validator Agent**: Tests and validates implementation
5. **Admin Agent**: Reports completion

### Monitoring
- **Terminal Windows**: Watch each agent's activity
- **Shared Directory**: Check files being created/modified
- **Logs Directory**: Detailed debugging information
- **Dashboard** (optional): Web-based system overview

## 🐛 Troubleshooting

### Terminals Don't Open
```bash
# Check X11 forwarding
echo $DISPLAY
# Should show :0 or similar

# Install terminal emulator
sudo apt install gnome-terminal

# Test terminal manually
gnome-terminal -- echo "test"
```

### Claude Code Issues
```bash
# Verify installation
claude --version

# Check permissions
claude --help

# Test with simple file
claude --dangerously-skip-permissions simple_script.py
```

### Agent Communication Issues
```bash
# Check shared directory
ls -la shared/

# Check message log
tail -f shared/messages.log

# Check agent logs
tail -f logs/*.log
```

### MCP Server Issues
```bash
# Test MCP client
source mcp-venv/bin/activate
python test_simple_mcp_integration.py

# Check server availability
python -c "from agents.core.simple_mcp_client import SimpleMCPClient; import asyncio; asyncio.run(SimpleMCPClient().test_server_availability('knowledge-base'))"
```

## 🔄 Restarting Components

### Restart Individual Agent
- Close the agent's terminal (Ctrl+C)
- Run: `./run_agent.sh <agent_type>`

### Restart Entire System
- Close all terminals
- Run: `./start_claude_system.sh`

### Clean Restart
```bash
# Clear shared state
rm -rf shared/messages.log shared/checkpoint-*

# Restart system
./start_claude_system.sh
```

## 📞 Support

For issues:
1. Check the troubleshooting section above
2. Review logs in the `logs/` directory
3. Test individual components with provided test scripts
4. Verify all prerequisites are met

The system is designed to be robust and self-healing, with agents automatically reconnecting to MCP servers and resuming work from shared state.