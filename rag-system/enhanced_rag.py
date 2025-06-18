#!/usr/bin/env python3
"""
Enhanced RAG System for MCP-RAG-V4
Implements document-aware chunking, hybrid search, and cross-encoder reranking
"""
import asyncio
import hashlib
import json
from dataclasses import dataclass, field
from datetime import datetime
from typing import Dict, List, Optional, Any, Tuple
from pathlib import Path
import numpy as np
from collections import defaultdict

# Third-party imports
from sentence_transformers import SentenceTransformer, CrossEncoder
import tiktoken
from qdrant_client import QdrantClient
from qdrant_client.models import (
    Distance, VectorParams, PointStruct, Filter, 
    FieldCondition, MatchValue, SearchRequest, ScoredPoint
)
import spacy
from rank_bm25 import BM25Okapi

# Import logging
import sys
sys.path.append('../mcp-servers/')
from logging_config import setup_logging, log_async_errors


@dataclass
class Document:
    """Document structure with metadata"""
    id: str
    content: str
    metadata: Dict[str, Any]
    chunks: List['DocumentChunk'] = field(default_factory=list)
    embeddings: Optional[np.ndarray] = None
    created_at: datetime = field(default_factory=datetime.now)
    updated_at: datetime = field(default_factory=datetime.now)


@dataclass
class DocumentChunk:
    """Individual chunk with context preservation"""
    id: str
    document_id: str
    content: str
    metadata: Dict[str, Any]
    start_char: int
    end_char: int
    chunk_index: int
    total_chunks: int
    embedding: Optional[List[float]] = None
    context_before: str = ""
    context_after: str = ""


@dataclass
class SearchResult:
    """Search result with multiple scoring methods"""
    chunk: DocumentChunk
    vector_score: float
    keyword_score: float = 0.0
    rerank_score: float = 0.0
    final_score: float = 0.0
    highlights: List[str] = field(default_factory=list)


