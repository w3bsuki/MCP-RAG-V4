#!/usr/bin/env python3
"""
Advanced Troubleshooting Tool for MCP-RAG-V4
Provides automated diagnosis and fixes for common issues
"""
import os
import sys
import json
import subprocess
import time
import requests
import logging
from pathlib import Path
from typing import Dict, List, Any, Optional, Tuple
from dataclasses import dataclass
from datetime import datetime
import argparse

# Setup logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

@dataclass
class Issue:
    """Represents a system issue"""
    category: str
    severity: str  # critical, high, medium, low
    title: str
    description: str
    fix_command: Optional[str] = None
    fix_description: Optional[str] = None

class MCPTroubleshooter:
    def __init__(self, verbose: bool = False):
        self.verbose = verbose
        self.base_path = Path(__file__).parent.parent
        self.issues: List[Issue] = []
        
        # Expected services and ports
        self.services = {
            "qdrant": {"port": 6333, "health_path": "/health", "name": "Qdrant Vector DB"},
            "redis": {"port": 6379, "health_path": None, "name": "Redis Cache"},
            "prometheus": {"port": 9090, "health_path": "/-/healthy", "name": "Prometheus"},
            "grafana": {"port": 3000, "health_path": "/api/health", "name": "Grafana"},
            "knowledge-base": {"port": 8080, "health_path": "/health", "name": "Knowledge Base Server"},
            "vector-search": {"port": 8081, "health_path": "/health", "name": "Vector Search Server"},
            "filesystem-secure": {"port": 8082, "health_path": "/health", "name": "Filesystem Security Server"},
            "testing-tools": {"port": 8086, "health_path": "/health", "name": "Testing Tools Server"},
            "node-metrics": {"port": 9100, "health_path": "/health", "name": "Node.js Metrics"},
            "python-metrics": {"port": 9200, "health_path": "/health", "name": "Python Metrics"}
        }
    
    def run_diagnosis(self) -> List[Issue]:
        """Run complete system diagnosis"""
        logger.info("🔍 Starting MCP-RAG-V4 system diagnosis...")
        
        # Check system prerequisites
        self._check_prerequisites()
        
        # Check file structure
        self._check_file_structure()
        
        # Check configuration files
        self._check_configurations()
        
        # Check running processes
        self._check_processes()
        
        # Check network connectivity
        self._check_network()
        
        # Check service health
        self._check_service_health()
        
        # Check Docker stack
        self._check_docker_stack()
        
        # Check logs for errors
        self._check_logs()
        
        # Check disk space and resources
        self._check_resources()
        
        return self.issues
    
    def _add_issue(self, category: str, severity: str, title: str, description: str, 
                   fix_command: Optional[str] = None, fix_description: Optional[str] = None):
        """Add an issue to the list"""
        issue = Issue(category, severity, title, description, fix_command, fix_description)
        self.issues.append(issue)
        
        if self.verbose:
            logger.warning(f"{severity.upper()}: {title} - {description}")
    
    def _check_prerequisites(self):
        """Check system prerequisites"""
        logger.info("Checking system prerequisites...")
        
        required_commands = {
            "docker": "Docker for containerization",
            "docker-compose": "Docker Compose for orchestration", 
            "node": "Node.js runtime",
            "npm": "Node.js package manager",
            "python3": "Python 3 runtime",
            "pip": "Python package manager",
            "git": "Git version control"
        }
        
        for cmd, description in required_commands.items():
            if not self._command_exists(cmd):
                self._add_issue(
                    "prerequisites", "critical", 
                    f"{cmd} not installed",
                    f"{description} is required but not found in PATH",
                    f"Install {cmd} for your operating system",
                    f"Visit official documentation to install {cmd}"
                )
    
    def _check_file_structure(self):
        """Check critical file and directory structure"""
        logger.info("Checking file structure...")
        
        critical_files = [
            "package.json",
            "Makefile",
            ".mcp.json", 
            ".env.example",
            "coordination/ACTIVE_TASKS.json",
            "perfect-claude-env/docker-compose.yml"
        ]
        
        critical_dirs = [
            ".worktrees",
            "scripts",
            "coordination", 
            "shared",
            "perfect-claude-env/mcp-servers",
            "tests"
        ]
        
        for file_path in critical_files:
            full_path = self.base_path / file_path
            if not full_path.exists():
                self._add_issue(
                    "structure", "high",
                    f"Missing critical file: {file_path}",
                    f"Required file {file_path} is missing",
                    "./scripts/bootstrap.sh",
                    "Run bootstrap script to recreate missing files"
                )
        
        for dir_path in critical_dirs:
            full_path = self.base_path / dir_path
            if not full_path.exists():
                self._add_issue(
                    "structure", "high",
                    f"Missing critical directory: {dir_path}",
                    f"Required directory {dir_path} is missing",
                    f"mkdir -p {dir_path}",
                    f"Create missing directory {dir_path}"
                )
    
    def _check_configurations(self):
        """Check configuration file validity"""
        logger.info("Checking configuration files...")
        
        # Check JSON files
        json_files = [
            ".mcp.json",
            "coordination/ACTIVE_TASKS.json",
            "package.json"
        ]
        
        for json_file in json_files:
            file_path = self.base_path / json_file
            if file_path.exists():
                try:
                    with open(file_path) as f:
                        json.load(f)
                except json.JSONDecodeError as e:
                    self._add_issue(
                        "config", "high",
                        f"Invalid JSON in {json_file}",
                        f"JSON syntax error: {str(e)}",
                        f"Fix JSON syntax in {json_file}",
                        "Use a JSON validator to fix syntax errors"
                    )
        
        # Check .env file
        env_file = self.base_path / ".env"
        if not env_file.exists():
            self._add_issue(
                "config", "medium",
                "Missing .env file",
                "Environment configuration file not found",
                "cp .env.example .env",
                "Copy example environment file and customize"
            )
    
    def _check_processes(self):
        """Check running MCP server processes"""
        logger.info("Checking running processes...")
        
        # Check PID files
        pid_dir = self.base_path / "logs" / "mcp-servers"
        if pid_dir.exists():
            for pid_file in pid_dir.glob("*.pid"):
                try:
                    with open(pid_file) as f:
                        pid = int(f.read().strip())
                    
                    # Check if process is running
                    try:
                        os.kill(pid, 0)  # Signal 0 just checks if process exists
                    except OSError:
                        service_name = pid_file.stem
                        self._add_issue(
                            "processes", "medium",
                            f"{service_name} process not running",
                            f"PID file exists but process {pid} is not running",
                            "npm run mcp:start:all && python start_all.py",
                            "Restart MCP servers"
                        )
                except (ValueError, IOError):
                    self._add_issue(
                        "processes", "low",
                        f"Invalid PID file: {pid_file.name}",
                        "PID file contains invalid data",
                        f"rm {pid_file}",
                        "Remove invalid PID file"
                    )
    
    def _check_network(self):
        """Check network connectivity and port availability"""
        logger.info("Checking network connectivity...")
        
        for service_name, config in self.services.items():
            port = config["port"]
            if not self._is_port_open("localhost", port):
                self._add_issue(
                    "network", "medium",
                    f"{config['name']} not accessible",
                    f"Port {port} is not responding",
                    "make start",
                    f"Start the {service_name} service"
                )
    
    def _check_service_health(self):
        """Check service health endpoints"""
        logger.info("Checking service health...")
        
        for service_name, config in self.services.items():
            if config["health_path"]:
                url = f"http://localhost:{config['port']}{config['health_path']}"
                try:
                    response = requests.get(url, timeout=5)
                    if response.status_code != 200:
                        self._add_issue(
                            "health", "medium",
                            f"{config['name']} unhealthy",
                            f"Health check failed: HTTP {response.status_code}",
                            "make restart",
                            f"Restart {service_name} service"
                        )
                except requests.RequestException:
                    if self._is_port_open("localhost", config["port"]):
                        self._add_issue(
                            "health", "medium",
                            f"{config['name']} health endpoint not responding",
                            f"Service is running but health endpoint {config['health_path']} not responding",
                            "Check service logs",
                            f"Review logs for {service_name}"
                        )
    
    def _check_docker_stack(self):
        """Check Docker stack status"""
        logger.info("Checking Docker stack...")
        
        if not self._command_exists("docker"):
            return
        
        compose_file = self.base_path / "perfect-claude-env" / "docker-compose.yml"
        if not compose_file.exists():
            self._add_issue(
                "docker", "high",
                "Docker compose file missing",
                "docker-compose.yml not found",
                "Run bootstrap script",
                "Bootstrap script will create necessary Docker files"
            )
            return
        
        try:
            # Check if Docker daemon is running
            result = subprocess.run(
                ["docker", "ps"], 
                capture_output=True, text=True, timeout=10
            )
            
            if result.returncode != 0:
                self._add_issue(
                    "docker", "critical",
                    "Docker daemon not running",
                    "Cannot connect to Docker daemon",
                    "Start Docker daemon",
                    "Start Docker Desktop or systemctl start docker"
                )
                return
            
            # Check docker-compose status
            result = subprocess.run(
                ["docker-compose", "-f", str(compose_file), "ps"],
                capture_output=True, text=True, timeout=10
            )
            
            if "Up" not in result.stdout:
                self._add_issue(
                    "docker", "medium",
                    "Docker stack not running",
                    "Docker compose services are not up",
                    "make start",
                    "Start the Docker stack"
                )
                
        except (subprocess.TimeoutExpired, subprocess.CalledProcessError) as e:
            self._add_issue(
                "docker", "high",
                "Docker command failed",
                f"Docker command error: {str(e)}",
                "Check Docker installation",
                "Verify Docker is properly installed and running"
            )
    
    def _check_logs(self):
        """Check log files for errors"""
        logger.info("Checking logs for errors...")
        
        log_dirs = [
            self.base_path / "logs",
            self.base_path / "logs" / "mcp-servers"
        ]
        
        error_patterns = ["ERROR", "FATAL", "Exception", "Traceback", "failed", "denied"]
        
        for log_dir in log_dirs:
            if log_dir.exists():
                for log_file in log_dir.glob("*.log"):
                    try:
                        with open(log_file) as f:
                            lines = f.readlines()
                        
                        # Check last 100 lines for errors
                        recent_lines = lines[-100:]
                        error_count = 0
                        
                        for line in recent_lines:
                            for pattern in error_patterns:
                                if pattern.lower() in line.lower():
                                    error_count += 1
                                    break
                        
                        if error_count > 5:  # More than 5 errors in recent logs
                            self._add_issue(
                                "logs", "medium",
                                f"Multiple errors in {log_file.name}",
                                f"Found {error_count} errors in recent log entries",
                                f"tail -50 {log_file}",
                                "Review recent log entries for specific errors"
                            )
                            
                    except IOError:
                        continue
    
    def _check_resources(self):
        """Check system resources (disk, memory)"""
        logger.info("Checking system resources...")
        
        # Check disk space
        try:
            import shutil
            total, used, free = shutil.disk_usage(self.base_path)
            usage_percent = (used / total) * 100
            
            if usage_percent > 95:
                self._add_issue(
                    "resources", "critical",
                    "Disk space critical",
                    f"Disk usage: {usage_percent:.1f}%",
                    "make clean",
                    "Clean up temporary files and logs"
                )
            elif usage_percent > 85:
                self._add_issue(
                    "resources", "medium",
                    "Disk space low",
                    f"Disk usage: {usage_percent:.1f}%", 
                    "make clean",
                    "Consider cleaning up old logs and temporary files"
                )
                
        except Exception:
            pass  # Skip if can't check disk space
    
    def _command_exists(self, command: str) -> bool:
        """Check if a command exists in PATH"""
        return subprocess.run(
            ["which", command], 
            capture_output=True
        ).returncode == 0
    
    def _is_port_open(self, host: str, port: int) -> bool:
        """Check if a port is open"""
        import socket
        try:
            with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as sock:
                sock.settimeout(3)
                result = sock.connect_ex((host, port))
                return result == 0
        except Exception:
            return False
    
    def print_report(self):
        """Print diagnosis report"""
        print("\n" + "="*60)
        print("🔧 MCP-RAG-V4 TROUBLESHOOTING REPORT")
        print("="*60)
        print(f"Generated: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        print(f"Total Issues Found: {len(self.issues)}")
        print()
        
        if not self.issues:
            print("✅ No issues found! System appears healthy.")
            return
        
        # Group issues by severity
        by_severity = {}
        for issue in self.issues:
            if issue.severity not in by_severity:
                by_severity[issue.severity] = []
            by_severity[issue.severity].append(issue)
        
        # Print by severity
        severity_order = ["critical", "high", "medium", "low"]
        severity_icons = {
            "critical": "🔴",
            "high": "🟠", 
            "medium": "🟡",
            "low": "🔵"
        }
        
        for severity in severity_order:
            if severity in by_severity:
                print(f"{severity_icons[severity]} {severity.upper()} ISSUES:")
                print("-" * 40)
                
                for i, issue in enumerate(by_severity[severity], 1):
                    print(f"{i}. {issue.title}")
                    print(f"   Category: {issue.category}")
                    print(f"   Description: {issue.description}")
                    
                    if issue.fix_command:
                        print(f"   🔧 Fix: {issue.fix_command}")
                    if issue.fix_description:
                        print(f"   💡 Help: {issue.fix_description}")
                    print()
        
        # Quick fix summary
        print("🚀 QUICK FIXES:")
        print("-" * 20)
        
        common_fixes = [
            ("Start services", "make start"),
            ("Restart services", "make restart"), 
            ("Check status", "make status"),
            ("View logs", "make logs"),
            ("Bootstrap system", "./scripts/bootstrap.sh"),
            ("Clean temporary files", "make clean")
        ]
        
        for desc, cmd in common_fixes:
            print(f"• {desc}: {cmd}")
        
        print()
        print("For detailed debugging: ./scripts/debug-system.sh --all --verbose")

def main():
    parser = argparse.ArgumentParser(description="MCP-RAG-V4 Troubleshooting Tool")
    parser.add_argument("-v", "--verbose", action="store_true", help="Verbose output")
    parser.add_argument("--json", action="store_true", help="Output JSON format")
    parser.add_argument("--fix", action="store_true", help="Attempt to fix issues automatically")
    
    args = parser.parse_args()
    
    troubleshooter = MCPTroubleshooter(verbose=args.verbose)
    issues = troubleshooter.run_diagnosis()
    
    if args.json:
        # Output JSON for programmatic use
        issue_data = []
        for issue in issues:
            issue_data.append({
                "category": issue.category,
                "severity": issue.severity,
                "title": issue.title,
                "description": issue.description,
                "fix_command": issue.fix_command,
                "fix_description": issue.fix_description
            })
        
        print(json.dumps({
            "timestamp": datetime.now().isoformat(),
            "total_issues": len(issues),
            "issues": issue_data
        }, indent=2))
    else:
        troubleshooter.print_report()
    
    # Exit with error code if critical issues found
    critical_issues = [i for i in issues if i.severity == "critical"]
    if critical_issues:
        sys.exit(1)

if __name__ == "__main__":
    main()