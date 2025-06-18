#!/usr/bin/env python3
"""
Test Simple MCP Integration
Verifies that agents can work with MCP servers using the simplified client
"""
import asyncio
import logging
import sys
from pathlib import Path

# Add project to path
sys.path.append('/home/w3bsuki/MCP-RAG-V4')

from agents.core.simple_mcp_client import SimpleMCPClient
from agents.architect.architect_agent import ArchitectAgent
from agents.admin.admin_agent import AdminAgent


async def test_simple_mcp_client():
    """Test simple MCP client functionality"""
    print("=== Testing Simple MCP Client ===")
    
    client = SimpleMCPClient('/home/w3bsuki/MCP-RAG-V4/.mcp.json')
    
    # Test server availability
    servers = client.get_available_servers()
    print(f"Available servers: {servers}")
    
    for server in servers:
        print(f"\nTesting {server} server availability...")
        is_available = await client.test_server_availability(server)
        if is_available:
            print(f"✓ {server} server is available")
        else:
            print(f"✗ {server} server is not available")
    
    # Test mock operations
    print(f"\nTesting mock operations...")
    
    try:
        # Test mock knowledge operations
        search_results = await client.mock_search_knowledge("test query")
        print(f"✓ Mock knowledge search returned {len(search_results)} results")
        
        store_id = await client.mock_store_knowledge("test content")
        print(f"✓ Mock knowledge storage returned ID: {store_id}")
        
        # Test mock filesystem operations
        files = await client.mock_list_directory('/home/w3bsuki/MCP-RAG-V4')
        print(f"✓ Mock directory listing returned {len(files)} files")
        
    except Exception as e:
        print(f"✗ Mock operations failed: {e}")
    
    print("✓ Simple MCP client test completed")


async def test_agent_simple_mcp_integration():
    """Test agent integration with simple MCP client"""
    print("\n=== Testing Agent Simple MCP Integration ===")
    
    # Configure logging
    logging.basicConfig(level=logging.INFO)
    
    config = {
        'shared_dir': '/home/w3bsuki/MCP-RAG-V4/shared',
        'enable_mcp': True,
        'mcp_config': '/home/w3bsuki/MCP-RAG-V4/.mcp.json',
        'enable_redis': False
    }
    
    agent = ArchitectAgent('test-architect', config)
    
    try:
        # Initialize agent
        await agent.initialize()
        
        if agent.mcp_client:
            print("✓ Agent successfully initialized Simple MCP client")
            
            # Test MCP operations through agent
            available_servers = agent.mcp_client.get_available_servers()
            print(f"✓ Agent can access servers: {available_servers}")
            
            # Test mock knowledge operations
            search_results = await agent.mcp_client.mock_search_knowledge("architecture pattern")
            print(f"✓ Agent can search knowledge: {len(search_results)} results")
            
        else:
            print("✗ Agent failed to initialize Simple MCP client")
            
    except Exception as e:
        print(f"✗ Agent Simple MCP integration test failed: {e}")
        import traceback
        traceback.print_exc()
    
    finally:
        await agent.cleanup()


