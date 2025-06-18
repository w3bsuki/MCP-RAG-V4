#!/usr/bin/env python3
"""
Dynamic Knowledge Ingestion with File Watcher
Automatically ingests new/modified documents into RAG system
"""
import asyncio
import os
from pathlib import Path
from typing import Set, Dict, Any
from datetime import datetime
from dotenv import load_dotenv
from watchdog.observers import Observer
from watchdog.events import FileSystemEventHandler, FileModifiedEvent, FileCreatedEvent

import sys
sys.path.append('../mcp-servers/')
from logging_config import setup_logging

load_dotenv()


class KnowledgeFileHandler(FileSystemEventHandler):
    """
    Handles file system events for knowledge base updates
    """
    
    def __init__(self, rag_system, loop):
        self.rag_system = rag_system
        self.loop = loop
        self.pending_files: Set[str] = set()
        self.file_extensions = {'.md', '.txt', '.json', '.yaml', '.yml', '.rst', '.pdf'}
        
        # Initialize logging
        loggers = setup_logging("knowledge-watcher", "INFO")
        self.logger = loggers['main']
        
        # Debounce settings (avoid processing file multiple times during save)
        self.debounce_seconds = 2
        self.last_modified: Dict[str, float] = {}
    
    def should_process_file(self, file_path: str) -> bool:
        """Check if file should be processed"""
        path = Path(file_path)
        
        # Check extension
        if path.suffix.lower() not in self.file_extensions:
            return False
        
        # Ignore hidden files and directories
        if any(part.startswith('.') for part in path.parts):
            return False
        
        # Ignore temp files
        if path.name.startswith('~') or path.name.endswith('.tmp'):
            return False
        
        # Check debounce
        now = datetime.now().timestamp()
        last_mod = self.last_modified.get(file_path, 0)
        if now - last_mod < self.debounce_seconds:
            return False
        
        self.last_modified[file_path] = now
        return True
    
    def on_created(self, event: FileCreatedEvent):
        """Handle file creation"""
        if event.is_directory:
            return
        
        if self.should_process_file(event.src_path):
            self.logger.info(f"New file detected: {event.src_path}")
            self.pending_files.add(event.src_path)
            asyncio.run_coroutine_threadsafe(
                self.process_file(event.src_path, is_new=True),
                self.loop
            )
    
    def on_modified(self, event: FileModifiedEvent):
        """Handle file modification"""
        if event.is_directory:
            return
        
        if self.should_process_file(event.src_path):
            self.logger.info(f"File modified: {event.src_path}")
            self.pending_files.add(event.src_path)
            asyncio.run_coroutine_threadsafe(
                self.process_file(event.src_path, is_new=False),
                self.loop
            )
    
    async def process_file(self, file_path: str, is_new: bool):
        """Process a file for ingestion"""
        try:
            path = Path(file_path)
            
            # Read file content
            try:
                with open(file_path, 'r', encoding='utf-8') as f:
                    content = f.read()
            except UnicodeDecodeError:
                # Try with different encoding
                with open(file_path, 'r', encoding='latin-1') as f:
                    content = f.read()
            
            # Skip empty files
            if not content.strip():
                self.logger.warning(f"Skipping empty file: {file_path}")
                return
            
            # Prepare metadata
            metadata = {
                'source': 'file_watcher',
                'file_path': str(path),
                'file_name': path.name,
                'file_type': path.suffix.lower(),
                'category': self._determine_category(path),
                'tags': self._extract_tags(path, content),
                'created_at': datetime.fromtimestamp(path.stat().st_ctime).isoformat(),
                'modified_at': datetime.fromtimestamp(path.stat().st_mtime).isoformat(),
                'is_new': is_new
            }
            
            # Generate document ID based on file path
            doc_id = f"file_{path.stem}_{hash(str(path))}"
            
            # Ingest into RAG system
            await self.rag_system.ingest_document(
                content=content,
                metadata=metadata,
                document_id=doc_id,
                chunking_strategy='document-aware'
            )
            
            self.logger.info(f"Successfully ingested: {file_path}", extra={
                'doc_id': doc_id,
                'file_size': len(content),
                'category': metadata['category']
            })
            
            # Remove from pending
            self.pending_files.discard(file_path)
            
        except Exception as e:
            self.logger.error(f"Failed to process file {file_path}: {e}")
            self.pending_files.discard(file_path)
    
    def _determine_category(self, path: Path) -> str:
        """Determine document category based on path"""
        parts = path.parts
        
        # Check common directory patterns
        if 'docs' in parts or 'documentation' in parts:
            return 'documentation'
        elif 'api' in parts:
            return 'api'
        elif 'guides' in parts or 'tutorials' in parts:
            return 'guide'
        elif 'examples' in parts or 'samples' in parts:
            return 'example'
        elif 'tests' in parts:
            return 'test'
        elif 'specs' in parts or 'specifications' in parts:
            return 'specification'
        else:
            return 'general'
    
    def _extract_tags(self, path: Path, content: str) -> list:
        """Extract tags from file path and content"""
        tags = []
        
        # Tags from path
        tags.extend([part.lower() for part in path.parts[:-1] if not part.startswith('.')])
        
        # Tags from file extension
        tags.append(path.suffix.lower().replace('.', ''))
        
        # Tags from content (simple keyword extraction)
        # Look for common patterns
        if 'TODO' in content:
            tags.append('todo')
        if 'FIXME' in content:
            tags.append('fixme')
        if 'API' in content:
            tags.append('api')
        if 'class ' in content or 'def ' in content:
            tags.append('code')
        if '# ' in content or '## ' in content:
            tags.append('markdown')
        
        return list(set(tags))  # Remove duplicates


