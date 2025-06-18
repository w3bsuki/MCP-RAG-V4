#!/usr/bin/env python3
"""
Unit tests for Enhanced RAG System
Tests document chunking, hybrid search, and reranking functionality
"""
import asyncio
import pytest
import numpy as np
from unittest.mock import Mock, AsyncMock, patch, MagicMock
import json
from datetime import datetime

# Import the module to test
import sys
sys.path.append('.')
from enhanced_rag import (
    EnhancedRAGSystem, Document, DocumentChunk, SearchResult
)


@pytest.fixture
def rag_config():
    """RAG system configuration for testing"""
    return {
        'embedding_model': 'sentence-transformers/all-MiniLM-L6-v2',
        'reranking_model': 'cross-encoder/ms-marco-MiniLM-L-6-v2',
        'chunk_size': 100,  # Smaller for testing
        'chunk_overlap': 20,
        'vector_weight': 0.7,
        'keyword_weight': 0.3,
        'collection_name': 'test_collection'
    }


@pytest.fixture
def sample_document():
    """Sample document for testing"""
    content = """
    The Model Context Protocol (MCP) is an innovative standard for AI integration.
    It enables seamless communication between language models and external tools.
    
    MCP provides several key benefits:
    1. Standardized communication protocols
    2. Enhanced security through authentication
    3. Flexible tool integration
    
    Developers can use MCP to build powerful AI applications.
    The protocol supports various data sources and computation tools.
    This makes it ideal for building production-ready AI systems.
    """
    
    metadata = {
        'title': 'Introduction to MCP',
        'source': 'MCP Documentation',
        'tags': ['mcp', 'protocol', 'ai'],
        'category': 'technical'
    }
    
    return content, metadata


@pytest.fixture
def mock_embedder():
    """Mock sentence transformer"""
    embedder = Mock()
    embedder.encode = Mock(side_effect=lambda texts, **kwargs: 
        np.random.rand(len(texts) if isinstance(texts, list) else 1, 384)
    )
    embedder.get_sentence_embedding_dimension = Mock(return_value=384)
    return embedder


@pytest.fixture
def mock_reranker():
    """Mock cross encoder"""
    reranker = Mock()
    reranker.predict = Mock(side_effect=lambda pairs: 
        np.random.rand(len(pairs))
    )
    return reranker


@pytest.fixture
def mock_qdrant():
    """Mock Qdrant client"""
    client = Mock()
    
    # Mock collection operations
    collection = Mock()
    collection.name = 'test_collection'
    client.get_collections = Mock(return_value=Mock(collections=[collection]))
    
    client.create_collection = Mock()
    client.upsert = Mock()
    client.search = Mock(return_value=[
        Mock(id='chunk_1', score=0.9, payload={'content': 'Test content 1'}),
        Mock(id='chunk_2', score=0.8, payload={'content': 'Test content 2'})
    ])
    
    collection_info = Mock()
    collection_info.points_count = 100
    client.get_collection = Mock(return_value=collection_info)
    
    return client


@pytest.fixture
def mock_nlp():
    """Mock spaCy NLP"""
    nlp = Mock()
    
    def create_doc(text):
        sentences = text.split('.')
        sents = []
        for sent in sentences:
            if sent.strip():
                mock_sent = Mock()
                mock_sent.text = sent.strip() + '.'
                sents.append(mock_sent)
        
        doc = Mock()
        doc.sents = sents
        return doc
    
    nlp.side_effect = create_doc
    return nlp