class EnhancedRAGSystem:
    """
    Advanced RAG implementation with:
    - Document-aware chunking with overlap
    - Hybrid search (vector + keyword)
    - Cross-encoder reranking
    - Dynamic document updates
    - Feedback learning
    """
    
    def __init__(self, config: Dict[str, Any]):
        self.config = config
        
        # Initialize logging
        loggers = setup_logging("enhanced-rag", "INFO")
        self.logger = loggers['main']
        self.performance_logger = loggers['performance']
        
        # Initialize models
        self.embedder = SentenceTransformer(
            config.get('embedding_model', 'sentence-transformers/all-mpnet-base-v2')
        )
        self.reranker = CrossEncoder(
            config.get('reranking_model', 'cross-encoder/ms-marco-MiniLM-L-6-v2')
        )
        
        # Initialize Qdrant client
        self.qdrant = QdrantClient(
            url=config.get('qdrant_url', 'http://localhost:6333')
        )
        
        # Initialize tokenizer for chunk size calculation
        self.tokenizer = tiktoken.get_encoding("cl100k_base")
        
        # Initialize NLP for document understanding
        self.nlp = spacy.load("en_core_web_sm")
        
        # Document and chunk storage
        self.documents: Dict[str, Document] = {}
        self.chunks: Dict[str, DocumentChunk] = {}
        self.bm25_index: Optional[BM25Okapi] = None
        
        # Configuration
        self.chunk_size = config.get('chunk_size', 512)
        self.chunk_overlap = config.get('chunk_overlap', 128)
        self.collection_name = config.get('collection_name', 'mcp_rag_v4')
        
        # Weights for hybrid search
        self.vector_weight = config.get('vector_weight', 0.7)
        self.keyword_weight = config.get('keyword_weight', 0.3)
        
        # Feedback storage for continuous learning
        self.feedback_scores: Dict[str, List[float]] = defaultdict(list)
        
        self.logger.info("Enhanced RAG System initialized", extra={
            'embedding_model': self.embedder.get_sentence_embedding_dimension(),
            'collection': self.collection_name
        })
    
    async def initialize(self):
        """Initialize vector store and indices"""
        # Create collection if not exists
        collections = [c.name for c in self.qdrant.get_collections().collections]
        
        if self.collection_name not in collections:
            self.qdrant.create_collection(
                collection_name=self.collection_name,
                vectors_config=VectorParams(
                    size=self.embedder.get_sentence_embedding_dimension(),
                    distance=Distance.COSINE
                )
            )
            self.logger.info(f"Created collection: {self.collection_name}")
        
        # Load existing documents
        await self._load_existing_documents()
        
        # Build BM25 index
        self._build_bm25_index()
    
    @log_async_errors(logging.getLogger())
    async def ingest_document(
        self, 
        content: str, 
        metadata: Dict[str, Any],
        chunking_strategy: str = "document-aware"
    ) -> Document:
        """
        Ingest document with intelligent chunking
        
        Strategies:
        - document-aware: Respects document structure (paragraphs, sections)
        - fixed: Fixed size chunks
        - semantic: Chunks based on semantic boundaries
        """
        # Generate document ID
        doc_id = hashlib.sha256(
            f"{metadata.get('title', '')}:{content[:100]}".encode()
        ).hexdigest()[:16]
        
        # Create document
        document = Document(
            id=doc_id,
            content=content,
            metadata=metadata
        )
        
        # Chunk document based on strategy
        if chunking_strategy == "document-aware":
            chunks = await self._document_aware_chunking(document)
        elif chunking_strategy == "semantic":
            chunks = await self._semantic_chunking(document)
        else:
            chunks = await self._fixed_chunking(document)
        
        document.chunks = chunks
        
        # Generate embeddings for chunks
        await self._embed_chunks(chunks)
        
        # Store in vector database
        await self._store_chunks(chunks)
        
        # Update document storage
        self.documents[doc_id] = document
        
        # Update BM25 index
        self._build_bm25_index()
        
        self.logger.info(f"Document ingested: {doc_id}", extra={
            'title': metadata.get('title'),
            'chunks': len(chunks),
            'strategy': chunking_strategy
        })
        
        return document
    
    async def _document_aware_chunking(self, document: Document) -> List[DocumentChunk]:
        """
        Chunk document respecting its structure
        Preserves paragraphs, lists, code blocks, etc.
        """
        chunks = []
        doc = self.nlp(document.content)
        
        current_chunk = []
        current_tokens = 0
        chunk_index = 0
        start_char = 0
        
        # Process sentences
        for sent in doc.sents:
            sent_tokens = len(self.tokenizer.encode(sent.text))
            
            # Check if adding sentence exceeds chunk size
            if current_tokens + sent_tokens > self.chunk_size and current_chunk:
                # Create chunk
                chunk_content = ' '.join(current_chunk)
                end_char = start_char + len(chunk_content)
                
                chunk = DocumentChunk(
                    id=f"{document.id}_chunk_{chunk_index}",
                    document_id=document.id,
                    content=chunk_content,
                    metadata={
                        **document.metadata,
                        'chunk_index': chunk_index,
                        'chunking_strategy': 'document-aware'
                    },
                    start_char=start_char,
                    end_char=end_char,
                    chunk_index=chunk_index,
                    total_chunks=0  # Will be updated later
                )
                
                chunks.append(chunk)
                
                # Prepare for next chunk with overlap
                overlap_tokens = 0
                overlap_sents = []
                
                # Add sentences from end for overlap
                for i in range(len(current_chunk) - 1, -1, -1):
                    sent_text = current_chunk[i]
                    tokens = len(self.tokenizer.encode(sent_text))
                    if overlap_tokens + tokens <= self.chunk_overlap:
                        overlap_sents.insert(0, sent_text)
                        overlap_tokens += tokens
                    else:
                        break
                
                current_chunk = overlap_sents
                current_tokens = overlap_tokens
                chunk_index += 1
                start_char = end_char - len(' '.join(overlap_sents)) if overlap_sents else end_char
            
            current_chunk.append(sent.text)
            current_tokens += sent_tokens
        
        # Add final chunk
        if current_chunk:
            chunk_content = ' '.join(current_chunk)
            chunk = DocumentChunk(
                id=f"{document.id}_chunk_{chunk_index}",
                document_id=document.id,
                content=chunk_content,
                metadata={
                    **document.metadata,
                    'chunk_index': chunk_index,
                    'chunking_strategy': 'document-aware'
                },
                start_char=start_char,
                end_char=len(document.content),
                chunk_index=chunk_index,
                total_chunks=chunk_index + 1
            )
            chunks.append(chunk)
        
        # Update total chunks and add context
        for i, chunk in enumerate(chunks):
            chunk.total_chunks = len(chunks)
            
            # Add context from neighboring chunks
            if i > 0:
                chunk.context_before = chunks[i-1].content[-200:]  # Last 200 chars
            if i < len(chunks) - 1:
                chunk.context_after = chunks[i+1].content[:200]  # First 200 chars
        
        return chunks
    
    async def _semantic_chunking(self, document: Document) -> List[DocumentChunk]:
        """
        Chunk based on semantic boundaries using embedding similarity
        """
        # Split into sentences
        doc = self.nlp(document.content)
        sentences = [sent.text for sent in doc.sents]
        
        # Embed all sentences
        sentence_embeddings = self.embedder.encode(sentences)
        
        chunks = []
        current_chunk = []
        current_embedding = None
        chunk_index = 0
        start_char = 0
        
        for i, (sent, emb) in enumerate(zip(sentences, sentence_embeddings)):
            if not current_chunk:
                current_chunk = [sent]
                current_embedding = emb
                continue
            
            # Calculate similarity with current chunk
            similarity = np.dot(current_embedding, emb) / (
                np.linalg.norm(current_embedding) * np.linalg.norm(emb)
            )
            
            # Check tokens
            current_tokens = len(self.tokenizer.encode(' '.join(current_chunk)))
            sent_tokens = len(self.tokenizer.encode(sent))
            
            # Decide whether to add to current chunk or start new
            if (similarity < 0.7 or current_tokens + sent_tokens > self.chunk_size) and current_chunk:
                # Create chunk
                chunk_content = ' '.join(current_chunk)
                end_char = start_char + len(chunk_content)
                
                chunk = DocumentChunk(
                    id=f"{document.id}_chunk_{chunk_index}",
                    document_id=document.id,
                    content=chunk_content,
                    metadata={
                        **document.metadata,
                        'chunk_index': chunk_index,
                        'chunking_strategy': 'semantic'
                    },
                    start_char=start_char,
                    end_char=end_char,
                    chunk_index=chunk_index,
                    total_chunks=0
                )
                
                chunks.append(chunk)
                
                # Start new chunk
                current_chunk = [sent]
                current_embedding = emb
                chunk_index += 1
                start_char = end_char
            else:
                current_chunk.append(sent)
                # Update embedding as average
                current_embedding = np.mean(
                    [current_embedding, emb], axis=0
                )
        
        # Add final chunk
        if current_chunk:
            chunk_content = ' '.join(current_chunk)
            chunk = DocumentChunk(
                id=f"{document.id}_chunk_{chunk_index}",
                document_id=document.id,
                content=chunk_content,
                metadata={
                    **document.metadata,
                    'chunk_index': chunk_index,
                    'chunking_strategy': 'semantic'
                },
                start_char=start_char,
                end_char=len(document.content),
                chunk_index=chunk_index,
                total_chunks=chunk_index + 1
            )
            chunks.append(chunk)
        
        # Update total chunks
        for chunk in chunks:
            chunk.total_chunks = len(chunks)
        
        return chunks
    
    async def _fixed_chunking(self, document: Document) -> List[DocumentChunk]:
        """
        Simple fixed-size chunking with overlap
        """
        chunks = []
        tokens = self.tokenizer.encode(document.content)
        
        chunk_index = 0
        i = 0
        
        while i < len(tokens):
            # Get chunk tokens
            chunk_tokens = tokens[i:i + self.chunk_size]
            
            # Decode back to text
            chunk_content = self.tokenizer.decode(chunk_tokens)
            
            # Calculate character positions
            start_char = len(self.tokenizer.decode(tokens[:i]))
            end_char = start_char + len(chunk_content)
            
            chunk = DocumentChunk(
                id=f"{document.id}_chunk_{chunk_index}",
                document_id=document.id,
                content=chunk_content,
                metadata={
                    **document.metadata,
                    'chunk_index': chunk_index,
                    'chunking_strategy': 'fixed'
                },
                start_char=start_char,
                end_char=end_char,
                chunk_index=chunk_index,
                total_chunks=0
            )
            
            chunks.append(chunk)
            
            # Move forward with overlap
            i += self.chunk_size - self.chunk_overlap
            chunk_index += 1
        
        # Update total chunks
        for chunk in chunks:
            chunk.total_chunks = len(chunks)
        
        return chunks
    
    async def _embed_chunks(self, chunks: List[DocumentChunk]):
        """Generate embeddings for chunks"""
        texts = [chunk.content for chunk in chunks]
        embeddings = self.embedder.encode(texts, show_progress_bar=False)
        
        for chunk, embedding in zip(chunks, embeddings):
            chunk.embedding = embedding.tolist()
    
    async def _store_chunks(self, chunks: List[DocumentChunk]):
        """Store chunks in vector database"""
        points = []
        
        for chunk in chunks:
            # Store in memory
            self.chunks[chunk.id] = chunk
            
            # Prepare for Qdrant
            point = PointStruct(
                id=chunk.id,
                vector=chunk.embedding,
                payload={
                    'document_id': chunk.document_id,
                    'content': chunk.content,
                    'metadata': chunk.metadata,
                    'chunk_index': chunk.chunk_index,
                    'total_chunks': chunk.total_chunks,
                    'context_before': chunk.context_before,
                    'context_after': chunk.context_after
                }
            )
            points.append(point)
        
        # Batch upsert to Qdrant
        self.qdrant.upsert(
            collection_name=self.collection_name,
            points=points
        )
    
    def _build_bm25_index(self):
        """Build BM25 index for keyword search"""
        if not self.chunks:
            return
        
        # Tokenize all chunks
        tokenized_chunks = []
        chunk_ids = []
        
        for chunk_id, chunk in self.chunks.items():
            # Simple tokenization
            tokens = chunk.content.lower().split()
            tokenized_chunks.append(tokens)
            chunk_ids.append(chunk_id)
        
        # Build BM25 index
        self.bm25_index = BM25Okapi(tokenized_chunks)
        self.bm25_chunk_ids = chunk_ids
    
    @log_async_errors(logging.getLogger())
    async def hybrid_search(
        self,
        query: str,
        limit: int = 10,
        collections: Optional[List[str]] = None,
        score_threshold: float = 0.5,
        use_reranking: bool = True
    ) -> List[SearchResult]:
        """
        Perform hybrid search combining vector and keyword search
        """
        start_time = asyncio.get_event_loop().time()
        
        # 1. Vector search
        vector_results = await self._vector_search(query, limit * 2)
        
        # 2. Keyword search
        keyword_results = await self._keyword_search(query, limit * 2)
        
        # 3. Combine results
        combined_results = self._combine_search_results(
            vector_results, 
            keyword_results
        )
        
        # 4. Rerank if requested
        if use_reranking and combined_results:
            combined_results = await self._rerank_results(query, combined_results)
        
        # 5. Filter by threshold and limit
        final_results = [
            r for r in combined_results 
            if r.final_score >= score_threshold
        ][:limit]
        
        # Log performance
        duration = (asyncio.get_event_loop().time() - start_time) * 1000
        self.performance_logger.log_tool_performance(
            tool_name='hybrid_search',
            duration_ms=duration,
            agent='rag',
            success=True
        )
        
        self.logger.info(f"Hybrid search completed", extra={
            'query': query,
            'results': len(final_results),
            'duration_ms': duration
        })
        
        return final_results
    
    async def _vector_search(self, query: str, limit: int) -> List[SearchResult]:
        """Perform vector similarity search"""
        # Embed query
        query_embedding = self.embedder.encode(query).tolist()
        
        # Search in Qdrant
        search_results = self.qdrant.search(
            collection_name=self.collection_name,
            query_vector=query_embedding,
            limit=limit
        )
        
        # Convert to SearchResult
        results = []
        for result in search_results:
            chunk_id = result.id
            chunk = self.chunks.get(chunk_id)
            
            if chunk:
                search_result = SearchResult(
                    chunk=chunk,
                    vector_score=result.score
                )
                results.append(search_result)
        
        return results
    
    async def _keyword_search(self, query: str, limit: int) -> List[SearchResult]:
        """Perform BM25 keyword search"""
        if not self.bm25_index:
            return []
        
        # Tokenize query
        query_tokens = query.lower().split()
        
        # Get BM25 scores
        scores = self.bm25_index.get_scores(query_tokens)
        
        # Get top results
        top_indices = np.argsort(scores)[::-1][:limit]
        
        results = []
        for idx in top_indices:
            if scores[idx] > 0:
                chunk_id = self.bm25_chunk_ids[idx]
                chunk = self.chunks.get(chunk_id)
                
                if chunk:
                    # Normalize BM25 score to 0-1 range
                    normalized_score = scores[idx] / (scores[idx] + 1)
                    
                    search_result = SearchResult(
                        chunk=chunk,
                        vector_score=0.0,
                        keyword_score=normalized_score
                    )
                    results.append(search_result)
        
        return results
    
    def _combine_search_results(
        self,
        vector_results: List[SearchResult],
        keyword_results: List[SearchResult]
    ) -> List[SearchResult]:
        """Combine vector and keyword search results"""
        # Create a map of chunk_id to results
        result_map: Dict[str, SearchResult] = {}
        
        # Add vector results
        for result in vector_results:
            chunk_id = result.chunk.id
            result_map[chunk_id] = result
        
        # Merge keyword results
        for result in keyword_results:
            chunk_id = result.chunk.id
            if chunk_id in result_map:
                # Update keyword score
                result_map[chunk_id].keyword_score = result.keyword_score
            else:
                # Add new result
                result_map[chunk_id] = result
        
        # Calculate final scores
        for result in result_map.values():
            result.final_score = (
                self.vector_weight * result.vector_score +
                self.keyword_weight * result.keyword_score
            )
        
        # Sort by final score
        sorted_results = sorted(
            result_map.values(),
            key=lambda r: r.final_score,
            reverse=True
        )
        
        return sorted_results
    
    async def _rerank_results(
        self,
        query: str,
        results: List[SearchResult]
    ) -> List[SearchResult]:
        """Rerank results using cross-encoder"""
        if not results:
            return results
        
        # Prepare pairs for reranking
        pairs = [(query, result.chunk.content) for result in results]
        
        # Get reranking scores
        rerank_scores = self.reranker.predict(pairs)
        
        # Update results with rerank scores
        for result, rerank_score in zip(results, rerank_scores):
            result.rerank_score = float(rerank_score)
            
            # Combine all scores for final ranking
            result.final_score = (
                0.4 * result.vector_score +
                0.2 * result.keyword_score +
                0.4 * result.rerank_score
            )
        
        # Sort by final score
        sorted_results = sorted(
            results,
            key=lambda r: r.final_score,
            reverse=True
        )
        
        return sorted_results
    
    async def _load_existing_documents(self):
        """Load existing documents from vector store"""
        # This would load from persistent storage in production
        self.logger.info("Loading existing documents from vector store")
    
    async def update_document(
        self,
        document_id: str,
        content: Optional[str] = None,
        metadata: Optional[Dict[str, Any]] = None
    ):
        """Update existing document and re-chunk if needed"""
        if document_id not in self.documents:
            raise ValueError(f"Document {document_id} not found")
        
        document = self.documents[document_id]
        
        # Update content or metadata
        if content:
            document.content = content
        if metadata:
            document.metadata.update(metadata)
        
        document.updated_at = datetime.now()
        
        # Re-chunk and re-index if content changed
        if content:
            # Delete old chunks
            chunk_ids = [chunk.id for chunk in document.chunks]
            self.qdrant.delete(
                collection_name=self.collection_name,
                points_selector=chunk_ids
            )
            
            # Re-chunk
            chunks = await self._document_aware_chunking(document)
            document.chunks = chunks
            
            # Re-embed and store
            await self._embed_chunks(chunks)
            await self._store_chunks(chunks)
            
            # Update BM25 index
            self._build_bm25_index()
        
        self.logger.info(f"Document updated: {document_id}")
    
    def record_feedback(self, chunk_id: str, score: float):
        """Record user feedback for continuous improvement"""
        self.feedback_scores[chunk_id].append(score)
        
        # Update chunk metadata with average feedback
        if chunk_id in self.chunks:
            avg_score = np.mean(self.feedback_scores[chunk_id])
            self.chunks[chunk_id].metadata['avg_feedback_score'] = avg_score
    
    async def get_stats(self) -> Dict[str, Any]:
        """Get RAG system statistics"""
        collection_info = self.qdrant.get_collection(self.collection_name)
        
        return {
            'total_documents': len(self.documents),
            'total_chunks': len(self.chunks),
            'vector_store_points': collection_info.points_count,
            'embedding_dimension': self.embedder.get_sentence_embedding_dimension(),
            'avg_chunk_size': np.mean([
                len(chunk.content) for chunk in self.chunks.values()
            ]) if self.chunks else 0,
            'feedback_entries': sum(len(scores) for scores in self.feedback_scores.values())
        }


