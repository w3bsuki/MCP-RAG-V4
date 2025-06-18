#!/usr/bin/env python3
"""
MCP-RAG-V4 System Launcher
Orchestrates MCP servers and agents with proper startup sequence
"""
import asyncio
import json
import logging
import signal
import subprocess
import sys
import time
from pathlib import Path
from typing import Dict, List, Optional, Tuple
import argparse
import os

# Add project to path
sys.path.append('/home/w3bsuki/MCP-RAG-V4')

from agents.core.simple_mcp_client import SimpleMCPClient


class SystemLauncher:
    """
    Main system launcher for MCP-RAG-V4
    Handles startup sequence, health checks, and shutdown
    """
    
    def __init__(self, project_root: str = "/home/w3bsuki/MCP-RAG-V4"):
        self.project_root = Path(project_root)
        self.venv_path = self.project_root / "mcp-venv"
        self.config_path = self.project_root / ".mcp.json"
        self.shared_dir = self.project_root / "shared"
        self.logs_dir = self.project_root / "logs"
        
        # Process tracking
        self.server_processes: Dict[str, subprocess.Popen] = {}
        self.agent_processes: Dict[str, subprocess.Popen] = {}
        self.running = False
        
        # Setup logging
        self.logger = self._setup_logging()
        
        # Load configuration
        self.config = self._load_config()
        
        # Ensure directories exist
        self._create_directories()
    
    def _setup_logging(self) -> logging.Logger:
        """Setup logging configuration"""
        self.logs_dir.mkdir(exist_ok=True)
        
        # Create logger
        logger = logging.getLogger("launcher")
        logger.setLevel(logging.INFO)
        
        # Console handler
        console_handler = logging.StreamHandler()
        console_handler.setLevel(logging.INFO)
        
        # File handler
        file_handler = logging.FileHandler(self.logs_dir / "launcher.log")
        file_handler.setLevel(logging.DEBUG)
        
        # Formatter
        formatter = logging.Formatter(
            '%(asctime)s - %(name)s - %(levelname)s - %(message)s'
        )
        console_handler.setFormatter(formatter)
        file_handler.setFormatter(formatter)
        
        logger.addHandler(console_handler)
        logger.addHandler(file_handler)
        
        return logger
    
    def _load_config(self) -> Dict:
        """Load MCP configuration"""
        try:
            with open(self.config_path, 'r') as f:
                return json.load(f)
        except Exception as e:
            self.logger.error(f"Failed to load config: {e}")
            return {"mcpServers": {}}
    
    def _create_directories(self):
        """Create necessary directories"""
        directories = [
            self.shared_dir,
            self.shared_dir / "specifications",
            self.shared_dir / "adrs", 
            self.shared_dir / "builds",
            self.shared_dir / "reports",
            self.logs_dir
        ]
        
        for directory in directories:
            directory.mkdir(exist_ok=True)
            
        self.logger.info("Created necessary directories")
    
    def _check_prerequisites(self) -> bool:
        """Check if all prerequisites are met"""
        self.logger.info("Checking prerequisites...")
        
        # Check virtual environment
        if not self.venv_path.exists():
            self.logger.error(f"Virtual environment not found: {self.venv_path}")
            self.logger.error("Run: python3 -m venv mcp-venv && source mcp-venv/bin/activate && pip install mcp")
            return False
        
        # Check Python executable
        python_exe = self.venv_path / "bin" / "python"
        if not python_exe.exists():
            self.logger.error(f"Python executable not found: {python_exe}")
            return False
        
        # Check MCP package
        try:
            result = subprocess.run(
                [str(python_exe), "-c", "import mcp; print('MCP available')"],
                capture_output=True,
                text=True,
                timeout=10
            )
            if result.returncode != 0:
                self.logger.error("MCP package not available in virtual environment")
                return False
        except Exception as e:
            self.logger.error(f"Failed to check MCP package: {e}")
            return False
        
        # Check agent scripts
        agent_scripts = [
            "agents/admin/admin_agent.py",
            "agents/architect/architect_agent.py",
            "agents/builder/builder_agent.py"
        ]
        
        for script in agent_scripts:
            script_path = self.project_root / script
            if not script_path.exists():
                self.logger.error(f"Agent script not found: {script_path}")
                return False
        
        self.logger.info("✓ All prerequisites met")
        return True
    
    async def start_mcp_servers(self) -> bool:
        """Start MCP servers"""
        self.logger.info("Starting MCP servers...")
        
        servers = self.config.get("mcpServers", {})
        if not servers:
            self.logger.warning("No MCP servers configured")
            return True
        
        # Test server availability first
        client = SimpleMCPClient(str(self.config_path))
        
        for server_name in servers.keys():
            self.logger.info(f"Testing {server_name} server availability...")
            is_available = await client.test_server_availability(server_name)
            
            if is_available:
                self.logger.info(f"✓ {server_name} server is available")
            else:
                self.logger.warning(f"⚠ {server_name} server dependencies not available")
        
        # For now, we'll use the agent's built-in MCP clients
        # Real MCP servers would be started here in production
        self.logger.info("✓ MCP servers ready (using agent built-in clients)")
        return True
    
    def start_agent(self, agent_type: str, agent_id: str = None) -> bool:
        """Start an individual agent"""
        if agent_id is None:
            agent_id = f"{agent_type}-01"
        
        agent_script_map = {
            "admin": "agents/admin/admin_agent.py",
            "architect": "agents/architect/architect_agent.py", 
            "builder": "agents/builder/builder_agent.py",
            "validator": "agents/validator/validator_agent.py"
        }
        
        if agent_type not in agent_script_map:
            self.logger.error(f"Unknown agent type: {agent_type}")
            return False
        
        script_path = self.project_root / agent_script_map[agent_type]
        if not script_path.exists():
            self.logger.error(f"Agent script not found: {script_path}")
            return False
        
        # Prepare environment
        env = os.environ.copy()
        env.update({
            "PYTHONPATH": str(self.project_root),
            "MCP_CONFIG_PATH": str(self.config_path)
        })
        
        # Prepare command
        python_exe = self.venv_path / "bin" / "python"
        cmd = [
            str(python_exe),
            str(script_path),
            "--id", agent_id,
            "--shared-dir", str(self.shared_dir)
        ]
        
        # Add interactive flag for admin agent
        if agent_type == "admin":
            cmd.append("--interactive")
        
        try:
            # Start process
            process = subprocess.Popen(
                cmd,
                env=env,
                cwd=str(self.project_root),
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                text=True
            )
            
            self.agent_processes[agent_id] = process
            self.logger.info(f"✓ Started {agent_type} agent: {agent_id} (PID: {process.pid})")
            return True
            
        except Exception as e:
            self.logger.error(f"Failed to start {agent_type} agent: {e}")
            return False
    
    async def start_all_agents(self, agents: List[str] = None) -> bool:
        """Start all specified agents"""
        if agents is None:
            agents = ["admin", "architect", "builder"]
        
        self.logger.info(f"Starting agents: {', '.join(agents)}")
        
        success_count = 0
        for agent_type in agents:
            if self.start_agent(agent_type):
                success_count += 1
                # Brief delay between agent starts
                await asyncio.sleep(1)
        
        self.logger.info(f"Started {success_count}/{len(agents)} agents")
        return success_count == len(agents)
    
    def check_health(self) -> Dict[str, bool]:
        """Check health of all processes"""
        health = {}
        
        # Check agents
        for agent_id, process in self.agent_processes.items():
            is_running = process.poll() is None
            health[f"agent_{agent_id}"] = is_running
            
            if not is_running:
                self.logger.warning(f"Agent {agent_id} is not running (exit code: {process.returncode})")
        
        return health
    
    def stop_all(self):
        """Stop all processes"""
        self.logger.info("Stopping all processes...")
        
        # Stop agents
        for agent_id, process in self.agent_processes.items():
            try:
                self.logger.info(f"Stopping agent: {agent_id}")
                process.terminate()
                
                # Wait for graceful shutdown
                try:
                    process.wait(timeout=5)
                    self.logger.info(f"✓ Agent {agent_id} stopped gracefully")
                except subprocess.TimeoutExpired:
                    self.logger.warning(f"Force killing agent: {agent_id}")
                    process.kill()
                    process.wait()
                    
            except Exception as e:
                self.logger.error(f"Error stopping agent {agent_id}: {e}")
        
        # Stop servers (if any were started)
        for server_name, process in self.server_processes.items():
            try:
                self.logger.info(f"Stopping server: {server_name}")
                process.terminate()
                process.wait(timeout=5)
            except Exception as e:
                self.logger.error(f"Error stopping server {server_name}: {e}")
        
        self.agent_processes.clear()
        self.server_processes.clear()
        self.running = False
        
        self.logger.info("✓ All processes stopped")
    
    async def monitor_system(self):
        """Monitor system health and restart failed processes"""
        self.logger.info("Starting system monitor...")
        
        while self.running:
            try:
                health = self.check_health()
                
                # Check for failed agents and restart them
                for component, is_healthy in health.items():
                    if not is_healthy and component.startswith("agent_"):
                        agent_id = component.replace("agent_", "")
                        agent_type = agent_id.split("-")[0]
                        
                        self.logger.warning(f"Restarting failed agent: {agent_id}")
                        
                        # Remove from tracking
                        if agent_id in self.agent_processes:
                            del self.agent_processes[agent_id]
                        
                        # Restart
                        self.start_agent(agent_type, agent_id)
                
                # Wait before next check
                await asyncio.sleep(30)
                
            except Exception as e:
                self.logger.error(f"Monitor error: {e}")
                await asyncio.sleep(10)
    
    def print_status(self):
        """Print current system status"""
        print("\n" + "="*60)
        print("🎛️  MCP-RAG-V4 System Status")
        print("="*60)
        
        # Project info
        print(f"📁 Project: {self.project_root}")
        print(f"🔧 Config: {self.config_path}")
        print(f"📂 Shared: {self.shared_dir}")
        print(f"📋 Logs: {self.logs_dir}")
        
        # Agent status
        print(f"\n🤖 Agents ({len(self.agent_processes)} running):")
        if self.agent_processes:
            for agent_id, process in self.agent_processes.items():
                status = "🟢 Running" if process.poll() is None else "🔴 Stopped"
                print(f"  • {agent_id}: {status} (PID: {process.pid})")
        else:
            print("  No agents running")
        
        # MCP servers status
        print(f"\n🔗 MCP Servers:")
        servers = self.config.get("mcpServers", {})
        for server_name in servers.keys():
            print(f"  • {server_name}: 🟡 Available")
        
        print("="*60)
    
    async def run(self, agents: List[str] = None, monitor: bool = True):
        """Run the complete system"""
        self.logger.info("🚀 Starting MCP-RAG-V4 System")
        
        # Check prerequisites
        if not self._check_prerequisites():
            self.logger.error("Prerequisites not met. Exiting.")
            return False
        
        # Setup signal handlers
        def signal_handler(signum, frame):
            self.logger.info(f"Received signal {signum}")
            self.running = False
        
        signal.signal(signal.SIGINT, signal_handler)
        signal.signal(signal.SIGTERM, signal_handler)
        
        try:
            # Start MCP servers
            if not await self.start_mcp_servers():
                self.logger.error("Failed to start MCP servers")
                return False
            
            # Start agents
            self.running = True
            if not await self.start_all_agents(agents):
                self.logger.error("Failed to start all agents")
                return False
            
            # Print initial status
            self.print_status()
            
            # Start monitoring if requested
            if monitor:
                await self.monitor_system()
            else:
                # Just wait for shutdown signal
                while self.running:
                    await asyncio.sleep(1)
            
        except KeyboardInterrupt:
            self.logger.info("Keyboard interrupt received")
        except Exception as e:
            self.logger.error(f"System error: {e}")
        finally:
            self.stop_all()
        
        self.logger.info("✓ System shutdown complete")
        return True


async def main():
    """Main entry point"""
    parser = argparse.ArgumentParser(description="MCP-RAG-V4 System Launcher")
    parser.add_argument(
        "--agents", 
        nargs="+", 
        choices=["admin", "architect", "builder", "validator"],
        default=["admin", "architect", "builder"],
        help="Agents to start"
    )
    parser.add_argument(
        "--no-monitor",
        action="store_true",
        help="Disable automatic monitoring and restart"
    )
    parser.add_argument(
        "--project-root",
        default="/home/w3bsuki/MCP-RAG-V4",
        help="Project root directory"
    )
    
    args = parser.parse_args()
    
    # Create launcher
    launcher = SystemLauncher(args.project_root)
    
    # Run system
    success = await launcher.run(
        agents=args.agents,
        monitor=not args.no_monitor
    )
    
    sys.exit(0 if success else 1)


if __name__ == "__main__":
    asyncio.run(main())