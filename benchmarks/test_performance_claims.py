#!/usr/bin/env python3
"""
Performance Validation for MCP-RAG-V4
Tests O3's performance claims:
- RAG Search: <200ms (p95)
- Document Ingestion: 50+ docs/second
- Task Orchestration: 20+ tasks/second
"""
import asyncio
import time
import statistics
from pathlib import Path
import tempfile
import shutil
import numpy as np
from typing import List, Dict, Any

import sys
sys.path.append('../')

from agents.core.agent_runtime import (
    AgentRuntime, Message, MessageIntent, TaskState
)
from rag_system.enhanced_rag import EnhancedRAGSystem


class PerformanceTester:
    """Performance testing utilities"""
    
    def __init__(self):
        self.results = {
            'rag_search': [],
            'document_ingestion': [],
            'task_orchestration': [],
            'message_passing': []
        }
    
    def add_result(self, category: str, duration_ms: float):
        """Add a performance result"""
        self.results[category].append(duration_ms)
    
    def get_stats(self, category: str) -> Dict[str, float]:
        """Get statistics for a category"""
        values = self.results[category]
        if not values:
            return {}
        
        sorted_values = sorted(values)
        return {
            'count': len(values),
            'mean': statistics.mean(values),
            'median': statistics.median(values),
            'p95': sorted_values[int(len(values) * 0.95)] if len(values) > 20 else max(values),
            'p99': sorted_values[int(len(values) * 0.99)] if len(values) > 100 else max(values),
            'min': min(values),
            'max': max(values)
        }


async def test_rag_performance():
    """Test RAG search performance"""
    print("\n🔍 Testing RAG Search Performance")
    print("-" * 50)
    
    # Initialize RAG system
    rag = EnhancedRAGSystem({
        'embedding_model': 'sentence-transformers/all-MiniLM-L6-v2',  # Faster model for testing
        'chunk_size': 256,
        'chunk_overlap': 64,
        'enable_redis': False
    })
    
    await rag.initialize()
    
    # Ingest test documents
    print("📄 Ingesting test documents...")
    test_docs = [
        {
            "content": f"Document {i}: This is a test document about {topic}. It contains information about {topic} and related concepts. The {topic} is important for understanding the system architecture and design patterns used in modern software development.",
            "metadata": {"title": f"Doc {i}: {topic}", "category": "test"}
        }
        for i, topic in enumerate([
            "microservices", "authentication", "databases", "caching", "queuing",
            "monitoring", "logging", "security", "performance", "scalability"
        ])
    ]
    
    for doc in test_docs:
        await rag.ingest_document(doc['content'], doc['metadata'])
    
    # Test search performance
    tester = PerformanceTester()
    queries = [
        "What is microservices architecture?",
        "How does authentication work?",
        "Database design patterns",
        "Caching strategies",
        "Message queue implementation",
        "System monitoring best practices",
        "Security considerations",
        "Performance optimization",
        "Scalability patterns",
        "Distributed systems"
    ]
    
    print("\n⏱️  Running search performance tests...")
    
    # Warm up
    for _ in range(5):
        await rag.hybrid_search("warmup query", limit=5)
    
    # Run tests
    for i in range(100):
        query = queries[i % len(queries)]
        
        start = time.perf_counter()
        results = await rag.hybrid_search(
            query=query,
            limit=10,
            use_reranking=True
        )
        duration_ms = (time.perf_counter() - start) * 1000
        
        tester.add_result('rag_search', duration_ms)
        
        if i % 20 == 0:
            print(f"  Completed {i+1}/100 searches...")
    
    # Display results
    stats = tester.get_stats('rag_search')
    print(f"\n📊 RAG Search Performance:")
    print(f"  Mean: {stats['mean']:.2f}ms")
    print(f"  Median: {stats['median']:.2f}ms")
    print(f"  P95: {stats['p95']:.2f}ms")
    print(f"  P99: {stats['p99']:.2f}ms")
    print(f"  Min/Max: {stats['min']:.2f}ms / {stats['max']:.2f}ms")
    
    # Check against O3's claim
    if stats['p95'] < 200:
        print(f"\n✅ PASSED: P95 ({stats['p95']:.2f}ms) < 200ms claim")
    else:
        print(f"\n❌ FAILED: P95 ({stats['p95']:.2f}ms) > 200ms claim")
    
    return stats


