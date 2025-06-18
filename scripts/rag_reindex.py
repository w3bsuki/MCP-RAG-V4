#!/usr/bin/env python3
"""
RAG Reindex Script for MCP-RAG-V4
Rebuilds the entire RAG index by re-ingesting all documents
"""
import sys
import os
from pathlib import Path
import logging
from typing import List
import time

# Add parent directory to path for imports
sys.path.append(str(Path(__file__).parent.parent))

from rag_ingest import RAGIngester

# Setup logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

class RAGReindexer:
    def __init__(self):
        self.ingester = RAGIngester()
        self.supported_extensions = {'.pdf', '.txt', '.md', '.py', '.js', '.json', '.yaml', '.yml', '.doc', '.docx'}
        
        # Document directories to scan
        self.document_paths = [
            Path("docs"),
            Path("perfect-claude-env/rag-system/knowledge"),
            Path("shared/specifications"),
            Path("README.md"),
            Path("CLAUDE.md"),
            Path("HOW_TO_USE.md")
        ]
    
    def find_documents(self) -> List[Path]:
        """Find all supported documents in the configured paths"""
        documents = []
        
        for path in self.document_paths:
            if not path.exists():
                logger.warning(f"Path does not exist: {path}")
                continue
            
            if path.is_file() and path.suffix.lower() in self.supported_extensions:
                documents.append(path)
            elif path.is_dir():
                for file_path in path.rglob("*"):
                    if file_path.is_file() and file_path.suffix.lower() in self.supported_extensions:
                        documents.append(file_path)
        
        return documents
    
    def clear_collection(self):
        """Clear the existing collection"""
        logger.info("Clearing existing collection...")
        try:
            # Delete and recreate collection
            self.ingester.client.delete_collection(self.ingester.collection_name)
            self.ingester.ensure_collection()
            logger.info("Collection cleared successfully")
        except Exception as e:
            logger.error(f"Failed to clear collection: {e}")
            raise
    
    def reindex_all(self, clear_first: bool = True) -> bool:
        """Reindex all documents"""
        logger.info("🔄 Starting RAG reindexing process")
        logger.info("=" * 50)
        
        # Find all documents
        documents = self.find_documents()
        logger.info(f"Found {len(documents)} documents to index")
        
        if not documents:
            logger.warning("No documents found to index")
            return True
        
        # Clear existing index if requested
        if clear_first:
            self.clear_collection()
        
        # Ingest documents
        successful = 0
        failed = 0
        start_time = time.time()
        
        for i, doc_path in enumerate(documents, 1):
            logger.info(f"\n📄 Processing ({i}/{len(documents)}): {doc_path}")
            
            try:
                if self.ingester.ingest_document(doc_path):
                    successful += 1
                    logger.info(f"✅ Successfully indexed: {doc_path.name}")
                else:
                    failed += 1
                    logger.error(f"❌ Failed to index: {doc_path.name}")
            except Exception as e:
                failed += 1
                logger.error(f"❌ Error indexing {doc_path.name}: {e}")
        
        # Summary
        elapsed_time = time.time() - start_time
        logger.info("\n" + "=" * 50)
        logger.info("📊 Reindexing Summary")
        logger.info("=" * 50)
        logger.info(f"  Total documents: {len(documents)}")
        logger.info(f"  Successfully indexed: {successful}")
        logger.info(f"  Failed: {failed}")
        logger.info(f"  Time elapsed: {elapsed_time:.2f} seconds")
        
        # Get final stats
        stats = self.ingester.get_stats()
        if stats:
            logger.info(f"  Total points in collection: {stats.get('total_points', 'Unknown')}")
        
        return failed == 0

def main():
    """Main entry point"""
    reindexer = RAGReindexer()
    
    # Check for command line arguments
    clear_first = True
    if len(sys.argv) > 1 and sys.argv[1] == "--append":
        clear_first = False
        print("📝 Appending to existing index (not clearing first)")
    else:
        print("🔄 Rebuilding entire index (clearing first)")
    
    print("Starting RAG reindexing process...")
    print("This may take several minutes depending on document count and size.")
    print("")
    
    try:
        success = reindexer.reindex_all(clear_first=clear_first)
        
        if success:
            print("\n🎉 RAG reindexing completed successfully!")
            print("\nNext steps:")
            print("  • Test search: make rag-search QUERY='your search term'")
            print("  • Check status: make rag-status")
            print("  • View in Qdrant UI: http://localhost:6333/dashboard")
        else:
            print("\n⚠️  RAG reindexing completed with some failures!")
            print("Check the logs above for details on failed documents.")
            sys.exit(1)
            
    except KeyboardInterrupt:
        print("\n⚠️  Reindexing interrupted by user")
        sys.exit(1)
    except Exception as e:
        print(f"\n❌ Reindexing failed: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()