#!/usr/bin/env python3
"""
Initialize Qdrant collections for the MCP-RAG system
"""
import os
import time
from typing import Dict, Any
from qdrant_client import QdrantClient
from qdrant_client.models import (
    Distance, 
    VectorParams, 
    PointStruct,
    CollectionStatus,
    OptimizersConfigDiff,
    CreateAlias
)

# Configuration
QDRANT_URL = os.environ.get("QDRANT_URL", "http://localhost:6333")
EMBEDDING_DIMENSION = 384  # For all-MiniLM-L6-v2

# Collection configurations
COLLECTIONS = {
    "patterns": {
        "description": "Architectural and implementation patterns",
        "vector_size": EMBEDDING_DIMENSION,
        "distance": Distance.COSINE,
        "payload_schema": {
            "name": "string",
            "category": "string",
            "tags": "string[]",
            "source_file": "string",
            "agent": "string",
            "timestamp": "datetime"
        }
    },
    "specifications": {
        "description": "Technical specifications and API contracts",
        "vector_size": EMBEDDING_DIMENSION,
        "distance": Distance.COSINE,
        "payload_schema": {
            "title": "string",
            "type": "string",
            "version": "string",
            "author": "string",
            "status": "string",
            "timestamp": "datetime"
        }
    },
    "knowledge": {
        "description": "General knowledge base entries",
        "vector_size": EMBEDDING_DIMENSION,
        "distance": Distance.COSINE,
        "payload_schema": {
            "title": "string",
            "content_type": "string",
            "source": "string",
            "relevance_score": "float",
            "timestamp": "datetime"
        }
    },
    "code_snippets": {
        "description": "Reusable code snippets and examples",
        "vector_size": EMBEDDING_DIMENSION,
        "distance": Distance.COSINE,
        "payload_schema": {
            "language": "string",
            "framework": "string",
            "purpose": "string",
            "tested": "bool",
            "performance_score": "float"
        }
    },
    "decisions": {
        "description": "Architectural decisions and rationales",
        "vector_size": EMBEDDING_DIMENSION,
        "distance": Distance.COSINE,
        "payload_schema": {
            "decision_id": "string",
            "title": "string",
            "rationale": "string",
            "alternatives": "string[]",
            "impact": "string",
            "timestamp": "datetime"
        }
    }
}

def wait_for_qdrant(client: QdrantClient, max_retries: int = 30) -> bool:
    """Wait for Qdrant to be ready"""
    print("⏳ Waiting for Qdrant to be ready...")
    for i in range(max_retries):
        try:
            client.get_collections()
            print("✅ Qdrant is ready!")
            return True
        except Exception as e:
            if i < max_retries - 1:
                print(f"   Retry {i+1}/{max_retries}...")
                time.sleep(2)
            else:
                print(f"❌ Failed to connect to Qdrant: {e}")
                return False
    return False

def create_collection(client: QdrantClient, name: str, config: Dict[str, Any]) -> bool:
    """Create a single collection"""
    try:
        # Check if collection exists
        collections = client.get_collections().collections
        if any(c.name == name for c in collections):
            print(f"   Collection '{name}' already exists")
            return True
        
        # Create collection
        client.create_collection(
            collection_name=name,
            vectors_config=VectorParams(
                size=config["vector_size"],
                distance=config["distance"]
            ),
            optimizers_config=OptimizersConfigDiff(
                default_segment_number=2,
                indexing_threshold=10000
            )
        )
        
        print(f"✅ Created collection '{name}': {config['description']}")
        
        # Create alias for easier access
        client.update_aliases(
            actions=[
                CreateAlias(
                    alias_name=f"{name}_latest",
                    collection_name=name
                )
            ]
        )
        
        return True
        
    except Exception as e:
        print(f"❌ Failed to create collection '{name}': {e}")
        return False

def add_sample_data(client: QdrantClient):
    """Add sample patterns to demonstrate functionality"""
    from sentence_transformers import SentenceTransformer
    import uuid
    from datetime import datetime
    
    print("\n📝 Adding sample data...")
    
    # Initialize embedder
    model = SentenceTransformer('sentence-transformers/all-MiniLM-L6-v2')
    
    # Sample patterns
    sample_patterns = [
        {
            "name": "Repository Pattern",
            "content": "Encapsulates data access logic and provides a more object-oriented view of the persistence layer",
            "category": "architecture",
            "tags": ["data-access", "abstraction", "clean-architecture"]
        },
        {
            "name": "Observer Pattern",
            "content": "Defines a one-to-many dependency between objects so that when one object changes state, all dependents are notified",
            "category": "design-pattern",
            "tags": ["behavioral", "event-driven", "decoupling"]
        },
        {
            "name": "Microservices Architecture",
            "content": "Structures an application as a collection of loosely coupled services, which implement business capabilities",
            "category": "architecture",
            "tags": ["distributed", "scalable", "independent-deployment"]
        }
    ]
    
    # Create embeddings and store
    points = []
    for i, pattern in enumerate(sample_patterns):
        # Create embedding
        embedding = model.encode(f"{pattern['name']}: {pattern['content']}").tolist()
        
        # Create point
        point = PointStruct(
            id=str(uuid.uuid4()),
            vector=embedding,
            payload={
                **pattern,
                "agent": "system",
                "source_file": "init_script",
                "timestamp": datetime.now().isoformat()
            }
        )
        points.append(point)
    
    # Insert into Qdrant
    client.upsert(
        collection_name="patterns",
        points=points
    )
    
    print(f"✅ Added {len(points)} sample patterns")

def main():
    """Initialize Qdrant collections"""
    print("🚀 Initializing Qdrant for MCP-RAG System\n")
    
    # Create client
    client = QdrantClient(url=QDRANT_URL)
    
    # Wait for Qdrant to be ready
    if not wait_for_qdrant(client):
        return 1
    
    # Create collections
    print("\n📚 Creating collections...")
    success_count = 0
    for name, config in COLLECTIONS.items():
        if create_collection(client, name, config):
            success_count += 1
    
    print(f"\n✅ Successfully created {success_count}/{len(COLLECTIONS)} collections")
    
    # Add sample data
    try:
        add_sample_data(client)
    except Exception as e:
        print(f"⚠️  Could not add sample data: {e}")
        print("   This is optional - the system will work without it")
    
    # Print summary
    print("\n📊 Collection Summary:")
    collections = client.get_collections().collections
    for collection in collections:
        if collection.name in COLLECTIONS:
            info = client.get_collection(collection.name)
            print(f"   - {collection.name}: {info.points_count} points, {info.vectors_count} vectors")
    
    print("\n✅ Qdrant initialization complete!")
    print("   Access Qdrant UI at: http://localhost:6333/dashboard")
    
    return 0

if __name__ == "__main__":
    import sys
    sys.exit(main())