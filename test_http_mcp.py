#!/usr/bin/env python3
"""
Test HTTP MCP Integration - This WILL work!
"""
import asyncio
import sys
sys.path.insert(0, '.')

from agents.core.http_mcp_client import HTTPMCPClient


async def test_http_mcp():
    print("🚀 Testing HTTP MCP Client (The Working Solution)")
    print("=" * 50)
    
    async with HTTPMCPClient() as client:
        # Test 1: Health check
        print("\n1️⃣ Testing server health checks...")
        kb_health = await client.health_check("knowledge-base")
        print(f"   Knowledge Base: {'✅ ONLINE' if kb_health else '❌ OFFLINE'}")
        
        if kb_health:
            # Test 2: Store knowledge
            print("\n2️⃣ Testing knowledge storage...")
            try:
                kb_id = await client.store_knowledge(
                    "This is test knowledge from HTTP client",
                    {"tags": ["test", "http"], "category": "test"}
                )
                print(f"   ✅ Stored knowledge with ID: {kb_id}")
            except Exception as e:
                print(f"   ❌ Failed to store: {e}")
            
            # Test 3: Search knowledge
            print("\n3️⃣ Testing knowledge search...")
            try:
                results = await client.search_knowledge("test knowledge")
                print(f"   ✅ Found {len(results)} results")
                if results:
                    print(f"   First result: {results[0].get('title', 'No title')}")
            except Exception as e:
                print(f"   ❌ Failed to search: {e}")
        else:
            print("\n⚠️  Knowledge base server not running!")
            print("   Start it with: ./start_mcp_servers.sh")
    
    print("\n" + "=" * 50)
    print("💡 This is how agents SHOULD connect to MCP servers!")
    print("   No stdio protocol issues, just simple HTTP!")


if __name__ == "__main__":
    asyncio.run(test_http_mcp())