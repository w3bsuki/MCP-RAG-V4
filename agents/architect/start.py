#!/usr/bin/env python3
"""
Simple Architect Agent Startup
Quick start for development and testing
"""
import asyncio
import sys
from pathlib import Path

# Fix imports
sys.path.append(str(Path(__file__).parent.parent.parent))
sys.path.append(str(Path(__file__).parent.parent))

from architect_agent import ArchitectAgent

if __name__ == "__main__":
    # Simple configuration for quick testing
    config = {
        'shared_dir': str(Path(__file__).parent.parent.parent / 'shared'),
        'enable_redis': False,  # File-based messaging for simplicity
    }
    
    # Create agent with default ID
    agent = ArchitectAgent('architect-01', config)
    
    print(f"Starting Architect Agent...")
    print(f"Agent ID: {agent.agent_id}")
    print(f"Shared Directory: {config['shared_dir']}")
    print(f"Press Ctrl+C to stop\n")
    
    try:
        # Run the agent
        asyncio.run(agent.start())
    except KeyboardInterrupt:
        print("\nStopping agent...")
        asyncio.run(agent.cleanup())
        print("Agent stopped.")