class TestEnhancedRAGSystem:
    """Test Enhanced RAG System core functionality"""
    
    @patch('enhanced_rag.SentenceTransformer')
    @patch('enhanced_rag.CrossEncoder')
    @patch('enhanced_rag.QdrantClient')
    @patch('enhanced_rag.spacy.load')
    def test_initialization(self, mock_spacy, mock_qdrant_class, 
                          mock_cross_class, mock_sent_class, rag_config):
        """Test RAG system initialization"""
        # Setup mocks
        mock_sent_class.return_value = mock_embedder()
        mock_cross_class.return_value = mock_reranker()
        mock_qdrant_class.return_value = mock_qdrant()
        mock_spacy.return_value = mock_nlp()
        
        # Initialize system
        rag = EnhancedRAGSystem(rag_config)
        
        assert rag.chunk_size == 100
        assert rag.chunk_overlap == 20
        assert rag.vector_weight == 0.7
        assert rag.keyword_weight == 0.3
        
        # Verify model initialization
        mock_sent_class.assert_called_once()
        mock_cross_class.assert_called_once()
        mock_qdrant_class.assert_called_once()
    
    @pytest.mark.asyncio
    @patch('enhanced_rag.SentenceTransformer')
    @patch('enhanced_rag.CrossEncoder')
    @patch('enhanced_rag.QdrantClient')
    @patch('enhanced_rag.spacy.load')
    async def test_initialize_async(self, mock_spacy, mock_qdrant_class,
                                  mock_cross_class, mock_sent_class, rag_config):
        """Test async initialization"""
        # Setup mocks
        mock_sent_class.return_value = mock_embedder()
        mock_cross_class.return_value = mock_reranker()
        mock_qdrant_class.return_value = mock_qdrant()
        mock_spacy.return_value = mock_nlp()
        
        rag = EnhancedRAGSystem(rag_config)
        await rag.initialize()
        
        # Verify collection check
        rag.qdrant.get_collections.assert_called_once()


class TestDocumentChunking:
    """Test document chunking strategies"""
    
    @pytest.mark.asyncio
    @patch('enhanced_rag.SentenceTransformer')
    @patch('enhanced_rag.CrossEncoder')
    @patch('enhanced_rag.QdrantClient')
    @patch('enhanced_rag.spacy.load')
    async def test_document_aware_chunking(self, mock_spacy, mock_qdrant_class,
                                         mock_cross_class, mock_sent_class, 
                                         rag_config, sample_document):
        """Test document-aware chunking strategy"""
        # Setup mocks
        mock_sent_class.return_value = mock_embedder()
        mock_cross_class.return_value = mock_reranker()
        mock_qdrant_class.return_value = mock_qdrant()
        mock_spacy.return_value = mock_nlp()
        
        rag = EnhancedRAGSystem(rag_config)
        await rag.initialize()
        
        content, metadata = sample_document
        
        # Create document
        doc = Document(
            id='test_doc',
            content=content,
            metadata=metadata
        )
        
        # Chunk document
        chunks = await rag._document_aware_chunking(doc)
        
        assert len(chunks) > 0
        assert all(isinstance(chunk, DocumentChunk) for chunk in chunks)
        
        # Verify chunk properties
        for i, chunk in enumerate(chunks):
            assert chunk.document_id == 'test_doc'
            assert chunk.chunk_index == i
            assert chunk.total_chunks == len(chunks)
            assert len(chunk.content) > 0
            
            # Check context preservation
            if i > 0:
                assert chunk.context_before != ""
            if i < len(chunks) - 1:
                assert chunk.context_after != ""
    
    @pytest.mark.asyncio
    @patch('enhanced_rag.SentenceTransformer')
    @patch('enhanced_rag.CrossEncoder')
    @patch('enhanced_rag.QdrantClient')
    @patch('enhanced_rag.spacy.load')
    async def test_fixed_chunking(self, mock_spacy, mock_qdrant_class,
                                mock_cross_class, mock_sent_class,
                                rag_config, sample_document):
        """Test fixed-size chunking strategy"""
        # Setup mocks
        mock_sent_class.return_value = mock_embedder()
        mock_cross_class.return_value = mock_reranker()
        mock_qdrant_class.return_value = mock_qdrant()
        mock_spacy.return_value = mock_nlp()
        
        rag = EnhancedRAGSystem(rag_config)
        await rag.initialize()
        
        content, metadata = sample_document
        
        doc = Document(
            id='test_doc',
            content=content,
            metadata=metadata
        )
        
        # Chunk document with fixed strategy
        chunks = await rag._fixed_chunking(doc)
        
        assert len(chunks) > 0
        
        # Verify overlap between consecutive chunks
        for i in range(len(chunks) - 1):
            chunk1_end = chunks[i].content[-rag.chunk_overlap:]
            chunk2_start = chunks[i+1].content[:rag.chunk_overlap]
            # Some overlap should exist (not exact due to tokenization)
            assert len(chunk1_end) > 0 and len(chunk2_start) > 0
    
    @pytest.mark.asyncio
    @patch('enhanced_rag.SentenceTransformer')
    @patch('enhanced_rag.CrossEncoder')
    @patch('enhanced_rag.QdrantClient')
    @patch('enhanced_rag.spacy.load')
    async def test_semantic_chunking(self, mock_spacy, mock_qdrant_class,
                                   mock_cross_class, mock_sent_class,
                                   rag_config, sample_document):
        """Test semantic chunking strategy"""
        # Setup mocks with controlled embeddings
        embedder = mock_embedder()
        
        # Make embeddings that show semantic similarity
        def controlled_encode(texts, **kwargs):
            if isinstance(texts, list):
                embeddings = []
                for text in texts:
                    if 'MCP' in text or 'protocol' in text:
                        # Similar embeddings for MCP-related content
                        emb = np.ones(384) * 0.8
                    else:
                        # Different embeddings for other content
                        emb = np.ones(384) * 0.2
                    embeddings.append(emb + np.random.rand(384) * 0.1)
                return np.array(embeddings)
            else:
                return np.random.rand(384)
        
        embedder.encode = Mock(side_effect=controlled_encode)
        mock_sent_class.return_value = embedder
        mock_cross_class.return_value = mock_reranker()
        mock_qdrant_class.return_value = mock_qdrant()
        mock_spacy.return_value = mock_nlp()
        
        rag = EnhancedRAGSystem(rag_config)
        await rag.initialize()
        
        content, metadata = sample_document
        
        doc = Document(
            id='test_doc',
            content=content,
            metadata=metadata
        )
        
        # Chunk document with semantic strategy
        chunks = await rag._semantic_chunking(doc)
        
        assert len(chunks) > 0
        
        # Verify chunks are created based on semantic boundaries
        for chunk in chunks:
            assert chunk.metadata['chunking_strategy'] == 'semantic'