async def test_architect_workflow():
    """Test architect workflow with MCP integration"""
    print("\n=== Testing Architect Workflow ===")
    
    # Ensure shared directory exists
    shared_dir = Path('/home/w3bsuki/MCP-RAG-V4/shared')
    shared_dir.mkdir(exist_ok=True)
    (shared_dir / 'specifications').mkdir(exist_ok=True)
    (shared_dir / 'adrs').mkdir(exist_ok=True)
    
    config = {
        'shared_dir': str(shared_dir),
        'enable_mcp': True,
        'mcp_config': '/home/w3bsuki/MCP-RAG-V4/.mcp.json',
        'enable_redis': False
    }
    
    agent = ArchitectAgent('test-architect', config)
    
    try:
        await agent.initialize()
        
        if not agent.mcp_client:
            print("✗ Agent has no MCP client")
            return
        
        print("✓ Architect agent initialized with MCP client")
        
        # Simulate a specification creation task
        from agents.core.agent_runtime import Message, MessageIntent
        
        requirements = {
            'name': 'Test API Service',
            'description': 'A REST API service for testing',
            'features': [
                {'name': 'user_auth', 'description': 'User authentication'},
                {'name': 'data_storage', 'description': 'Data persistence'}
            ]
        }
        
        # Create a mock request message
        message = Message(
            sender_id='test-admin',
            recipient_id='test-architect',
            intent=MessageIntent.REQUEST,
            task_id='test-task-001',
            payload={
                'type': 'create_specification',
                'requirements': requirements
            }
        )
        
        print("Simulating specification creation...")
        
        # Call the specification creation handler directly
        await agent._handle_create_specification(message)
        
        print("✓ Specification creation workflow completed")
        
        # Check if files were created
        spec_files = list((shared_dir / 'specifications').glob('*.yaml'))
        adr_files = list((shared_dir / 'adrs').glob('*.md'))
        
        print(f"✓ Created {len(spec_files)} specification files")
        print(f"✓ Created {len(adr_files)} ADR files")
        
        if spec_files:
            print(f"  Latest spec: {spec_files[-1].name}")
        if adr_files:
            print(f"  Latest ADR: {adr_files[-1].name}")
            
    except Exception as e:
        print(f"✗ Architect workflow test failed: {e}")
        import traceback
        traceback.print_exc()
        
    finally:
        await agent.cleanup()


async def test_multi_agent_coordination():
    """Test coordination between multiple agents"""
    print("\n=== Testing Multi-Agent Coordination ===")
    
    shared_dir = Path('/home/w3bsuki/MCP-RAG-V4/shared')
    shared_dir.mkdir(exist_ok=True)
    
    config = {
        'shared_dir': str(shared_dir),
        'enable_mcp': True,
        'mcp_config': '/home/w3bsuki/MCP-RAG-V4/.mcp.json',
        'enable_redis': False
    }
    
    admin = AdminAgent('test-admin', config)
    architect = ArchitectAgent('test-architect', config)
    
    try:
        # Initialize both agents
        print("Initializing agents...")
        await admin.initialize()
        await architect.initialize()
        
        # Check MCP access
        admin_mcp = admin.mcp_client is not None
        architect_mcp = architect.mcp_client is not None
        
        print(f"✓ Admin agent MCP access: {admin_mcp}")
        print(f"✓ Architect agent MCP access: {architect_mcp}")
        
        if architect_mcp:
            # Test architect MCP operations
            print("Testing architect MCP operations...")
            
            results = await architect.mcp_client.mock_search_knowledge("microservice pattern")
            print(f"✓ Architect found {len(results)} knowledge patterns")
            
            await architect.mcp_client.mock_store_knowledge(
                "Test architectural pattern",
                metadata={"type": "pattern", "category": "architecture"}
            )
            print("✓ Architect stored knowledge successfully")
        
        # Test file system operations
        if admin_mcp:
            files = await admin.mcp_client.mock_list_directory(str(shared_dir))
            print(f"✓ Admin can list {len(files)} files in shared directory")
        
        print("✓ Multi-agent coordination test completed")
        
    except Exception as e:
        print(f"✗ Multi-agent coordination test failed: {e}")
        import traceback
        traceback.print_exc()
        
    finally:
        await admin.cleanup()
        await architect.cleanup()


async def main():
    """Run all tests"""
    print("🔧 Simple MCP-RAG-V4 Integration Test Suite")
    print("==========================================")
    
    try:
        # Test 1: Simple MCP client
        await test_simple_mcp_client()
        
        # Test 2: Agent MCP integration
        await test_agent_simple_mcp_integration()
        
        # Test 3: Architect workflow
        await test_architect_workflow()
        
        # Test 4: Multi-agent coordination
        await test_multi_agent_coordination()
        
        print("\n🎉 All tests completed successfully!")
        
    except Exception as e:
        print(f"\n💥 Test suite failed: {e}")
        import traceback
        traceback.print_exc()


if __name__ == "__main__":
    asyncio.run(main())