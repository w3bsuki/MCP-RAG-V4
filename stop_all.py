#!/usr/bin/env python3
"""
Stop all Python MCP servers for MCP-RAG-V4
"""
import os
import sys
import signal
import json
import time
from pathlib import Path
import logging

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

class MCPServerStopper:
    def __init__(self):
        self.base_dir = Path(__file__).parent
        self.logs_dir = self.base_dir / "logs" / "mcp-servers"
        
        # Server names to stop
        self.server_names = [
            "knowledge-base",
            "vector-search", 
            "security-wrapper",
            "coordination-hub",
            "monitoring"
        ]
    
    def stop_server_by_pid(self, name: str, pid: int) -> bool:
        """Stop a server by PID"""
        try:
            # Check if process is running
            os.kill(pid, 0)
            
            logger.info(f"Stopping {name} (PID: {pid})...")
            
            # Send SIGTERM for graceful shutdown
            os.kill(pid, signal.SIGTERM)
            
            # Wait for graceful shutdown
            for i in range(10):
                try:
                    os.kill(pid, 0)
                    time.sleep(1)
                except OSError:
                    # Process has terminated
                    logger.info(f"✅ {name} stopped gracefully")
                    return True
            
            # Force kill if still running
            logger.warning(f"Force killing {name}...")
            os.kill(pid, signal.SIGKILL)
            logger.info(f"✅ {name} force stopped")
            return True
            
        except OSError:
            # Process not running
            logger.warning(f"⚠️  {name} was not running")
            return True
        except Exception as e:
            logger.error(f"❌ Failed to stop {name}: {e}")
            return False
    
    def stop_server_by_pid_file(self, name: str) -> bool:
        """Stop a server using its PID file"""
        pid_file = self.logs_dir / f"{name}.pid"
        
        if not pid_file.exists():
            logger.warning(f"⚠️  No PID file found for {name}")
            return True
        
        try:
            with open(pid_file, 'r') as f:
                pid = int(f.read().strip())
            
            success = self.stop_server_by_pid(name, pid)
            
            # Remove PID file
            pid_file.unlink()
            return success
            
        except (ValueError, IOError) as e:
            logger.error(f"❌ Error reading PID file for {name}: {e}")
            return False
    
    def stop_from_status_file(self) -> bool:
        """Stop servers using the status file"""
        status_file = self.logs_dir / "python_servers_status.json"
        
        if not status_file.exists():
            logger.warning("⚠️  No status file found")
            return False
        
        try:
            with open(status_file, 'r') as f:
                status = json.load(f)
            
            servers = status.get("servers", {})
            if not servers:
                logger.info("ℹ️  No servers found in status file")
                return True
            
            success_count = 0
            for name, info in servers.items():
                pid = info.get("pid")
                if pid:
                    if self.stop_server_by_pid(name, pid):
                        success_count += 1
            
            # Remove status file
            status_file.unlink()
            
            logger.info(f"📊 Stopped {success_count}/{len(servers)} servers from status file")
            return success_count == len(servers)
            
        except (json.JSONDecodeError, IOError) as e:
            logger.error(f"❌ Error reading status file: {e}")
            return False
    
    def stop_all(self) -> bool:
        """Stop all Python MCP servers"""
        logger.info("🛑 Stopping Python MCP Servers")
        logger.info("=" * 34)
        
        # First try to stop using status file
        if self.stop_from_status_file():
            logger.info("🎉 All servers stopped successfully!")
            return True
        
        # Fallback to PID files
        logger.info("📝 Falling back to PID files...")
        success_count = 0
        
        for name in self.server_names:
            if self.stop_server_by_pid_file(name):
                success_count += 1
        
        total_servers = len(self.server_names)
        logger.info(f"📊 Stopped {success_count}/{total_servers} servers")
        
        if success_count == total_servers:
            logger.info("🎉 All Python MCP servers stopped!")
            return True
        else:
            logger.warning("⚠️  Some servers may still be running")
            return False
    
    def kill_by_port(self, port: int) -> bool:
        """Kill process by port (last resort)"""
        try:
            import subprocess
            result = subprocess.run(
                ['lsof', '-ti', f':{port}'],
                capture_output=True,
                text=True
            )
            
            if result.returncode == 0 and result.stdout.strip():
                pids = result.stdout.strip().split('\n')
                for pid in pids:
                    try:
                        os.kill(int(pid), signal.SIGKILL)
                        logger.info(f"✅ Killed process {pid} on port {port}")
                    except OSError:
                        pass
                return True
        except Exception:
            pass
        return False
    
    def cleanup_ports(self):
        """Cleanup any remaining processes on known ports"""
        logger.info("🧹 Cleaning up ports...")
        
        ports = [8080, 8081, 8082, 8087, 8088]  # Known Python MCP server ports
        
        for port in ports:
            self.kill_by_port(port)

def main():
    """Main entry point"""
    stopper = MCPServerStopper()
    
    try:
        success = stopper.stop_all()
        
        if not success:
            logger.info("🧹 Attempting port cleanup...")
            stopper.cleanup_ports()
        
        logger.info("🎉 Python MCP servers shutdown complete!")
        sys.exit(0 if success else 1)
        
    except KeyboardInterrupt:
        logger.info("⚠️  Shutdown interrupted by user")
        sys.exit(1)
    except Exception as e:
        logger.error(f"❌ Unexpected error: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()