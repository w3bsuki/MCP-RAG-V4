#!/usr/bin/env python3
"""
Test MCP Integration
Verifies that agents can communicate with MCP servers
"""
import asyncio
import logging
import sys
import json
from pathlib import Path

# Add project to path
sys.path.append('/home/w3bsuki/MCP-RAG-V4')

from agents.core.mcp_client import MCPClient
from agents.architect.architect_agent import ArchitectAgent
from agents.admin.admin_agent import AdminAgent


async def test_mcp_client():
    """Test basic MCP client functionality"""
    print("=== Testing MCP Client ===")
    
    # Initialize MCP client
    client = MCPClient('/home/w3bsuki/MCP-RAG-V4/.mcp.json')
    
    # Test server connections
    servers_to_test = ['filesystem', 'knowledge-base', 'coordination-hub']
    
    for server in servers_to_test:
        print(f"\nTesting {server} server...")
        try:
            success = await client.connect_server(server)
            if success:
                print(f"✓ Connected to {server}")
                
                # List tools
                tools = await client.list_tools(server)
                print(f"  Available tools: {[tool.get('name', 'unknown') for tool in tools]}")
                
            else:
                print(f"✗ Failed to connect to {server}")
                
        except Exception as e:
            print(f"✗ Error connecting to {server}: {e}")
    
    # Test basic operations
    try:
        # Test filesystem operations
        print(f"\nTesting filesystem operations...")
        files = await client.list_directory('/home/w3bsuki/MCP-RAG-V4')
        print(f"✓ Listed {len(files)} files in project directory")
        
    except Exception as e:
        print(f"✗ Filesystem test failed: {e}")
    
    try:
        # Test knowledge base operations
        print(f"\nTesting knowledge base operations...")
        # Store some test knowledge
        await client.store_knowledge(
            "Test architectural pattern for microservices",
            metadata={"type": "test", "pattern": "microservice"}
        )
        print("✓ Stored test knowledge")
        
        # Search for it
        results = await client.search_knowledge("microservice pattern")
        print(f"✓ Found {len(results)} knowledge items")
        
    except Exception as e:
        print(f"✗ Knowledge base test failed: {e}")
    
    # Cleanup
    await client.disconnect_all()
    print("\n✓ MCP client test completed")


async def test_agent_mcp_integration():
    """Test agent integration with MCP"""
    print("\n=== Testing Agent MCP Integration ===")
    
    # Configure logging
    logging.basicConfig(level=logging.INFO)
    
    # Test with architect agent
    config = {
        'shared_dir': '/home/w3bsuki/MCP-RAG-V4/shared',
        'enable_mcp': True,
        'mcp_config': '/home/w3bsuki/MCP-RAG-V4/.mcp.json',
        'enable_redis': False
    }
    
    agent = ArchitectAgent('test-architect', config)
    
    try:
        # Initialize agent (this should set up MCP client)
        await agent.initialize()
        
        if agent.mcp_client:
            print("✓ Agent successfully initialized MCP client")
            
            # Test MCP operations through agent
            servers = agent.mcp_client.get_connected_servers()
            print(f"✓ Agent connected to servers: {servers}")
            
        else:
            print("✗ Agent failed to initialize MCP client")
            
    except Exception as e:
        print(f"✗ Agent MCP integration test failed: {e}")
    
    finally:
        await agent.cleanup()


async def test_full_workflow():
    """Test full agent workflow with MCP"""
    print("\n=== Testing Full Workflow ===")
    
    # Ensure shared directory exists
    shared_dir = Path('/home/w3bsuki/MCP-RAG-V4/shared')
    shared_dir.mkdir(exist_ok=True)
    
    config = {
        'shared_dir': str(shared_dir),
        'enable_mcp': True,
        'mcp_config': '/home/w3bsuki/MCP-RAG-V4/.mcp.json',
        'enable_redis': False
    }
    
    # Create admin agent
    admin = AdminAgent('test-admin', config)
    architect = ArchitectAgent('test-architect', config)
    
    try:
        # Initialize both agents
        print("Initializing agents...")
        await admin.initialize()
        await architect.initialize()
        
        # Test admin agent MCP access
        if admin.mcp_client:
            print("✓ Admin agent has MCP access")
        else:
            print("✗ Admin agent missing MCP access")
            
        # Test architect agent MCP access  
        if architect.mcp_client:
            print("✓ Architect agent has MCP access")
            
            # Test knowledge base integration
            try:
                await architect.mcp_client.store_knowledge(
                    "Test specification pattern for REST API",
                    metadata={"type": "specification", "api_type": "REST"}
                )
                print("✓ Architect can store knowledge")
                
                results = await architect.mcp_client.search_knowledge("REST API")
                print(f"✓ Architect found {len(results)} related patterns")
                
            except Exception as e:
                print(f"✗ Architect knowledge operations failed: {e}")
        else:
            print("✗ Architect agent missing MCP access")
            
    except Exception as e:
        print(f"✗ Full workflow test failed: {e}")
        
    finally:
        await admin.cleanup()
        await architect.cleanup()
    
    print("✓ Full workflow test completed")


async def main():
    """Run all tests"""
    print("🔧 MCP-RAG-V4 Integration Test Suite")
    print("=====================================")
    
    try:
        # Test 1: Basic MCP client
        await test_mcp_client()
        
        # Test 2: Agent MCP integration
        await test_agent_mcp_integration()
        
        # Test 3: Full workflow
        await test_full_workflow()
        
        print("\n🎉 All tests completed!")
        
    except Exception as e:
        print(f"\n💥 Test suite failed: {e}")
        import traceback
        traceback.print_exc()


if __name__ == "__main__":
    asyncio.run(main())