#!/usr/bin/env python3
"""
Performance Benchmarking Suite for MCP-RAG-V4
Measures performance of all major components
"""
import asyncio
import time
import json
import statistics
from pathlib import Path
from typing import Dict, List, Any, Callable
from datetime import datetime
import psutil
import aiohttp
from concurrent.futures import ThreadPoolExecutor
import numpy as np

import sys
sys.path.append('../')

from agents.admin.agent_orchestrator import AdminAgent, AgentTask
from rag_system.enhanced_rag import EnhancedRAGSystem
from mcp_servers.logging_config import setup_logging

# Initialize logging
loggers = setup_logging("benchmark-suite", "INFO")
logger = loggers['main']

class BenchmarkMetrics:
    """Collect and analyze benchmark metrics"""
    
    def __init__(self, name: str):
        self.name = name
        self.measurements = []
        self.start_time = None
        self.end_time = None
        self.memory_before = None
        self.memory_after = None
        
    def start(self):
        """Start timing and record initial memory"""
        self.start_time = time.perf_counter()
        self.memory_before = psutil.Process().memory_info().rss / 1024 / 1024  # MB
        
    def stop(self):
        """Stop timing and record final memory"""
        self.end_time = time.perf_counter()
        self.memory_after = psutil.Process().memory_info().rss / 1024 / 1024  # MB
        duration = self.end_time - self.start_time
        self.measurements.append(duration)
        return duration
        
    def get_stats(self) -> Dict[str, Any]:
        """Calculate statistics from measurements"""
        if not self.measurements:
            return {}
            
        return {
            "name": self.name,
            "count": len(self.measurements),
            "total_time": sum(self.measurements),
            "mean": statistics.mean(self.measurements),
            "median": statistics.median(self.measurements),
            "stdev": statistics.stdev(self.measurements) if len(self.measurements) > 1 else 0,
            "min": min(self.measurements),
            "max": max(self.measurements),
            "p95": np.percentile(self.measurements, 95),
            "p99": np.percentile(self.measurements, 99),
            "memory_delta_mb": (self.memory_after - self.memory_before) if self.memory_after else 0
        }

