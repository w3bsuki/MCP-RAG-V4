#!/usr/bin/env python3
"""
Test Agent with MCP Integration
"""
import asyncio
import logging
import sys
sys.path.append('.')

from agents.core.agent_runtime import AgentRuntime, Message, MessageIntent

class TestAgent(AgentRuntime):
    """Test agent that uses MCP tools"""
    
    async def initialize(self):
        """Initialize test agent"""
        self.logger.info("Test agent initialized")
        
        # Test MCP access
        if self.mcp_client:
            self.logger.info("MCP client available")
            
            # Test storing knowledge
            try:
                doc_id = await self.mcp_client.store_knowledge(
                    "Agent test knowledge",
                    {"agent": "test", "type": "validation"}
                )
                self.logger.info(f"Stored test knowledge: {doc_id}")
            except Exception as e:
                self.logger.error(f"Failed to store knowledge: {e}")
    
    async def cleanup(self):
        """Cleanup test agent"""
        self.logger.info("Test agent cleanup")
    
    async def on_idle(self):
        """Periodic idle task"""
        pass
    
    async def handle_request(self, message: Message):
        """Handle test requests"""
        self.logger.info(f"Handling request: {message.payload}")
        
        # Use MCP to search knowledge
        if self.mcp_client:
            try:
                results = await self.mcp_client.search_knowledge(
                    message.payload.get("query", "test")
                )
                self.logger.info(f"Search returned {len(results)} results")
            except Exception as e:
                self.logger.error(f"Search failed: {e}")

async def main():
    """Run test agent"""
    logging.basicConfig(level=logging.INFO)
    
    config = {
        "enable_mcp": True,
        "enable_redis": False,
        "shared_dir": "./shared"
    }
    
    agent = TestAgent("test-001", "test", config)
    
    # Start agent
    await agent.initialize()
    
    # Test MCP functionality
    print("\nTesting MCP client...")
    if agent.mcp_client:
        print("✓ MCP client initialized")
        
        # Test health checks
        for server in ["knowledge-base", "vector-search", "coordination-hub"]:
            healthy = await agent.mcp_client.health_check(server)
            print(f"  {server}: {'✓' if healthy else '✗'}")
    else:
        print("✗ No MCP client")
    
    await agent.cleanup()

if __name__ == "__main__":
    asyncio.run(main())