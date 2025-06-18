#!/usr/bin/env python3
"""
RAG Status Script for MCP-RAG-V4
Shows statistics and health of the RAG system
"""
import sys
import os
from pathlib import Path
import logging
from typing import Dict, Any, List
from datetime import datetime
import json

# Add parent directory to path for imports
sys.path.append(str(Path(__file__).parent.parent))

try:
    from qdrant_client import QdrantClient
    from qdrant_client.models import Filter, FieldCondition, MatchValue
except ImportError as e:
    print(f"❌ Missing dependencies: {e}")
    print("Install with: pip install qdrant-client")
    sys.exit(1)

# Setup logging
logging.basicConfig(level=logging.WARNING)  # Reduce log noise
logger = logging.getLogger(__name__)

class RAGStatusChecker:
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
    
    def check_qdrant_health(self) -> Dict[str, Any]:
        """Check Qdrant server health"""
        try:
            collections = self.client.get_collections()
            return {
                "status": "healthy",
                "collections_count": len(collections.collections),
                "collections": [col.name for col in collections.collections]
            }
        except Exception as e:
            return {
                "status": "unhealthy",
                "error": str(e)
            }
    
    def get_collection_info(self) -> Dict[str, Any]:
        """Get detailed collection information"""
        try:
            collection_info = self.client.get_collection(self.collection_name)
            return {
                "exists": True,
                "points_count": collection_info.points_count,
                "vectors_count": collection_info.vectors_count if hasattr(collection_info, 'vectors_count') else collection_info.points_count,
                "indexed_vectors_count": collection_info.indexed_vectors_count if hasattr(collection_info, 'indexed_vectors_count') else None,
                "config": {
                    "vector_size": collection_info.config.params.vectors.size,
                    "distance": collection_info.config.params.vectors.distance.value
                }
            }
        except Exception as e:
            if "doesn't exist" in str(e).lower():
                return {"exists": False}
            return {"exists": False, "error": str(e)}
    
    def get_document_stats(self) -> Dict[str, Any]:
        """Get statistics about indexed documents"""
        try:
            # Get all points to analyze
            scroll_result = self.client.scroll(
                collection_name=self.collection_name,
                limit=10000,  # Adjust if you have more documents
                with_payload=True,
                with_vectors=False
            )
            
            points = scroll_result[0]
            
            if not points:
                return {"total_chunks": 0, "unique_files": 0, "file_types": {}, "files": []}
            
            # Analyze document statistics
            files_info = {}
            file_types = {}
            total_chunks = len(points)
            
            for point in points:
                payload = point.payload
                file_path = payload.get("file_path", "unknown")
                file_name = payload.get("file_name", "unknown")
                file_type = payload.get("file_type", "unknown")
                chunk_index = payload.get("chunk_index", 0)
                total_file_chunks = payload.get("total_chunks", 1)
                ingested_at = payload.get("ingested_at", "unknown")
                
                # Track file info
                if file_path not in files_info:
                    files_info[file_path] = {
                        "name": file_name,
                        "type": file_type,
                        "total_chunks": total_file_chunks,
                        "chunks_found": 0,
                        "ingested_at": ingested_at
                    }
                
                files_info[file_path]["chunks_found"] += 1
                
                # Track file types
                file_types[file_type] = file_types.get(file_type, 0) + 1
            
            # Format file information
            files_list = []
            for file_path, info in files_info.items():
                files_list.append({
                    "path": file_path,
                    "name": info["name"],
                    "type": info["type"],
                    "chunks": info["chunks_found"],
                    "expected_chunks": info["total_chunks"],
                    "complete": info["chunks_found"] == info["total_chunks"],
                    "ingested_at": info["ingested_at"]
                })
            
            # Sort by ingestion date (newest first)
            files_list.sort(key=lambda x: x["ingested_at"], reverse=True)
            
            return {
                "total_chunks": total_chunks,
                "unique_files": len(files_info),
                "file_types": file_types,
                "files": files_list
            }
            
        except Exception as e:
            return {"error": str(e)}
    
    def get_recent_activity(self) -> List[Dict[str, Any]]:
        """Get recent ingestion activity"""
        try:
            # Get recent points sorted by ingestion date
            scroll_result = self.client.scroll(
                collection_name=self.collection_name,
                limit=100,
                with_payload=True,
                with_vectors=False
            )
            
            points = scroll_result[0]
            
            # Group by file and get latest ingestion per file
            file_activity = {}
            for point in points:
                payload = point.payload
                file_path = payload.get("file_path", "unknown")
                ingested_at = payload.get("ingested_at", "unknown")
                
                if file_path not in file_activity or ingested_at > file_activity[file_path]["ingested_at"]:
                    file_activity[file_path] = {
                        "file_name": payload.get("file_name", "unknown"),
                        "file_path": file_path,
                        "ingested_at": ingested_at,
                        "file_type": payload.get("file_type", "unknown")
                    }
            
            # Sort by ingestion date and return top 10
            recent_files = list(file_activity.values())
            recent_files.sort(key=lambda x: x["ingested_at"], reverse=True)
            
            return recent_files[:10]
            
        except Exception as e:
            return []
    
    def display_status(self):
        """Display comprehensive RAG system status"""
        print("📊 MCP-RAG-V4 System Status")
        print("=" * 50)
        print("")
        
        # Qdrant Health
        print("🔵 Qdrant Server")
        print("-" * 20)
        health = self.check_qdrant_health()
        if health["status"] == "healthy":
            print("  Status: ✅ Healthy")
            print(f"  URL: {self.qdrant_url}")
            print(f"  Collections: {health['collections_count']}")
            if health["collections"]:
                for col in health["collections"]:
                    print(f"    • {col}")
        else:
            print("  Status: ❌ Unhealthy")
            print(f"  Error: {health.get('error', 'Unknown error')}")
            return
        
        print("")
        
        # Collection Info
        print("📚 Document Collection")
        print("-" * 25)
        collection_info = self.get_collection_info()
        if collection_info["exists"]:
            print(f"  Collection: ✅ {self.collection_name}")
            print(f"  Total points: {collection_info['points_count']:,}")
            print(f"  Vector size: {collection_info['config']['vector_size']}")
            print(f"  Distance metric: {collection_info['config']['distance']}")
        else:
            print(f"  Collection: ❌ {self.collection_name} does not exist")
            print("  Run: make rag-reindex to create and populate")
            return
        
        print("")
        
        # Document Statistics
        print("📄 Document Statistics")
        print("-" * 25)
        doc_stats = self.get_document_stats()
        if "error" not in doc_stats:
            print(f"  Total chunks: {doc_stats['total_chunks']:,}")
            print(f"  Unique files: {doc_stats['unique_files']}")
            print("")
            print("  File types:")
            for file_type, count in sorted(doc_stats['file_types'].items()):
                print(f"    • {file_type}: {count} chunks")
            
            print("")
            print("  Recent files:")
            for file_info in doc_stats['files'][:5]:  # Show top 5
                status = "✅" if file_info['complete'] else "⚠️"
                print(f"    {status} {file_info['name']} ({file_info['chunks']} chunks)")
        else:
            print(f"  Error: {doc_stats['error']}")
        
        print("")
        
        # Recent Activity
        print("⏰ Recent Activity")
        print("-" * 20)
        recent_activity = self.get_recent_activity()
        if recent_activity:
            for activity in recent_activity[:5]:  # Show top 5
                ingested_date = activity['ingested_at'][:10] if len(activity['ingested_at']) > 10 else activity['ingested_at']
                print(f"  📄 {activity['file_name']} ({ingested_date})")
        else:
            print("  No recent activity found")
        
        print("")
        
        # Quick Actions
        print("🔧 Quick Actions")
        print("-" * 15)
        print("  Search documents:    make rag-search QUERY='your search'")
        print("  Add new document:    make rag-ingest FILE=path/to/doc")
        print("  Rebuild index:       make rag-reindex")
        print("  View in browser:     http://localhost:6333/dashboard")
        
        print("")

def main():
    """Main entry point"""
    checker = RAGStatusChecker()
    checker.display_status()

if __name__ == "__main__":
    main()