class PerformanceBenchmark:
    """Main benchmark suite"""
    
    def __init__(self):
        self.results = {}
        self.admin_agent = None
        self.rag_system = None
        
    async def setup(self):
        """Initialize components for benchmarking"""
        # Initialize Admin Agent
        self.admin_agent = AdminAgent({
            'max_concurrent_tasks': 10,
            'task_timeout': 300
        })
        await self.admin_agent.initialize()
        
        # Initialize RAG System
        self.rag_system = EnhancedRAGSystem({
            'embedding_model': 'sentence-transformers/all-MiniLM-L6-v2',
            'chunk_size': 512,
            'chunk_overlap': 128
        })
        await self.rag_system.initialize()
        
    async def teardown(self):
        """Cleanup after benchmarking"""
        if self.admin_agent:
            await self.admin_agent.shutdown()
        if self.rag_system:
            await self.rag_system.shutdown()
    
    async def benchmark_rag_ingestion(self, num_documents: int = 100):
        """Benchmark document ingestion performance"""
        logger.info(f"Benchmarking RAG ingestion with {num_documents} documents")
        
        metrics = BenchmarkMetrics("rag_ingestion")
        
        # Generate sample documents
        documents = []
        for i in range(num_documents):
            doc_content = f"""
            Document {i}: Technical Documentation
            
            This is a sample technical document used for benchmarking the RAG system.
            It contains multiple paragraphs with technical information about system {i}.
            
            Key features:
            - Feature A: Advanced processing capabilities
            - Feature B: High-performance architecture
            - Feature C: Scalable design patterns
            
            Implementation details follow with code examples and architectural diagrams.
            The system uses modern microservices architecture with event-driven communication.
            """
            documents.append({
                "content": doc_content,
                "metadata": {
                    "id": f"doc_{i}",
                    "category": f"category_{i % 5}",
                    "tags": [f"tag_{i % 10}", f"tag_{i % 7}"]
                }
            })
        
        # Benchmark ingestion
        metrics.start()
        
        ingestion_tasks = []
        for doc in documents:
            task = self.rag_system.ingest_document(
                content=doc["content"],
                metadata=doc["metadata"]
            )
            ingestion_tasks.append(task)
        
        await asyncio.gather(*ingestion_tasks)
        
        duration = metrics.stop()
        docs_per_second = num_documents / duration
        
        self.results["rag_ingestion"] = {
            **metrics.get_stats(),
            "documents_per_second": docs_per_second,
            "total_documents": num_documents
        }
        
        logger.info(f"Ingested {num_documents} documents in {duration:.2f}s ({docs_per_second:.2f} docs/s)")
    
    async def benchmark_rag_search(self, num_queries: int = 100):
        """Benchmark RAG search performance"""
        logger.info(f"Benchmarking RAG search with {num_queries} queries")
        
        metrics = BenchmarkMetrics("rag_search")
        
        # Generate sample queries
        queries = [
            "advanced processing capabilities",
            "microservices architecture",
            "event-driven communication",
            "scalable design patterns",
            "high-performance system",
            "technical documentation",
            "implementation details",
            "code examples",
            "architectural diagrams",
            "modern architecture"
        ]
        
        # Benchmark searches
        for i in range(num_queries):
            query = queries[i % len(queries)]
            
            metrics.start()
            results = await self.rag_system.hybrid_search(query, limit=10)
            duration = metrics.stop()
        
        self.results["rag_search"] = metrics.get_stats()
        
        logger.info(f"Completed {num_queries} searches, avg: {metrics.get_stats()['mean']:.3f}s")
    
    async def benchmark_task_orchestration(self, num_tasks: int = 50):
        """Benchmark multi-agent task orchestration"""
        logger.info(f"Benchmarking task orchestration with {num_tasks} tasks")
        
        metrics = BenchmarkMetrics("task_orchestration")
        
        # Create various task types
        task_templates = [
            {
                "name": "API Design Task",
                "description": "Design REST API for user management",
                "complexity": "medium"
            },
            {
                "name": "Implementation Task",
                "description": "Implement authentication service",
                "complexity": "high"
            },
            {
                "name": "Validation Task",
                "description": "Validate security compliance",
                "complexity": "low"
            }
        ]
        
        # Submit tasks and measure orchestration performance
        task_ids = []
        
        metrics.start()
        
        for i in range(num_tasks):
            template = task_templates[i % len(task_templates)]
            task = AgentTask(
                name=f"{template['name']} #{i}",
                description=template["description"],
                metadata={"complexity": template["complexity"]}
            )
            
            task_id = await self.admin_agent.submit_task(task)
            task_ids.append(task_id)
        
        # Wait for all tasks to be assigned
        await asyncio.sleep(5)
        
        duration = metrics.stop()
        tasks_per_second = num_tasks / duration
        
        # Check task distribution
        agent_assignments = {}
        for task_id in task_ids:
            status = self.admin_agent.get_task_status(task_id)
            if status and status.get('assigned_to'):
                agent = status['assigned_to']
                agent_assignments[agent] = agent_assignments.get(agent, 0) + 1
        
        self.results["task_orchestration"] = {
            **metrics.get_stats(),
            "tasks_per_second": tasks_per_second,
            "total_tasks": num_tasks,
            "agent_distribution": agent_assignments
        }
        
        logger.info(f"Orchestrated {num_tasks} tasks in {duration:.2f}s ({tasks_per_second:.2f} tasks/s)")
    
    async def benchmark_concurrent_operations(self, concurrency_level: int = 10):
        """Benchmark system under concurrent load"""
        logger.info(f"Benchmarking concurrent operations with level {concurrency_level}")
        
        metrics = BenchmarkMetrics("concurrent_operations")
        
        async def mixed_operation(i: int):
            """Simulate mixed workload"""
            # RAG search
            await self.rag_system.hybrid_search(f"query {i}", limit=5)
            
            # Task submission
            task = AgentTask(
                name=f"Concurrent Task {i}",
                description="Test concurrent processing"
            )
            await self.admin_agent.submit_task(task)
        
        # Run concurrent operations
        metrics.start()
        
        tasks = [mixed_operation(i) for i in range(concurrency_level)]
        await asyncio.gather(*tasks)
        
        duration = metrics.stop()
        ops_per_second = (concurrency_level * 2) / duration  # 2 ops per iteration
        
        self.results["concurrent_operations"] = {
            **metrics.get_stats(),
            "operations_per_second": ops_per_second,
            "concurrency_level": concurrency_level
        }
        
        logger.info(f"Completed {concurrency_level * 2} concurrent operations in {duration:.2f}s")
    
    async def benchmark_api_endpoints(self, base_url: str = "http://localhost:8000"):
        """Benchmark REST API endpoints"""
        logger.info("Benchmarking API endpoints")
        
        endpoints = [
            ("GET", "/api/agents", None),
            ("GET", "/api/tasks", None),
            ("POST", "/api/rag/search", {"query": "test search", "limit": 10}),
            ("GET", "/api/metrics", None),
            ("GET", "/api/health", None)
        ]
        
        async with aiohttp.ClientSession() as session:
            for method, endpoint, data in endpoints:
                metrics = BenchmarkMetrics(f"api_{endpoint}")
                
                # Warm up
                url = f"{base_url}{endpoint}"
                if method == "GET":
                    await session.get(url)
                else:
                    await session.post(url, json=data)
                
                # Benchmark
                for _ in range(10):
                    metrics.start()
                    
                    if method == "GET":
                        async with session.get(url) as response:
                            await response.text()
                    else:
                        async with session.post(url, json=data) as response:
                            await response.text()
                    
                    metrics.stop()
                
                self.results[f"api_{endpoint}"] = metrics.get_stats()
                logger.info(f"API {endpoint}: avg {metrics.get_stats()['mean']:.3f}s")
    
    def generate_report(self) -> str:
        """Generate comprehensive benchmark report"""
        report = ["# MCP-RAG-V4 Performance Benchmark Report", ""]
        report.append(f"Generated: {datetime.now().isoformat()}")
        report.append("")
        
        # System information
        report.append("## System Information")
        report.append(f"- CPU Count: {psutil.cpu_count()}")
        report.append(f"- Memory: {psutil.virtual_memory().total / 1024 / 1024 / 1024:.2f} GB")
        report.append(f"- Python Version: {sys.version.split()[0]}")
        report.append("")
        
        # Benchmark results
        report.append("## Benchmark Results")
        
        for name, stats in self.results.items():
            report.append(f"\n### {name}")
            report.append(f"- Mean: {stats.get('mean', 0):.3f}s")
            report.append(f"- Median: {stats.get('median', 0):.3f}s")
            report.append(f"- P95: {stats.get('p95', 0):.3f}s")
            report.append(f"- P99: {stats.get('p99', 0):.3f}s")
            
            if 'documents_per_second' in stats:
                report.append(f"- Throughput: {stats['documents_per_second']:.2f} docs/s")
            elif 'tasks_per_second' in stats:
                report.append(f"- Throughput: {stats['tasks_per_second']:.2f} tasks/s")
            elif 'operations_per_second' in stats:
                report.append(f"- Throughput: {stats['operations_per_second']:.2f} ops/s")
            
            if stats.get('memory_delta_mb', 0) > 0:
                report.append(f"- Memory Usage: +{stats['memory_delta_mb']:.2f} MB")
        
        # Performance recommendations
        report.append("\n## Performance Recommendations")
        
        # Check RAG performance
        if 'rag_search' in self.results:
            avg_search = self.results['rag_search']['mean']
            if avg_search > 0.2:
                report.append("- ⚠️ RAG search latency high. Consider:")
                report.append("  - Implementing result caching")
                report.append("  - Optimizing vector index")
                report.append("  - Using smaller embedding model")
        
        # Check task orchestration
        if 'task_orchestration' in self.results:
            tasks_per_sec = self.results['task_orchestration'].get('tasks_per_second', 0)
            if tasks_per_sec < 10:
                report.append("- ⚠️ Task orchestration throughput low. Consider:")
                report.append("  - Increasing worker pool size")
                report.append("  - Optimizing task assignment algorithm")
                report.append("  - Implementing task batching")
        
        return "\n".join(report)
    
    async def run_full_benchmark(self):
        """Run complete benchmark suite"""
        logger.info("Starting full benchmark suite")
        
        await self.setup()
        
        try:
            # Run all benchmarks
            await self.benchmark_rag_ingestion(num_documents=100)
            await self.benchmark_rag_search(num_queries=50)
            await self.benchmark_task_orchestration(num_tasks=30)
            await self.benchmark_concurrent_operations(concurrency_level=20)
            
            # Generate and save report
            report = self.generate_report()
            
            report_path = Path("benchmark_results") / f"benchmark_{datetime.now().strftime('%Y%m%d_%H%M%S')}.md"
            report_path.parent.mkdir(exist_ok=True)
            report_path.write_text(report)
            
            logger.info(f"Benchmark complete. Report saved to: {report_path}")
            
            # Also save raw results as JSON
            json_path = report_path.with_suffix('.json')
            json_path.write_text(json.dumps(self.results, indent=2))
            
        finally:
            await self.teardown()

async def main():
    """Run the benchmark suite"""
    benchmark = PerformanceBenchmark()
    await benchmark.run_full_benchmark()

if __name__ == "__main__":
    asyncio.run(main())