# Example usage
async def main():
    # Initialize enhanced RAG
    rag = EnhancedRAGSystem({
        'embedding_model': 'sentence-transformers/all-mpnet-base-v2',
        'reranking_model': 'cross-encoder/ms-marco-MiniLM-L-6-v2',
        'chunk_size': 512,
        'chunk_overlap': 128,
        'vector_weight': 0.7,
        'keyword_weight': 0.3
    })
    
    await rag.initialize()
    
    # Ingest a document
    document = await rag.ingest_document(
        content="""
        The Model Context Protocol (MCP) is an open standard that enables 
        seamless integration between LLM applications and external data sources 
        and tools. It provides a standardized way to connect AI models with 
        various contexts, improving their ability to access relevant information 
        and perform actions.
        """,
        metadata={
            'title': 'Introduction to MCP',
            'source': 'MCP Documentation',
            'tags': ['mcp', 'protocol', 'integration'],
            'category': 'technical'
        },
        chunking_strategy='document-aware'
    )
    
    print(f"Document ingested with {len(document.chunks)} chunks")
    
    # Perform hybrid search
    results = await rag.hybrid_search(
        query="What is Model Context Protocol?",
        limit=5,
        use_reranking=True
    )
    
    print(f"\nSearch results ({len(results)} found):")
    for i, result in enumerate(results):
        print(f"\n{i+1}. Score: {result.final_score:.3f}")
        print(f"   Content: {result.chunk.content[:200]}...")
        print(f"   Scores - Vector: {result.vector_score:.3f}, "
              f"Keyword: {result.keyword_score:.3f}, "
              f"Rerank: {result.rerank_score:.3f}")


if __name__ == "__main__":
    asyncio.run(main())