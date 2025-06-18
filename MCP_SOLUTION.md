# MCP Integration Solution

## The Problem

The MCP (Model Context Protocol) stdio-based communication between agents and servers is failing due to:

1. **Protocol Mismatch**: Claude Desktop expects specific stdio handshake that isn't happening
2. **Context Management**: Async contexts are being destroyed before use
3. **Session Scope**: Client sessions go out of scope immediately after creation

## The Solution

### Dual-Mode Servers

Each MCP server now runs in dual mode:
- **STDIO Mode**: For Claude Desktop (not working currently)
- **HTTP Mode**: Direct REST API for agents (working solution)

### Server Architecture

```python
# Each server runs both:
1. MCP stdio server (port stdin/stdout)
2. HTTP API server (ports 8501-8503)
```

### How to Start Servers

```bash
# Start all MCP servers with HTTP APIs
python start_mcp_servers_standalone.py
```

This starts:
- Knowledge Base: http://localhost:8501
- Vector Search: http://localhost:8502  
- Coordination Hub: http://localhost:8503

### How Agents Connect

Agents use the `HTTPMCPClient` in `agents/core/http_mcp_client.py`:

```python
# In agent runtime
self.mcp_client = HTTPMCPClient()

# Use MCP tools
doc_id = await self.mcp_client.store_knowledge("content", metadata)
results = await self.mcp_client.search_knowledge("query")
```

### Testing

```bash
# Test HTTP endpoints
python test_mcp_http.py

# Test agent with MCP
python test_agent_mcp.py
```

## Why Two Folders?

- **mcp-servers/**: Contains the actual MCP server implementations
- **mcp-venv/**: Python virtual environment with MCP SDK installed

This is the correct "SDK-first" design per O3's feedback.

## Key Files Modified

1. `agents/core/agent_runtime.py`: Uses HTTPMCPClient instead of stdio
2. `agents/core/http_mcp_client.py`: HTTP-based MCP client
3. `mcp-servers/*/server.py`: Added HTTP API endpoints
4. `.mcp.json`: Configuration for Claude Desktop (not used by agents)

## Next Steps

1. Start servers with `python start_mcp_servers_standalone.py`
2. Run agents - they'll automatically connect via HTTP
3. MCP tools work through REST API, bypassing stdio issues