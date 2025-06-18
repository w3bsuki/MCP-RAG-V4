#!/usr/bin/env python3
"""
Test MCP HTTP Endpoints
"""
import asyncio
import sys
sys.path.append('.')

from agents.core.http_mcp_client import HTTPMCPClient

async def test_mcp():
    """Test MCP HTTP client"""
    client = HTTPMCPClient()
    
    print("Testing MCP HTTP endpoints...")
    
    # Test health checks
    for server in ["knowledge-base", "vector-search", "coordination-hub"]:
        healthy = await client.health_check(server)
        print(f"{server}: {'✓ healthy' if healthy else '✗ not responding'}")
    
    # Test knowledge base
    print("\nTesting knowledge base...")
    try:
        # Store knowledge
        doc_id = await client.store_knowledge(
            "This is a test document for MCP integration",
            {"title": "Test Doc", "tags": ["test", "mcp"]}
        )
        print(f"Stored document with ID: {doc_id}")
        
        # Search knowledge
        results = await client.search_knowledge("test", limit=5)
        print(f"Found {len(results)} results")
        
    except Exception as e:
        print(f"Knowledge base test failed: {e}")
    
    await client.close()

if __name__ == "__main__":
    asyncio.run(test_mcp())