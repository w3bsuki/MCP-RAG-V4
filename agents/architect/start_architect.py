#!/usr/bin/env python3
"""
Start Architect Agent
Runs the Architect Agent as a standalone service
"""
import asyncio
import logging
import sys
import os
from pathlib import Path

# Add parent directories to path
sys.path.insert(0, str(Path(__file__).parent.parent.parent))
sys.path.insert(0, str(Path(__file__).parent.parent))

from architect_agent import ArchitectAgent

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(sys.stdout),
        logging.FileHandler('architect_agent.log')
    ]
)

logger = logging.getLogger(__name__)

async def main():
    """Run the Architect Agent"""
    logger.info("Starting Architect Agent...")
    
    # Configuration
    agent_id = os.environ.get('ARCHITECT_AGENT_ID', 'architect-01')
    shared_dir = os.environ.get('SHARED_DIR', str(Path(__file__).parent.parent.parent / 'shared'))
    
    # Ensure shared directory exists
    Path(shared_dir).mkdir(exist_ok=True, parents=True)
    
    config = {
        'redis_url': os.environ.get('REDIS_URL', 'redis://localhost:6379'),
        'shared_dir': shared_dir,
        'enable_redis': os.environ.get('ENABLE_REDIS', 'false').lower() == 'true',
        'mcp_api_base': os.environ.get('MCP_API_BASE', 'http://localhost:8000'),
        'coordination_hub_url': os.environ.get('COORDINATION_HUB_URL', 'http://localhost:8503'),
        'knowledge_base_url': os.environ.get('KNOWLEDGE_BASE_URL', 'http://localhost:8501'),
        'vector_search_url': os.environ.get('VECTOR_SEARCH_URL', 'http://localhost:8502')
    }
    
    logger.info(f"Agent ID: {agent_id}")
    logger.info(f"Shared Directory: {shared_dir}")
    logger.info(f"Redis Enabled: {config['enable_redis']}")
    logger.info(f"MCP API Base: {config['mcp_api_base']}")
    
    # Create and start agent
    agent = ArchitectAgent(agent_id, config)
    
    try:
        await agent.start()
    except KeyboardInterrupt:
        logger.info("Received shutdown signal")
    except Exception as e:
        logger.error(f"Agent error: {e}", exc_info=True)
    finally:
        logger.info("Shutting down agent...")
        await agent.cleanup()
        logger.info("Agent shutdown complete")

if __name__ == "__main__":
    # Run the agent
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print("\nShutdown complete")