class TestDocumentIngestion:
    """Test document ingestion functionality"""
    
    @pytest.mark.asyncio
    @patch('enhanced_rag.SentenceTransformer')
    @patch('enhanced_rag.CrossEncoder')
    @patch('enhanced_rag.QdrantClient')
    @patch('enhanced_rag.spacy.load')
    async def test_ingest_document(self, mock_spacy, mock_qdrant_class,
                                 mock_cross_class, mock_sent_class,
                                 rag_config, sample_document):
        """Test complete document ingestion"""
        # Setup mocks
        mock_sent_class.return_value = mock_embedder()
        mock_cross_class.return_value = mock_reranker()
        mock_qdrant_class.return_value = mock_qdrant()
        mock_spacy.return_value = mock_nlp()
        
        rag = EnhancedRAGSystem(rag_config)
        await rag.initialize()
        
        content, metadata = sample_document
        
        # Ingest document
        document = await rag.ingest_document(
            content=content,
            metadata=metadata,
            chunking_strategy='document-aware'
        )
        
        assert document.id is not None
        assert len(document.chunks) > 0
        assert document.content == content
        assert document.metadata == metadata
        
        # Verify chunks were embedded
        for chunk in document.chunks:
            assert chunk.embedding is not None
            assert len(chunk.embedding) == 384
        
        # Verify Qdrant operations
        rag.qdrant.upsert.assert_called_once()
        call_args = rag.qdrant.upsert.call_args
        assert call_args[1]['collection_name'] == 'test_collection'
        assert len(call_args[1]['points']) == len(document.chunks)
    
    @pytest.mark.asyncio
    @patch('enhanced_rag.SentenceTransformer')
    @patch('enhanced_rag.CrossEncoder')
    @patch('enhanced_rag.QdrantClient')
    @patch('enhanced_rag.spacy.load')
    async def test_embed_chunks(self, mock_spacy, mock_qdrant_class,
                              mock_cross_class, mock_sent_class,
                              rag_config):
        """Test chunk embedding generation"""
        # Setup mocks
        embedder = mock_embedder()
        mock_sent_class.return_value = embedder
        mock_cross_class.return_value = mock_reranker()
        mock_qdrant_class.return_value = mock_qdrant()
        mock_spacy.return_value = mock_nlp()
        
        rag = EnhancedRAGSystem(rag_config)
        await rag.initialize()
        
        # Create test chunks
        chunks = [
            DocumentChunk(
                id=f'chunk_{i}',
                document_id='doc_1',
                content=f'Test chunk content {i}',
                metadata={},
                start_char=i*100,
                end_char=(i+1)*100,
                chunk_index=i,
                total_chunks=3
            )
            for i in range(3)
        ]
        
        # Embed chunks
        await rag._embed_chunks(chunks)
        
        # Verify embeddings
        for chunk in chunks:
            assert chunk.embedding is not None
            assert len(chunk.embedding) == 384
        
        # Verify embedder was called correctly
        embedder.encode.assert_called_once()
        texts = embedder.encode.call_args[0][0]
        assert len(texts) == 3
        assert all(f'Test chunk content {i}' in texts[i] for i in range(3))


