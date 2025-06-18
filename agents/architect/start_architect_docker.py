#!/usr/bin/env python3
"""
Docker-friendly Architect Agent Startup
Includes signal handling and graceful shutdown for containers
"""
import asyncio
import logging
import signal
import sys
import os
from pathlib import Path
import json
from datetime import datetime

# Add parent directories to path
sys.path.insert(0, str(Path(__file__).parent.parent.parent))
sys.path.insert(0, str(Path(__file__).parent.parent))

from architect_agent import ArchitectAgent

# Configure structured logging for Docker
class DockerFormatter(logging.Formatter):
    """JSON formatter for Docker logs"""
    def format(self, record):
        log_data = {
            'timestamp': datetime.utcnow().isoformat(),
            'level': record.levelname,
            'agent': 'architect',
            'agent_id': os.environ.get('ARCHITECT_AGENT_ID', 'architect-01'),
            'message': record.getMessage(),
            'module': record.module
        }
        if record.exc_info:
            log_data['exception'] = self.formatException(record.exc_info)
        return json.dumps(log_data)

# Set up logging
logger = logging.getLogger()
logger.setLevel(logging.INFO)

# Console handler with JSON formatting
console_handler = logging.StreamHandler(sys.stdout)
console_handler.setFormatter(DockerFormatter())
logger.addHandler(console_handler)

# File handler for persistent logs (if volume mounted)
log_dir = Path('/app/logs') if Path('/app/logs').exists() else Path('./logs')
log_dir.mkdir(exist_ok=True)
file_handler = logging.FileHandler(log_dir / 'architect_agent.log')
file_handler.setFormatter(DockerFormatter())
logger.addHandler(file_handler)

# Global agent instance for signal handling
agent_instance = None

def signal_handler(signum, frame):
    """Handle shutdown signals gracefully"""
    logger.info(f"Received signal {signum}, initiating graceful shutdown...")
    if agent_instance and agent_instance.running:
        # Create task to stop the agent
        asyncio.create_task(agent_instance.stop())

async def health_check_server():
    """Simple HTTP health check endpoint for Docker/K8s"""
    from aiohttp import web
    
    async def health(request):
        if agent_instance and agent_instance.running:
            return web.json_response({
                'status': 'healthy',
                'agent': 'architect',
                'agent_id': agent_instance.agent_id,
                'uptime': (datetime.utcnow() - agent_instance.start_time).total_seconds()
            })
        else:
            return web.json_response({
                'status': 'unhealthy',
                'agent': 'architect'
            }, status=503)
    
    async def ready(request):
        # Check if agent is ready to accept tasks
        if agent_instance and agent_instance.running and agent_instance.ready:
            return web.json_response({'status': 'ready'})
        else:
            return web.json_response({'status': 'not_ready'}, status=503)
    
    app = web.Application()
    app.router.add_get('/health', health)
    app.router.add_get('/ready', ready)
    
    runner = web.AppRunner(app)
    await runner.setup()
    site = web.TCPSite(runner, '0.0.0.0', 8080)
    await site.start()
    logger.info("Health check server running on port 8080")
    return runner

async def main():
    """Run the Architect Agent with Docker support"""
    global agent_instance
    
    logger.info("Starting Architect Agent (Docker mode)...")
    
    # Configuration from environment
    agent_id = os.environ.get('ARCHITECT_AGENT_ID', 'architect-01')
    shared_dir = os.environ.get('SHARED_DIR', '/app/shared')
    
    # Ensure shared directory exists
    Path(shared_dir).mkdir(exist_ok=True, parents=True)
    
    config = {
        'redis_url': os.environ.get('REDIS_URL', 'redis://redis:6379'),
        'shared_dir': shared_dir,
        'enable_redis': os.environ.get('ENABLE_REDIS', 'true').lower() == 'true',
        'mcp_api_base': os.environ.get('MCP_API_BASE', 'http://mcp-gateway:8000'),
        'coordination_hub_url': os.environ.get('COORDINATION_HUB_URL', 'http://coordination-hub:8503'),
        'knowledge_base_url': os.environ.get('KNOWLEDGE_BASE_URL', 'http://knowledge-base:8501'),
        'vector_search_url': os.environ.get('VECTOR_SEARCH_URL', 'http://vector-search:8502')
    }
    
    logger.info(f"Configuration: {json.dumps({k: v for k, v in config.items() if 'url' not in k})}")
    
    # Create and initialize agent
    agent_instance = ArchitectAgent(agent_id, config)
    agent_instance.start_time = datetime.utcnow()
    agent_instance.ready = False
    
    # Start health check server
    health_runner = await health_check_server()
    
    # Register signal handlers
    signal.signal(signal.SIGTERM, signal_handler)
    signal.signal(signal.SIGINT, signal_handler)
    
    try:
        # Initialize agent
        await agent_instance.initialize()
        agent_instance.ready = True
        logger.info("Agent initialized and ready")
        
        # Start agent
        await agent_instance.start()
        
    except Exception as e:
        logger.error(f"Agent error: {e}", exc_info=True)
        sys.exit(1)
    finally:
        logger.info("Shutting down agent...")
        await agent_instance.cleanup()
        await health_runner.cleanup()
        logger.info("Agent shutdown complete")

if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        logger.info("Shutdown complete")
        sys.exit(0)
    except Exception as e:
        logger.error(f"Fatal error: {e}", exc_info=True)
        sys.exit(1)