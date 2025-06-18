#!/usr/bin/env python3
"""
Prometheus Metrics for RAG System
Exposes search latency, ingestion rate, and system health metrics
"""
from prometheus_client import Counter, Histogram, Gauge, Info
import time
from functools import wraps
from typing import Callable, Any

# RAG System Metrics

# Counters
rag_searches_total = Counter(
    'rag_searches_total',
    'Total number of RAG searches performed',
    ['search_type', 'status']
)

rag_documents_ingested_total = Counter(
    'rag_documents_ingested_total',
    'Total number of documents ingested',
    ['chunking_strategy', 'status']
)

rag_chunks_created_total = Counter(
    'rag_chunks_created_total',
    'Total number of chunks created',
    ['strategy']
)

# Histograms
rag_search_duration_seconds = Histogram(
    'rag_search_duration_seconds',
    'Time spent performing RAG searches',
    ['search_type'],
    buckets=(0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1.0, 2.5, 5.0, 10.0)
)

rag_ingestion_duration_seconds = Histogram(
    'rag_ingestion_duration_seconds',
    'Time spent ingesting documents',
    ['chunking_strategy'],
    buckets=(0.1, 0.5, 1.0, 2.5, 5.0, 10.0, 30.0, 60.0)
)

rag_embedding_duration_seconds = Histogram(
    'rag_embedding_duration_seconds',
    'Time spent generating embeddings',
    buckets=(0.01, 0.05, 0.1, 0.25, 0.5, 1.0)
)

rag_reranking_duration_seconds = Histogram(
    'rag_reranking_duration_seconds',
    'Time spent reranking search results',
    buckets=(0.01, 0.05, 0.1, 0.25, 0.5, 1.0)
)

# Gauges
rag_documents_total = Gauge(
    'rag_documents_total',
    'Total number of documents in the system'
)

rag_chunks_total = Gauge(
    'rag_chunks_total',
    'Total number of chunks in the system'
)

rag_vector_store_size_bytes = Gauge(
    'rag_vector_store_size_bytes',
    'Size of the vector store in bytes'
)

rag_search_results_returned = Gauge(
    'rag_search_results_returned',
    'Number of results returned in last search'
)

rag_search_relevance_score = Gauge(
    'rag_search_relevance_score',
    'Average relevance score of last search results'
)

# Info
rag_system_info = Info(
    'rag_system_info',
    'RAG system configuration'
)

# Helper decorators
def track_search_metrics(search_type: str):
    """Decorator to track search metrics"""
    def decorator(func: Callable) -> Callable:
        @wraps(func)
        async def wrapper(*args, **kwargs) -> Any:
            start_time = time.time()
            status = 'success'
            
            try:
                result = await func(*args, **kwargs)
                
                # Track result metrics
                if hasattr(result, '__len__'):
                    rag_search_results_returned.set(len(result))
                    
                    # Calculate average relevance score
                    if result and hasattr(result[0], 'final_score'):
                        avg_score = sum(r.final_score for r in result) / len(result)
                        rag_search_relevance_score.set(avg_score)
                
                return result
                
            except Exception as e:
                status = 'error'
                raise
                
            finally:
                duration = time.time() - start_time
                rag_search_duration_seconds.labels(search_type=search_type).observe(duration)
                rag_searches_total.labels(search_type=search_type, status=status).inc()
        
        return wrapper
    return decorator

def track_ingestion_metrics(chunking_strategy: str):
    """Decorator to track document ingestion metrics"""
    def decorator(func: Callable) -> Callable:
        @wraps(func)
        async def wrapper(*args, **kwargs) -> Any:
            start_time = time.time()
            status = 'success'
            
            try:
                result = await func(*args, **kwargs)
                
                # Track chunks created
                if hasattr(result, 'chunks'):
                    rag_chunks_created_total.labels(strategy=chunking_strategy).inc(len(result.chunks))
                
                return result
                
            except Exception as e:
                status = 'error'
                raise
                
            finally:
                duration = time.time() - start_time
                rag_ingestion_duration_seconds.labels(chunking_strategy=chunking_strategy).observe(duration)
                rag_documents_ingested_total.labels(chunking_strategy=chunking_strategy, status=status).inc()
        
        return wrapper
    return decorator

def track_embedding_time(func: Callable) -> Callable:
    """Decorator to track embedding generation time"""
    @wraps(func)
    async def wrapper(*args, **kwargs) -> Any:
        start_time = time.time()
        try:
            return await func(*args, **kwargs)
        finally:
            duration = time.time() - start_time
            rag_embedding_duration_seconds.observe(duration)
    
    return wrapper

def track_reranking_time(func: Callable) -> Callable:
    """Decorator to track reranking time"""
    @wraps(func)
    async def wrapper(*args, **kwargs) -> Any:
        start_time = time.time()
        try:
            return await func(*args, **kwargs)
        finally:
            duration = time.time() - start_time
            rag_reranking_duration_seconds.observe(duration)
    
    return wrapper

# Metrics collection functions
def update_system_metrics(documents_count: int, chunks_count: int, vector_store_size: int = 0):
    """Update system-level metrics"""
    rag_documents_total.set(documents_count)
    rag_chunks_total.set(chunks_count)
    if vector_store_size > 0:
        rag_vector_store_size_bytes.set(vector_store_size)

def set_system_info(embedding_model: str, collection_name: str, chunk_size: int):
    """Set system configuration info"""
    rag_system_info.info({
        'embedding_model': embedding_model,
        'collection_name': collection_name,
        'chunk_size': str(chunk_size)
    })