class TestHybridSearch:
    """Test hybrid search functionality"""
    
    @pytest.mark.asyncio
    @patch('enhanced_rag.SentenceTransformer')
    @patch('enhanced_rag.CrossEncoder')
    @patch('enhanced_rag.QdrantClient')
    @patch('enhanced_rag.spacy.load')
    async def test_vector_search(self, mock_spacy, mock_qdrant_class,
                               mock_cross_class, mock_sent_class,
                               rag_config):
        """Test vector similarity search"""
        # Setup mocks
        embedder = mock_embedder()
        mock_sent_class.return_value = embedder
        mock_cross_class.return_value = mock_reranker()
        
        # Mock Qdrant search results
        qdrant = mock_qdrant()
        qdrant.search = Mock(return_value=[
            Mock(id='chunk_1', score=0.95, payload={
                'content': 'MCP enables AI integration',
                'metadata': {'source': 'doc1'}
            }),
            Mock(id='chunk_2', score=0.85, payload={
                'content': 'Protocol for communication',
                'metadata': {'source': 'doc2'}
            })
        ])
        mock_qdrant_class.return_value = qdrant
        mock_spacy.return_value = mock_nlp()
        
        rag = EnhancedRAGSystem(rag_config)
        await rag.initialize()
        
        # Add chunks to memory
        rag.chunks = {
            'chunk_1': DocumentChunk(
                id='chunk_1',
                document_id='doc_1',
                content='MCP enables AI integration',
                metadata={'source': 'doc1'},
                start_char=0,
                end_char=100,
                chunk_index=0,
                total_chunks=1
            ),
            'chunk_2': DocumentChunk(
                id='chunk_2',
                document_id='doc_2',
                content='Protocol for communication',
                metadata={'source': 'doc2'},
                start_char=0,
                end_char=100,
                chunk_index=0,
                total_chunks=1
            )
        }
        
        # Perform vector search
        results = await rag._vector_search('MCP integration', limit=10)
        
        assert len(results) == 2
        assert results[0].vector_score == 0.95
        assert results[1].vector_score == 0.85
        assert results[0].chunk.id == 'chunk_1'
        
        # Verify embedder and Qdrant calls
        embedder.encode.assert_called_with('MCP integration')
        qdrant.search.assert_called_once()
    
    @pytest.mark.asyncio
    @patch('enhanced_rag.SentenceTransformer')
    @patch('enhanced_rag.CrossEncoder')
    @patch('enhanced_rag.QdrantClient')
    @patch('enhanced_rag.spacy.load')
    @patch('enhanced_rag.BM25Okapi')
    async def test_keyword_search(self, mock_bm25_class, mock_spacy,
                                mock_qdrant_class, mock_cross_class,
                                mock_sent_class, rag_config):
        """Test BM25 keyword search"""
        # Setup mocks
        mock_sent_class.return_value = mock_embedder()
        mock_cross_class.return_value = mock_reranker()
        mock_qdrant_class.return_value = mock_qdrant()
        mock_spacy.return_value = mock_nlp()
        
        # Mock BM25
        bm25 = Mock()
        bm25.get_scores = Mock(return_value=np.array([0.5, 0.8, 0.3]))
        mock_bm25_class.return_value = bm25
        
        rag = EnhancedRAGSystem(rag_config)
        await rag.initialize()
        
        # Setup chunks and BM25 index
        rag.chunks = {
            'chunk_0': DocumentChunk(
                id='chunk_0', document_id='doc_0',
                content='Content 0', metadata={},
                start_char=0, end_char=100,
                chunk_index=0, total_chunks=1
            ),
            'chunk_1': DocumentChunk(
                id='chunk_1', document_id='doc_1',
                content='MCP protocol', metadata={},
                start_char=0, end_char=100,
                chunk_index=0, total_chunks=1
            ),
            'chunk_2': DocumentChunk(
                id='chunk_2', document_id='doc_2',
                content='Content 2', metadata={},
                start_char=0, end_char=100,
                chunk_index=0, total_chunks=1
            )
        }
        rag.bm25_chunk_ids = ['chunk_0', 'chunk_1', 'chunk_2']
        rag.bm25_index = bm25
        
        # Perform keyword search
        results = await rag._keyword_search('MCP protocol', limit=10)
        
        assert len(results) > 0
        # chunk_1 should have highest score (0.8)
        assert results[0].chunk.id == 'chunk_1'
        assert results[0].keyword_score > 0
    
    @pytest.mark.asyncio
    @patch('enhanced_rag.SentenceTransformer')
    @patch('enhanced_rag.CrossEncoder')
    @patch('enhanced_rag.QdrantClient')
    @patch('enhanced_rag.spacy.load')
    async def test_hybrid_search_with_reranking(self, mock_spacy,
                                              mock_qdrant_class,
                                              mock_cross_class,
                                              mock_sent_class,
                                              rag_config):
        """Test complete hybrid search with reranking"""
        # Setup mocks
        embedder = mock_embedder()
        mock_sent_class.return_value = embedder
        
        # Mock reranker with controlled scores
        reranker = Mock()
        reranker.predict = Mock(return_value=np.array([0.9, 0.7]))
        mock_cross_class.return_value = reranker
        
        # Mock Qdrant
        qdrant = mock_qdrant()
        qdrant.search = Mock(return_value=[
            Mock(id='chunk_1', score=0.8, payload={
                'content': 'MCP enables integration'
            }),
            Mock(id='chunk_2', score=0.7, payload={
                'content': 'Protocol standard'
            })
        ])
        mock_qdrant_class.return_value = qdrant
        mock_spacy.return_value = mock_nlp()
        
        rag = EnhancedRAGSystem(rag_config)
        await rag.initialize()
        
        # Setup chunks
        rag.chunks = {
            'chunk_1': DocumentChunk(
                id='chunk_1', document_id='doc_1',
                content='MCP enables integration', metadata={},
                start_char=0, end_char=100,
                chunk_index=0, total_chunks=1
            ),
            'chunk_2': DocumentChunk(
                id='chunk_2', document_id='doc_2',
                content='Protocol standard', metadata={},
                start_char=0, end_char=100,
                chunk_index=0, total_chunks=1
            )
        }
        
        # Mock BM25 to return no results
        rag._build_bm25_index = Mock()
        rag.bm25_index = None
        
        # Perform hybrid search
        results = await rag.hybrid_search(
            query='MCP integration',
            limit=5,
            use_reranking=True
        )
        
        assert len(results) <= 5
        
        # Verify reranker was called
        if len(results) > 0:
            reranker.predict.assert_called_once()
            
            # Check final scores include reranking
            for result in results:
                assert result.rerank_score > 0
                assert result.final_score > 0
    
    def test_combine_search_results(self, rag_config):
        """Test combining vector and keyword search results"""
        rag = EnhancedRAGSystem(rag_config)
        
        # Create mock chunks
        chunk1 = DocumentChunk(
            id='chunk_1', document_id='doc_1',
            content='Content 1', metadata={},
            start_char=0, end_char=100,
            chunk_index=0, total_chunks=1
        )
        chunk2 = DocumentChunk(
            id='chunk_2', document_id='doc_2',
            content='Content 2', metadata={},
            start_char=0, end_char=100,
            chunk_index=0, total_chunks=1
        )
        
        # Create search results
        vector_results = [
            SearchResult(chunk=chunk1, vector_score=0.9),
            SearchResult(chunk=chunk2, vector_score=0.7)
        ]
        
        keyword_results = [
            SearchResult(chunk=chunk1, vector_score=0.0, keyword_score=0.6),
            SearchResult(chunk=DocumentChunk(
                id='chunk_3', document_id='doc_3',
                content='Content 3', metadata={},
                start_char=0, end_char=100,
                chunk_index=0, total_chunks=1
            ), vector_score=0.0, keyword_score=0.8)
        ]
        
        # Combine results
        combined = rag._combine_search_results(vector_results, keyword_results)
        
        assert len(combined) == 3  # chunk_1, chunk_2, chunk_3
        
        # Check chunk_1 has both scores
        chunk1_result = next(r for r in combined if r.chunk.id == 'chunk_1')
        assert chunk1_result.vector_score == 0.9
        assert chunk1_result.keyword_score == 0.6
        assert chunk1_result.final_score == (0.7 * 0.9 + 0.3 * 0.6)
        
        # Verify sorting by final score
        assert combined[0].final_score >= combined[1].final_score


