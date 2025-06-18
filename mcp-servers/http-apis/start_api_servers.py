#!/usr/bin/env python3
"""
Start all HTTP API servers for agent MCP communication
"""
import subprocess
import time
import sys
import os
import signal
import requests
from pathlib import Path

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent.parent.parent))

# Server configurations
SERVERS = [
    {
        "name": "knowledge-base",
        "script": "knowledge_base_api.py",
        "port": 8501,
        "env": {
            "KNOWLEDGE_ROOT": str(Path(__file__).parent.parent.parent / "rag-system" / "knowledge"),
            "PYTHONPATH": str(Path(__file__).parent.parent.parent)
        }
    },
    {
        "name": "vector-search",
        "script": "vector_search_api.py",
        "port": 8502,
        "env": {
            "STORAGE_DIR": str(Path(__file__).parent.parent.parent / "vectors"),
            "PYTHONPATH": str(Path(__file__).parent.parent.parent)
        }
    },
    {
        "name": "coordination-hub",
        "script": "coordination_hub_api.py",
        "port": 8503,
        "env": {
            "SHARED_DIR": str(Path(__file__).parent.parent.parent / "shared"),
            "PYTHONPATH": str(Path(__file__).parent.parent.parent)
        }
    }
]

processes = []


def signal_handler(sig, frame):
    """Handle shutdown gracefully"""
    print("\nShutting down API servers...")
    for proc in processes:
        try:
            proc.terminate()
            proc.wait(timeout=5)
        except:
            proc.kill()
    sys.exit(0)


signal.signal(signal.SIGINT, signal_handler)
signal.signal(signal.SIGTERM, signal_handler)


def check_health(port):
    """Check if server is healthy"""
    try:
        resp = requests.get(f"http://localhost:{port}/health", timeout=2)
        return resp.status_code == 200
    except:
        return False


def start_servers():
    """Start all API servers"""
    print("Starting HTTP API servers for agent MCP communication...")
    
    script_dir = Path(__file__).parent
    
    for server in SERVERS:
        print(f"\nStarting {server['name']} on port {server['port']}...")
        
        # Build environment
        env = os.environ.copy()
        env.update(server['env'])
        
        # Start process
        script_path = script_dir / server['script']
        proc = subprocess.Popen(
            [sys.executable, str(script_path)],
            env=env,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True,
            bufsize=1
        )
        
        processes.append(proc)
        
        # Wait for server to start
        time.sleep(3)
        
        # Check health
        if check_health(server['port']):
            print(f"✓ {server['name']} is running on http://localhost:{server['port']}")
        else:
            print(f"✗ {server['name']} failed to start properly")
            # Try to get error output
            try:
                stdout, stderr = proc.communicate(timeout=1)
                if stderr:
                    print(f"Error: {stderr}")
            except subprocess.TimeoutExpired:
                pass
    
    print("\nAll API servers started. Press Ctrl+C to stop.")
    print("\nAPI Endpoints:")
    print("- Knowledge Base: http://localhost:8501")
    print("- Vector Search: http://localhost:8502") 
    print("- Coordination Hub: http://localhost:8503")
    
    # Keep running and monitor processes
    while True:
        for i, proc in enumerate(processes):
            if proc.poll() is not None:
                print(f"\nServer {SERVERS[i]['name']} exited with code {proc.returncode}")
                # Try to restart
                print(f"Attempting to restart {SERVERS[i]['name']}...")
                
                env = os.environ.copy()
                env.update(SERVERS[i]['env'])
                
                new_proc = subprocess.Popen(
                    [sys.executable, str(script_dir / SERVERS[i]['script'])],
                    env=env,
                    stdout=subprocess.PIPE,
                    stderr=subprocess.PIPE,
                    text=True,
                    bufsize=1
                )
                processes[i] = new_proc
        
        time.sleep(5)


if __name__ == "__main__":
    # Install required dependencies first
    print("Checking dependencies...")
    try:
        import fastapi
        import uvicorn
    except ImportError:
        print("Installing required dependencies...")
        subprocess.check_call([sys.executable, "-m", "pip", "install", "fastapi", "uvicorn", "pydantic"])
    
    start_servers()