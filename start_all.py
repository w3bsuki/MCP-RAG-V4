#!/usr/bin/env python3
"""
Start all Python MCP servers for MCP-RAG-V4
"""
import os
import sys
import subprocess
import time
import signal
import json
from pathlib import Path
from typing import Dict, List
import logging

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

class MCPServerManager:
    def __init__(self):
        self.servers = {}
        self.base_dir = Path(__file__).parent
        self.logs_dir = self.base_dir / "logs" / "mcp-servers"
        self.logs_dir.mkdir(parents=True, exist_ok=True)
        
        # Load environment
        self.load_environment()
        
        # Define Python MCP servers
        self.server_configs = {
            "knowledge-base": {
                "path": "perfect-claude-env/mcp-servers/knowledge-base-python",
                "script": "server.py",
                "port": int(os.getenv("MCP_KNOWLEDGE_BASE_PORT", "8080")),
                "env": {
                    "KNOWLEDGE_ROOT": "./perfect-claude-env/rag-system/knowledge",
                    "MCP_SERVER_PORT": os.getenv("MCP_KNOWLEDGE_BASE_PORT", "8080")
                }
            },
            "vector-search": {
                "path": "perfect-claude-env/mcp-servers/vector-search-python", 
                "script": "server.py",
                "port": int(os.getenv("MCP_VECTOR_SEARCH_PORT", "8081")),
                "env": {
                    "QDRANT_URL": os.getenv("QDRANT_URL", "http://localhost:6333"),
                    "REDIS_URL": os.getenv("REDIS_URL", "redis://localhost:6379"),
                    "EMBEDDING_MODEL": os.getenv("EMBEDDING_MODEL", "sentence-transformers/all-MiniLM-L6-v2"),
                    "CACHE_TTL": os.getenv("CACHE_TTL", "3600"),
                    "MCP_SERVER_PORT": os.getenv("MCP_VECTOR_SEARCH_PORT", "8081")
                }
            },
            "security-wrapper": {
                "path": "perfect-claude-env/mcp-servers/security-wrapper",
                "script": "filesystem-secure.py", 
                "port": int(os.getenv("MCP_FILESYSTEM_SECURE_PORT", "8082")),
                "env": {
                    "SECURITY_CONFIG": os.getenv("SECURITY_CONFIG_PATH", "./perfect-claude-env/config/security-config.json"),
                    "AUDIT_LOG": os.getenv("AUDIT_LOG_PATH", "./logs/audit.log"),
                    "MCP_SERVER_PORT": os.getenv("MCP_FILESYSTEM_SECURE_PORT", "8082")
                }
            },
            "coordination-hub": {
                "path": "perfect-claude-env/mcp-servers/coordination-hub",
                "script": "server.py",
                "port": 8087,
                "env": {
                    "SHARED_DIR": "./perfect-claude-env/shared",
                    "MCP_SERVER_PORT": "8087"
                }
            },
            "monitoring": {
                "path": "perfect-claude-env/mcp-servers/monitoring",
                "script": "health-monitor.py",
                "port": 8088,
                "env": {
                    "PROMETHEUS_URL": os.getenv("PROMETHEUS_URL", "http://localhost:9090"),
                    "MCP_SERVER_PORT": "8088"
                }
            }
        }
    
    def load_environment(self):
        """Load environment variables from .env file"""
        env_file = self.base_dir / ".env"
        if env_file.exists():
            with open(env_file) as f:
                for line in f:
                    line = line.strip()
                    if line and not line.startswith('#'):
                        key, value = line.split('=', 1)
                        os.environ[key] = value
            logger.info("Loaded environment from .env")
        else:
            logger.warning(".env file not found, using defaults")
    
    def start_server(self, name: str, config: Dict) -> bool:
        """Start a single MCP server"""
        server_path = self.base_dir / config["path"]
        script_path = server_path / config["script"]
        
        if not server_path.exists():
            logger.error(f"Server directory not found: {server_path}")
            return False
            
        if not script_path.exists():
            logger.error(f"Server script not found: {script_path}")
            return False
        
        # Setup environment for this server
        env = os.environ.copy()
        env.update(config.get("env", {}))
        
        # Setup virtual environment path
        venv_python = server_path / "venv" / "bin" / "python"
        if venv_python.exists():
            python_cmd = str(venv_python)
        else:
            python_cmd = sys.executable
        
        # Start the server
        log_file = self.logs_dir / f"{name}.log"
        pid_file = self.logs_dir / f"{name}.pid"
        
        try:
            logger.info(f"Starting {name} server on port {config['port']}...")
            
            with open(log_file, 'w') as log:
                process = subprocess.Popen(
                    [python_cmd, str(script_path)],
                    cwd=server_path,
                    env=env,
                    stdout=log,
                    stderr=subprocess.STDOUT,
                    preexec_fn=os.setsid
                )
            
            # Save PID
            with open(pid_file, 'w') as f:
                f.write(str(process.pid))
            
            # Wait a moment and check if still running
            time.sleep(2)
            if process.poll() is None:
                self.servers[name] = {
                    "process": process,
                    "config": config,
                    "pid_file": pid_file,
                    "log_file": log_file
                }
                logger.info(f"✅ {name} started successfully (PID: {process.pid})")
                return True
            else:
                logger.error(f"❌ {name} failed to start. Check {log_file}")
                return False
                
        except Exception as e:
            logger.error(f"Failed to start {name}: {e}")
            return False
    
    def start_all(self) -> bool:
        """Start all MCP servers"""
        logger.info("🚀 Starting Python MCP Servers")
        logger.info("=" * 35)
        
        success_count = 0
        for name, config in self.server_configs.items():
            if self.start_server(name, config):
                success_count += 1
            time.sleep(1)  # Small delay between starts
        
        total_servers = len(self.server_configs)
        logger.info("")
        logger.info(f"📊 Started {success_count}/{total_servers} servers successfully")
        
        if success_count > 0:
            logger.info("")
            logger.info("📊 Server Status:")
            for name, server in self.servers.items():
                port = server["config"]["port"]
                logger.info(f"  • {name.title()}: http://localhost:{port}/health")
            
            logger.info("")
            logger.info("📝 Logs available at: logs/mcp-servers/")
            logger.info("🛑 Stop servers with: python stop_all.py")
        
        return success_count == total_servers
    
    def save_status(self):
        """Save running server status to file"""
        status = {
            "servers": {
                name: {
                    "pid": server["process"].pid,
                    "port": server["config"]["port"],
                    "status": "running"
                }
                for name, server in self.servers.items()
                if server["process"].poll() is None
            },
            "timestamp": time.time()
        }
        
        status_file = self.logs_dir / "python_servers_status.json"
        with open(status_file, 'w') as f:
            json.dump(status, f, indent=2)

def main():
    """Main entry point"""
    manager = MCPServerManager()
    
    try:
        success = manager.start_all()
        manager.save_status()
        
        if success:
            logger.info("🎉 All Python MCP servers started successfully!")
            sys.exit(0)
        else:
            logger.error("❌ Some servers failed to start")
            sys.exit(1)
            
    except KeyboardInterrupt:
        logger.info("⚠️  Startup interrupted by user")
        sys.exit(1)
    except Exception as e:
        logger.error(f"❌ Unexpected error: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()