class TestDocumentUpdate:
    """Test document update functionality"""
    
    @pytest.mark.asyncio
    @patch('enhanced_rag.SentenceTransformer')
    @patch('enhanced_rag.CrossEncoder')
    @patch('enhanced_rag.QdrantClient')
    @patch('enhanced_rag.spacy.load')
    async def test_update_document(self, mock_spacy, mock_qdrant_class,
                                 mock_cross_class, mock_sent_class,
                                 rag_config, sample_document):
        """Test updating existing document"""
        # Setup mocks
        mock_sent_class.return_value = mock_embedder()
        mock_cross_class.return_value = mock_reranker()
        mock_qdrant_class.return_value = mock_qdrant()
        mock_spacy.return_value = mock_nlp()
        
        rag = EnhancedRAGSystem(rag_config)
        await rag.initialize()
        
        content, metadata = sample_document
        
        # First ingest document
        document = await rag.ingest_document(content, metadata)
        original_chunks = len(document.chunks)
        
        # Update document content
        new_content = "Updated content for MCP protocol documentation."
        await rag.update_document(
            document_id=document.id,
            content=new_content
        )
        
        # Verify document was updated
        updated_doc = rag.documents[document.id]
        assert updated_doc.content == new_content
        assert updated_doc.updated_at > updated_doc.created_at
        
        # Verify old chunks were deleted
        rag.qdrant.delete.assert_called_once()
        
        # Verify new chunks were created and stored
        assert rag.qdrant.upsert.call_count == 2  # Original + update
    
    def test_record_feedback(self, rag_config):
        """Test feedback recording functionality"""
        rag = EnhancedRAGSystem(rag_config)
        
        # Create test chunk
        chunk = DocumentChunk(
            id='test_chunk',
            document_id='doc_1',
            content='Test content',
            metadata={},
            start_char=0,
            end_char=100,
            chunk_index=0,
            total_chunks=1
        )
        rag.chunks['test_chunk'] = chunk
        
        # Record feedback
        rag.record_feedback('test_chunk', 0.8)
        rag.record_feedback('test_chunk', 0.9)
        rag.record_feedback('test_chunk', 0.7)
        
        # Verify feedback storage
        assert len(rag.feedback_scores['test_chunk']) == 3
        assert chunk.metadata['avg_feedback_score'] == pytest.approx(0.8)


