#!/usr/bin/env python3
"""
Start MCP Servers as Standalone HTTP Services
This bypasses Claude's MCP stdio protocol and runs servers directly
"""
import subprocess
import time
import sys
import os
import signal
import requests

# Server configurations
SERVERS = {
    "knowledge-base": {
        "script": "mcp-servers/knowledge-base-python/server.py",
        "port": 8501,
        "env": {
            "KNOWLEDGE_ROOT": "./rag-system/knowledge",
            "PYTHONPATH": "."
        }
    },
    "vector-search": {
        "script": "mcp-servers/vector-search-python/server.py", 
        "port": 8502,
        "env": {
            "QDRANT_URL": "http://localhost:6333",
            "EMBEDDING_MODEL": "sentence-transformers/all-MiniLM-L6-v2",
            "PYTHONPATH": ".",
            "STORAGE_DIR": "./vectors"
        }
    },
    "coordination-hub": {
        "script": "mcp-servers/coordination-hub/server.py",
        "port": 8503,
        "env": {
            "SHARED_DIR": "./shared",
            "PYTHONPATH": "."
        }
    }
}

processes = []

def signal_handler(sig, frame):
    """Handle shutdown gracefully"""
    print("\nShutting down servers...")
    for proc in processes:
        proc.terminate()
    sys.exit(0)

signal.signal(signal.SIGINT, signal_handler)

def check_health(port):
    """Check if server is healthy"""
    try:
        resp = requests.get(f"http://localhost:{port}/health", timeout=2)
        return resp.status_code == 200
    except:
        return False

def start_servers():
    """Start all MCP servers"""
    print("Starting MCP servers as standalone HTTP services...")
    
    for name, config in SERVERS.items():
        print(f"\nStarting {name} on port {config['port']}...")
        
        # Build environment
        env = os.environ.copy()
        env.update(config['env'])
        
        # Start process
        proc = subprocess.Popen(
            [sys.executable, config['script']],
            env=env,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True,
            bufsize=1
        )
        
        processes.append(proc)
        
        # Wait for server to start
        time.sleep(2)
        
        # Check health
        if check_health(config['port']):
            print(f"✓ {name} is running on http://localhost:{config['port']}")
        else:
            print(f"✗ {name} failed to start properly")
    
    print("\nAll servers started. Press Ctrl+C to stop.")
    
    # Keep running and show output
    while True:
        for proc in processes:
            # Check if process is still running
            if proc.poll() is not None:
                print(f"Server exited with code {proc.returncode}")
                # Read any error output
                stderr = proc.stderr.read()
                if stderr:
                    print(f"Error: {stderr}")
        
        time.sleep(1)

if __name__ == "__main__":
    start_servers()