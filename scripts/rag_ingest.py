#!/usr/bin/env python3
"""
RAG Document Ingestion Script for MCP-RAG-V4
Ingests documents into Qdrant vector database with chunking and embedding
"""
import sys
import os
import asyncio
from pathlib import Path
from typing import List, Dict, Any
import logging
from datetime import datetime
import hashlib
import json

# Add parent directory to path for imports
sys.path.append(str(Path(__file__).parent.parent))

try:
    from qdrant_client import QdrantClient
    from qdrant_client.models import Distance, VectorParams, PointStruct
    from sentence_transformers import SentenceTransformer
    import PyPDF2
    import textract
except ImportError as e:
    print(f"❌ Missing dependencies: {e}")
    print("Install with: pip install qdrant-client sentence-transformers PyPDF2 textract")
    sys.exit(1)

# Setup logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

class RAGIngester:
    def __init__(self):
        # Load environment
        self.load_env()
        
        # Initialize Qdrant client
        self.qdrant_url = os.getenv("QDRANT_URL", "http://localhost:6333")
        self.collection_name = "mcp_rag_documents"
        
        try:
            self.client = QdrantClient(url=self.qdrant_url)
            logger.info(f"Connected to Qdrant at {self.qdrant_url}")
        except Exception as e:
            logger.error(f"Failed to connect to Qdrant: {e}")
            sys.exit(1)
        
        # Initialize embedding model
        self.model_name = os.getenv("EMBEDDING_MODEL", "sentence-transformers/all-MiniLM-L6-v2")
        try:
            self.embedding_model = SentenceTransformer(self.model_name)
            logger.info(f"Loaded embedding model: {self.model_name}")
        except Exception as e:
            logger.error(f"Failed to load embedding model: {e}")
            sys.exit(1)
        
        # Ensure collection exists
        self.ensure_collection()
    
    def load_env(self):
        """Load environment variables from .env file"""
        env_file = Path(__file__).parent.parent / ".env"
        if env_file.exists():
            with open(env_file) as f:
                for line in f:
                    line = line.strip()
                    if line and not line.startswith('#'):
                        key, value = line.split('=', 1)
                        os.environ[key] = value
    
    def ensure_collection(self):
        """Ensure the Qdrant collection exists"""
        try:
            collections = self.client.get_collections()
            collection_names = [col.name for col in collections.collections]
            
            if self.collection_name not in collection_names:
                logger.info(f"Creating collection: {self.collection_name}")
                self.client.create_collection(
                    collection_name=self.collection_name,
                    vectors_config=VectorParams(size=384, distance=Distance.COSINE)  # all-MiniLM-L6-v2 dimension
                )
                logger.info("Collection created successfully")
            else:
                logger.info(f"Collection {self.collection_name} already exists")
        except Exception as e:
            logger.error(f"Failed to create collection: {e}")
            sys.exit(1)
    
    def extract_text(self, file_path: Path) -> str:
        """Extract text from various file formats"""
        logger.info(f"Extracting text from {file_path}")
        
        try:
            if file_path.suffix.lower() == '.pdf':
                return self.extract_pdf_text(file_path)
            elif file_path.suffix.lower() in ['.txt', '.md', '.py', '.js', '.json', '.yaml', '.yml']:
                with open(file_path, 'r', encoding='utf-8') as f:
                    return f.read()
            else:
                # Try textract for other formats
                return textract.process(str(file_path)).decode('utf-8')
        except Exception as e:
            logger.error(f"Failed to extract text from {file_path}: {e}")
            return ""
    
    def extract_pdf_text(self, file_path: Path) -> str:
        """Extract text from PDF files"""
        text = ""
        try:
            with open(file_path, 'rb') as file:
                pdf_reader = PyPDF2.PdfReader(file)
                for page in pdf_reader.pages:
                    text += page.extract_text() + "\n"
        except Exception as e:
            logger.error(f"Failed to extract PDF text: {e}")
        return text
    
    def chunk_text(self, text: str, chunk_size: int = 1000, overlap: int = 200) -> List[str]:
        """Split text into overlapping chunks"""
        if len(text) <= chunk_size:
            return [text]
        
        chunks = []
        start = 0
        
        while start < len(text):
            end = start + chunk_size
            
            # Try to break at sentence boundaries
            if end < len(text):
                # Look for sentence endings near the chunk boundary
                for i in range(end, max(start + chunk_size - 100, start), -1):
                    if text[i] in '.!?':
                        end = i + 1
                        break
            
            chunk = text[start:end].strip()
            if chunk:
                chunks.append(chunk)
            
            start = end - overlap
            
            # Prevent infinite loops
            if start >= len(text):
                break
        
        return chunks
    
    def generate_embeddings(self, texts: List[str]) -> List[List[float]]:
        """Generate embeddings for text chunks"""
        logger.info(f"Generating embeddings for {len(texts)} chunks")
        try:
            embeddings = self.embedding_model.encode(texts, show_progress_bar=True)
            return embeddings.tolist()
        except Exception as e:
            logger.error(f"Failed to generate embeddings: {e}")
            return []
    
    def create_document_id(self, file_path: Path, chunk_index: int) -> str:
        """Create a unique document ID"""
        file_hash = hashlib.md5(str(file_path).encode()).hexdigest()
        return f"{file_hash}_{chunk_index}"
    
    def ingest_document(self, file_path: Path) -> bool:
        """Ingest a single document into the RAG system"""
        if not file_path.exists():
            logger.error(f"File not found: {file_path}")
            return False
        
        logger.info(f"Ingesting document: {file_path}")
        
        # Extract text
        text = self.extract_text(file_path)
        if not text.strip():
            logger.warning(f"No text extracted from {file_path}")
            return False
        
        # Chunk text
        chunks = self.chunk_text(text)
        logger.info(f"Created {len(chunks)} chunks")
        
        # Generate embeddings
        embeddings = self.generate_embeddings(chunks)
        if not embeddings:
            logger.error("Failed to generate embeddings")
            return False
        
        # Create points for Qdrant
        points = []
        for i, (chunk, embedding) in enumerate(zip(chunks, embeddings)):
            point_id = self.create_document_id(file_path, i)
            
            payload = {
                "text": chunk,
                "file_path": str(file_path),
                "file_name": file_path.name,
                "file_type": file_path.suffix.lower(),
                "chunk_index": i,
                "total_chunks": len(chunks),
                "ingested_at": datetime.now().isoformat(),
                "file_size": file_path.stat().st_size,
                "text_length": len(chunk)
            }
            
            points.append(PointStruct(
                id=point_id,
                vector=embedding,
                payload=payload
            ))
        
        # Upload to Qdrant
        try:
            self.client.upsert(
                collection_name=self.collection_name,
                points=points
            )
            logger.info(f"✅ Successfully ingested {len(points)} chunks from {file_path.name}")
            return True
        except Exception as e:
            logger.error(f"Failed to upload to Qdrant: {e}")
            return False
    
    def get_stats(self) -> Dict[str, Any]:
        """Get collection statistics"""
        try:
            collection_info = self.client.get_collection(self.collection_name)
            return {
                "total_points": collection_info.points_count,
                "collection_name": self.collection_name,
                "model": self.model_name,
                "qdrant_url": self.qdrant_url
            }
        except Exception as e:
            logger.error(f"Failed to get stats: {e}")
            return {}

def main():
    if len(sys.argv) != 2:
        print("Usage: python rag_ingest.py <file_path>")
        print("Example: python rag_ingest.py docs/architecture.pdf")
        sys.exit(1)
    
    file_path = Path(sys.argv[1])
    
    ingester = RAGIngester()
    
    print(f"📥 Starting ingestion of {file_path}")
    print("=" * 50)
    
    success = ingester.ingest_document(file_path)
    
    if success:
        stats = ingester.get_stats()
        print("\n📊 Collection Statistics:")
        print(f"  Total points: {stats.get('total_points', 'Unknown')}")
        print(f"  Model: {stats.get('model', 'Unknown')}")
        print(f"  Qdrant: {stats.get('qdrant_url', 'Unknown')}")
        print("\n✅ Document ingestion completed successfully!")
    else:
        print("\n❌ Document ingestion failed!")
        sys.exit(1)

if __name__ == "__main__":
    main()