class TestRAGStats:
    """Test RAG system statistics"""
    
    @pytest.mark.asyncio
    @patch('enhanced_rag.SentenceTransformer')
    @patch('enhanced_rag.CrossEncoder')
    @patch('enhanced_rag.QdrantClient')
    @patch('enhanced_rag.spacy.load')
    async def test_get_stats(self, mock_spacy, mock_qdrant_class,
                           mock_cross_class, mock_sent_class,
                           rag_config):
        """Test getting system statistics"""
        # Setup mocks
        embedder = mock_embedder()
        mock_sent_class.return_value = embedder
        mock_cross_class.return_value = mock_reranker()
        
        # Mock Qdrant collection info
        collection_info = Mock()
        collection_info.points_count = 50
        qdrant = mock_qdrant()
        qdrant.get_collection = Mock(return_value=collection_info)
        mock_qdrant_class.return_value = qdrant
        mock_spacy.return_value = mock_nlp()
        
        rag = EnhancedRAGSystem(rag_config)
        await rag.initialize()
        
        # Add some test data
        rag.documents = {
            'doc1': Mock(),
            'doc2': Mock()
        }
        rag.chunks = {
            'chunk1': DocumentChunk(
                id='chunk1', document_id='doc1',
                content='A' * 100, metadata={},
                start_char=0, end_char=100,
                chunk_index=0, total_chunks=1
            ),
            'chunk2': DocumentChunk(
                id='chunk2', document_id='doc1',
                content='B' * 200, metadata={},
                start_char=100, end_char=300,
                chunk_index=1, total_chunks=2
            )
        }
        rag.feedback_scores = {
            'chunk1': [0.8, 0.9],
            'chunk2': [0.7]
        }
        
        # Get stats
        stats = await rag.get_stats()
        
        assert stats['total_documents'] == 2
        assert stats['total_chunks'] == 2
        assert stats['vector_store_points'] == 50
        assert stats['embedding_dimension'] == 384
        assert stats['avg_chunk_size'] == 150  # (100 + 200) / 2
        assert stats['feedback_entries'] == 3