class KnowledgeWatcher:
    """
    Main watcher that monitors knowledge directories
    """
    
    def __init__(self, rag_system, watch_paths: list):
        self.rag_system = rag_system
        self.watch_paths = [Path(p) for p in watch_paths]
        self.observer = Observer()
        self.loop = asyncio.get_event_loop()
        self.handler = KnowledgeFileHandler(rag_system, self.loop)
        
        # Initialize logging
        loggers = setup_logging("knowledge-watcher-main", "INFO")
        self.logger = loggers['main']
        
        # Check if enabled
        self.enabled = os.getenv('ENABLE_DYNAMIC_INGESTION', 'false').lower() == 'true'
        
        if not self.enabled:
            self.logger.info("Dynamic knowledge ingestion is disabled")
    
    def start(self):
        """Start watching directories"""
        if not self.enabled:
            return
        
        for path in self.watch_paths:
            if path.exists() and path.is_dir():
                self.observer.schedule(
                    self.handler,
                    str(path),
                    recursive=True
                )
                self.logger.info(f"Watching directory: {path}")
            else:
                self.logger.warning(f"Path does not exist or is not a directory: {path}")
        
        self.observer.start()
        self.logger.info("Knowledge watcher started")
    
    def stop(self):
        """Stop watching"""
        if not self.enabled:
            return
        
        self.observer.stop()
        self.observer.join()
        self.logger.info("Knowledge watcher stopped")
    
    async def scan_existing(self):
        """Scan existing files on startup"""
        if not self.enabled:
            return
        
        self.logger.info("Scanning existing knowledge files...")
        
        total_files = 0
        for watch_path in self.watch_paths:
            if not watch_path.exists():
                continue
            
            for file_path in watch_path.rglob('*'):
                if file_path.is_file() and self.handler.should_process_file(str(file_path)):
                    await self.handler.process_file(str(file_path), is_new=False)
                    total_files += 1
        
        self.logger.info(f"Initial scan complete. Processed {total_files} files")


async def main():
    """Test the knowledge watcher"""
    # This would be integrated with the actual RAG system
    class MockRAGSystem:
        async def ingest_document(self, content, metadata, document_id, chunking_strategy):
            print(f"Ingesting document: {document_id}")
            print(f"Metadata: {metadata}")
            print(f"Content length: {len(content)}")
    
    # Create watcher
    rag_system = MockRAGSystem()
    watch_paths = [
        os.getenv('KNOWLEDGE_ROOT', './knowledge'),
        './docs'
    ]
    
    watcher = KnowledgeWatcher(rag_system, watch_paths)
    
    # Scan existing files
    await watcher.scan_existing()
    
    # Start watching
    watcher.start()
    
    try:
        # Keep running
        while True:
            await asyncio.sleep(1)
    except KeyboardInterrupt:
        watcher.stop()


if __name__ == "__main__":
    asyncio.run(main())