#!/usr/bin/env python3
"""
RAG Search Script for MCP-RAG-V4
Search the RAG system using semantic similarity
"""
import sys
import os
from pathlib import Path
import logging
from typing import List, Dict, Any
import json

# Add parent directory to path for imports
sys.path.append(str(Path(__file__).parent.parent))

try:
    from qdrant_client import QdrantClient
    from sentence_transformers import SentenceTransformer
except ImportError as e:
    print(f"❌ Missing dependencies: {e}")
    print("Install with: pip install qdrant-client sentence-transformers")
    sys.exit(1)

# Setup logging
logging.basicConfig(level=logging.WARNING)  # Reduce log noise for search
logger = logging.getLogger(__name__)

class RAGSearcher:
    def __init__(self):
        # Load environment
        self.load_env()
        
        # Initialize Qdrant client
        self.qdrant_url = os.getenv("QDRANT_URL", "http://localhost:6333")
        self.collection_name = "mcp_rag_documents"
        
        try:
            self.client = QdrantClient(url=self.qdrant_url)
        except Exception as e:
            print(f"❌ Failed to connect to Qdrant at {self.qdrant_url}: {e}")
            sys.exit(1)
        
        # Initialize embedding model
        self.model_name = os.getenv("EMBEDDING_MODEL", "sentence-transformers/all-MiniLM-L6-v2")
        try:
            self.embedding_model = SentenceTransformer(self.model_name)
        except Exception as e:
            print(f"❌ Failed to load embedding model: {e}")
            sys.exit(1)
    
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
    
    def search(self, query: str, limit: int = 5, score_threshold: float = 0.5) -> List[Dict[str, Any]]:
        """Search the RAG system"""
        try:
            # Generate query embedding
            query_embedding = self.embedding_model.encode([query])[0].tolist()
            
            # Search in Qdrant
            search_result = self.client.search(
                collection_name=self.collection_name,
                query_vector=query_embedding,
                limit=limit,
                score_threshold=score_threshold
            )
            
            # Format results
            results = []
            for hit in search_result:
                result = {
                    "score": hit.score,
                    "text": hit.payload.get("text", ""),
                    "file_name": hit.payload.get("file_name", "unknown"),
                    "file_path": hit.payload.get("file_path", ""),
                    "chunk_index": hit.payload.get("chunk_index", 0),
                    "total_chunks": hit.payload.get("total_chunks", 1),
                    "file_type": hit.payload.get("file_type", ""),
                    "ingested_at": hit.payload.get("ingested_at", ""),
                    "text_length": hit.payload.get("text_length", 0)
                }
                results.append(result)
            
            return results
            
        except Exception as e:
            print(f"❌ Search failed: {e}")
            return []
    
    def format_results(self, results: List[Dict[str, Any]], query: str) -> str:
        """Format search results for display"""
        if not results:
            return f"🔍 No results found for query: '{query}'"
        
        output = [f"🔍 Search Results for: '{query}'"]
        output.append("=" * 60)
        output.append(f"Found {len(results)} relevant chunks:")
        output.append("")
        
        for i, result in enumerate(results, 1):
            score_percentage = result["score"] * 100
            
            output.append(f"📄 Result {i} (Score: {score_percentage:.1f}%)")
            output.append(f"   File: {result['file_name']}")
            output.append(f"   Path: {result['file_path']}")
            output.append(f"   Chunk: {result['chunk_index'] + 1}/{result['total_chunks']}")
            output.append(f"   Type: {result['file_type']}")
            output.append(f"   Length: {result['text_length']} chars")
            output.append("")
            
            # Show text preview (first 300 chars)
            text = result["text"]
            if len(text) > 300:
                text = text[:300] + "..."
            
            # Highlight query terms (simple approach)
            query_words = query.lower().split()
            for word in query_words:
                if len(word) > 2:  # Only highlight words longer than 2 chars
                    text = text.replace(word, f"**{word}**")
                    text = text.replace(word.capitalize(), f"**{word.capitalize()}**")
                    text = text.replace(word.upper(), f"**{word.upper()}**")
            
            output.append(f"   Text: {text}")
            output.append("")
            output.append("-" * 60)
            output.append("")
        
        return "\n".join(output)
    
    def search_and_display(self, query: str, limit: int = 5, score_threshold: float = 0.5):
        """Search and display results"""
        print(f"🔍 Searching for: '{query}'")
        print("Generating embeddings and searching...")
        print("")
        
        results = self.search(query, limit, score_threshold)
        formatted_results = self.format_results(results, query)
        print(formatted_results)
        
        if results:
            print("\n💡 Tips:")
            print("  • Adjust search with: make rag-search QUERY='new search term'")
            print("  • Use MCP vector-search tool in Claude-Code for agent access")
            print("  • Add more documents with: make rag-ingest FILE=path/to/doc")

def main():
    """Main entry point"""
    if len(sys.argv) < 2:
        print("❌ Usage: python rag_search.py <search_query> [limit] [score_threshold]")
        print("Examples:")
        print("  python rag_search.py 'architecture patterns'")
        print("  python rag_search.py 'MCP server configuration' 10 0.3")
        sys.exit(1)
    
    query = sys.argv[1]
    limit = int(sys.argv[2]) if len(sys.argv) > 2 else 5
    score_threshold = float(sys.argv[3]) if len(sys.argv) > 3 else 0.5
    
    searcher = RAGSearcher()
    searcher.search_and_display(query, limit, score_threshold)

if __name__ == "__main__":
    main()