# Integration test for complete workflow
class TestIntegrationWorkflow:
    """Test complete RAG workflow"""
    
    @pytest.mark.asyncio
    @patch('enhanced_rag.SentenceTransformer')
    @patch('enhanced_rag.CrossEncoder')
    @patch('enhanced_rag.QdrantClient')
    @patch('enhanced_rag.spacy.load')
    async def test_complete_rag_workflow(self, mock_spacy, mock_qdrant_class,
                                       mock_cross_class, mock_sent_class,
                                       rag_config, sample_document):
        """Test complete workflow: ingest -> search -> feedback"""
        # Setup mocks
        embedder = mock_embedder()
        mock_sent_class.return_value = embedder
        
        reranker = Mock()
        reranker.predict = Mock(return_value=np.array([0.9]))
        mock_cross_class.return_value = reranker
        
        qdrant = mock_qdrant()
        mock_qdrant_class.return_value = qdrant
        mock_spacy.return_value = mock_nlp()
        
        rag = EnhancedRAGSystem(rag_config)
        await rag.initialize()
        
        # 1. Ingest document
        content, metadata = sample_document
        document = await rag.ingest_document(
            content=content,
            metadata=metadata,
            chunking_strategy='document-aware'
        )
        
        assert document.id in rag.documents
        assert len(document.chunks) > 0
        
        # 2. Perform search
        # Mock vector search to return ingested chunks
        qdrant.search = Mock(return_value=[
            Mock(
                id=document.chunks[0].id,
                score=0.85,
                payload={
                    'content': document.chunks[0].content,
                    'metadata': document.chunks[0].metadata
                }
            )
        ])
        
        results = await rag.hybrid_search(
            query="What is MCP?",
            limit=5,
            use_reranking=True
        )
        
        # Should get results
        assert len(results) > 0
        
        # 3. Record feedback
        if results:
            chunk_id = results[0].chunk.id
            rag.record_feedback(chunk_id, 0.9)
            
            # Verify feedback was recorded
            assert len(rag.feedback_scores[chunk_id]) == 1


# Pytest configuration
if __name__ == "__main__":
    pytest.main([__file__, "-v", "--asyncio-mode=auto"])