async def test_ingestion_performance():
    """Test document ingestion performance"""
    print("\n📚 Testing Document Ingestion Performance")
    print("-" * 50)
    
    rag = EnhancedRAGSystem({
        'embedding_model': 'sentence-transformers/all-MiniLM-L6-v2',
        'chunk_size': 256,
        'chunk_overlap': 64,
        'enable_redis': False
    })
    
    await rag.initialize()
    
    tester = PerformanceTester()
    
    # Generate test documents
    test_content = """
    This is a comprehensive test document that contains multiple paragraphs of text.
    It is designed to test the document ingestion performance of the RAG system.
    The content includes various topics and concepts that would typically be found
    in technical documentation or knowledge bases. Each document is unique but
    follows a similar structure to ensure consistent testing conditions.
    """
    
    print("\n⏱️  Running ingestion performance tests...")
    
    # Test burst ingestion
    num_docs = 50
    start = time.perf_counter()
    
    for i in range(num_docs):
        await rag.ingest_document(
            content=f"Document {i}: {test_content}",
            metadata={
                "title": f"Test Document {i}",
                "source": "performance_test",
                "doc_id": i
            },
            chunking_strategy="fixed"  # Faster for testing
        )
    
    total_time = time.perf_counter() - start
    docs_per_second = num_docs / total_time
    
    print(f"\n📊 Document Ingestion Performance:")
    print(f"  Documents ingested: {num_docs}")
    print(f"  Total time: {total_time:.2f}s")
    print(f"  Rate: {docs_per_second:.2f} docs/second")
    
    # Check against O3's claim
    if docs_per_second > 50:
        print(f"\n✅ PASSED: {docs_per_second:.2f} docs/sec > 50 docs/sec claim")
    else:
        print(f"\n❌ FAILED: {docs_per_second:.2f} docs/sec < 50 docs/sec claim")
    
    return docs_per_second


async def test_task_orchestration_performance():
    """Test task orchestration performance"""
    print("\n🎯 Testing Task Orchestration Performance")
    print("-" * 50)
    
    # Setup
    temp_dir = tempfile.mkdtemp()
    config = {
        'shared_dir': temp_dir,
        'enable_redis': False
    }
    
    try:
        # Create mock agent for testing
        class FastAgent(AgentRuntime):
            def __init__(self, agent_id: str):
                super().__init__(agent_id, "fast", config)
                self.tasks_processed = 0
            
            async def initialize(self):
                pass
            
            async def cleanup(self):
                pass
            
            async def on_idle(self):
                pass
            
            async def handle_request(self, message: Message):
                self.tasks_processed += 1
                # Immediate response
                await self.send_message(Message(
                    sender_id=self.agent_id,
                    recipient_id=message.sender_id,
                    intent=MessageIntent.INFORM,
                    task_id=message.task_id,
                    payload={"status": "completed"}
                ))
        
        agent = FastAgent("worker-01")
        admin = FastAgent("admin-01")
        
        # Start agent
        agent_task = asyncio.create_task(agent.run())
        
        tester = PerformanceTester()
        
        print("\n⏱️  Running task orchestration tests...")
        
        # Test task throughput
        num_tasks = 200
        start = time.perf_counter()
        
        # Send tasks
        for i in range(num_tasks):
            msg = Message(
                sender_id=admin.agent_id,
                recipient_id=agent.agent_id,
                intent=MessageIntent.REQUEST,
                task_id=f"perf-task-{i}",
                payload={"action": "process"}
            )
            await admin.send_message(msg)
            
            # Measure individual task latency occasionally
            if i % 10 == 0:
                task_start = time.perf_counter()
                response = await admin.next_message(timeout=0.1)
                if response:
                    latency_ms = (time.perf_counter() - task_start) * 1000
                    tester.add_result('task_orchestration', latency_ms)
        
        # Wait for processing
        await asyncio.sleep(1.0)
        
        total_time = time.perf_counter() - start
        tasks_per_second = num_tasks / total_time
        
        print(f"\n📊 Task Orchestration Performance:")
        print(f"  Tasks sent: {num_tasks}")
        print(f"  Total time: {total_time:.2f}s")
        print(f"  Rate: {tasks_per_second:.2f} tasks/second")
        print(f"  Tasks processed by agent: {agent.tasks_processed}")
        
        # Check against O3's claim
        if tasks_per_second > 20:
            print(f"\n✅ PASSED: {tasks_per_second:.2f} tasks/sec > 20 tasks/sec claim")
        else:
            print(f"\n❌ FAILED: {tasks_per_second:.2f} tasks/sec < 20 tasks/sec claim")
        
        # Stop agent
        agent.running = False
        await agent_task
        
        return tasks_per_second
        
    finally:
        shutil.rmtree(temp_dir)


