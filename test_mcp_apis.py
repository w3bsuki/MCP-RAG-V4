#!/usr/bin/env python3
"""
Test MCP HTTP APIs
"""
import asyncio
import sys
from pathlib import Path

# Add project root to path
sys.path.insert(0, str(Path(__file__).parent))

from agents.core.http_mcp_client import HTTPMCPClient


async def test_apis():
    """Test all MCP HTTP APIs"""
    print("Testing MCP HTTP APIs...")
    
    async with HTTPMCPClient() as client:
        # Test health checks
        print("\n1. Testing health checks...")
        for server in ["knowledge-base", "vector-search", "coordination-hub"]:
            healthy = await client.health_check(server)
            print(f"   {server}: {'✓ Healthy' if healthy else '✗ Not responding'}")
        
        # Test knowledge base
        print("\n2. Testing Knowledge Base...")
        try:
            # Store knowledge
            kb_id = await client.store_knowledge(
                "MCP servers use stdio protocol for communication",
                {"category": "architecture", "tags": ["mcp", "protocol"]}
            )
            print(f"   ✓ Stored knowledge with ID: {kb_id}")
            
            # Search knowledge
            results = await client.search_knowledge("protocol")
            print(f"   ✓ Search returned {len(results)} results")
        except Exception as e:
            print(f"   ✗ Knowledge Base error: {e}")
        
        # Test vector search
        print("\n3. Testing Vector Search...")
        try:
            # Store document
            doc_id = await client.store_document(
                "The MCP-RAG system integrates multiple agents for collaborative development",
                {"type": "documentation", "project": "MCP-RAG-V4"}
            )
            print(f"   ✓ Stored document with ID: {doc_id}")
            
            # Search documents
            results = await client.vector_search("agents")
            print(f"   ✓ Search returned {len(results)} results")
        except Exception as e:
            print(f"   ✗ Vector Search error: {e}")
        
        # Test coordination hub
        print("\n4. Testing Coordination Hub...")
        try:
            # Get tasks
            tasks = await client.get_tasks()
            print(f"   ✓ Retrieved {len(tasks)} tasks")
            
            # Update a task if any exist
            if tasks:
                task_id = tasks[0]["id"]
                success = await client.update_task(
                    task_id, 
                    "in_progress",
                    {"notes": "Testing API connection"}
                )
                print(f"   ✓ Updated task {task_id}: {success}")
        except Exception as e:
            print(f"   ✗ Coordination Hub error: {e}")
    
    print("\nAPI testing complete!")


if __name__ == "__main__":
    print("Make sure the API servers are running first!")
    print("Run: ./start_mcp_apis.sh")
    print("-" * 50)
    asyncio.run(test_apis())