async def test_concurrent_operations():
    """Test system under concurrent load"""
    print("\n⚡ Testing Concurrent Operations")
    print("-" * 50)
    
    # Setup RAG
    rag = EnhancedRAGSystem({
        'embedding_model': 'sentence-transformers/all-MiniLM-L6-v2',
        'chunk_size': 256,
        'enable_redis': False
    })
    
    await rag.initialize()
    
    # Ingest test data
    for i in range(10):
        await rag.ingest_document(
            f"Test document {i} with various content for searching",
            {"title": f"Doc {i}", "category": "test"}
        )
    
    print("\n⏱️  Running concurrent load test...")
    
    async def concurrent_search(query_id: int):
        """Perform a search operation"""
        start = time.perf_counter()
        results = await rag.hybrid_search(
            f"search query {query_id % 5}",
            limit=5
        )
        duration_ms = (time.perf_counter() - start) * 1000
        return duration_ms
    
    # Run 100 concurrent searches
    tasks = [concurrent_search(i) for i in range(100)]
    start = time.perf_counter()
    durations = await asyncio.gather(*tasks)
    total_time = time.perf_counter() - start
    
    # Analyze results
    sorted_durations = sorted(durations)
    p95 = sorted_durations[int(len(durations) * 0.95)]
    p99 = sorted_durations[int(len(durations) * 0.99)]
    
    print(f"\n📊 Concurrent Operations Performance:")
    print(f"  Concurrent requests: 100")
    print(f"  Total time: {total_time:.2f}s")
    print(f"  Throughput: {100/total_time:.2f} req/sec")
    print(f"  Latency P95: {p95:.2f}ms")
    print(f"  Latency P99: {p99:.2f}ms")
    
    if 100/total_time > 100:
        print(f"\n✅ PASSED: System handles 100+ concurrent operations")
    else:
        print(f"\n⚠️  WARNING: Concurrent performance below expectations")


async def main():
    """Run all performance tests"""
    print("🏃 MCP-RAG-V4 Performance Validation")
    print("=" * 60)
    print("Testing O3's performance claims...")
    
    results = {}
    
    try:
        # Test 1: RAG Search Performance
        rag_stats = await test_rag_performance()
        results['rag_search_p95'] = rag_stats['p95']
        
        # Test 2: Document Ingestion
        ingestion_rate = await test_ingestion_performance()
        results['ingestion_rate'] = ingestion_rate
        
        # Test 3: Task Orchestration
        task_rate = await test_task_orchestration_performance()
        results['task_rate'] = task_rate
        
        # Test 4: Concurrent Operations
        await test_concurrent_operations()
        
    except Exception as e:
        print(f"\n❌ Performance test failed: {e}")
        import traceback
        traceback.print_exc()
    
    # Final Summary
    print("\n" + "=" * 60)
    print("📊 PERFORMANCE VALIDATION SUMMARY")
    print("=" * 60)
    
    claims_met = 0
    total_claims = 3
    
    # RAG Search
    if results.get('rag_search_p95', float('inf')) < 200:
        print("✅ RAG Search: PASSED (< 200ms p95)")
        claims_met += 1
    else:
        print("❌ RAG Search: FAILED (> 200ms p95)")
    
    # Document Ingestion
    if results.get('ingestion_rate', 0) > 50:
        print("✅ Document Ingestion: PASSED (> 50 docs/sec)")
        claims_met += 1
    else:
        print("❌ Document Ingestion: FAILED (< 50 docs/sec)")
    
    # Task Orchestration
    if results.get('task_rate', 0) > 20:
        print("✅ Task Orchestration: PASSED (> 20 tasks/sec)")
        claims_met += 1
    else:
        print("❌ Task Orchestration: FAILED (< 20 tasks/sec)")
    
    print(f"\n📈 Overall: {claims_met}/{total_claims} performance claims validated")
    
    if claims_met == total_claims:
        print("\n🎉 All performance claims VALIDATED!")
    else:
        print(f"\n⚠️  Only {claims_met}/{total_claims} claims met. Optimization needed.")


if __name__ == "__main__":
    # Check dependencies
    try:
        import numpy
    except ImportError:
        print("Installing numpy...")
        import subprocess
        subprocess.check_call(["pip3", "install", "numpy", "--break-system-packages"])
    
    asyncio.run(main())