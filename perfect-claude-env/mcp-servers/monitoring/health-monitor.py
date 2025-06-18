#!/usr/bin/env python3
"""
Health Monitoring MCP Server
Monitors all MCP servers and system components
"""
import json
import os
import time
import asyncio
import subprocess
from pathlib import Path
from typing import Dict, List, Any, Optional
from datetime import datetime, timedelta
import psutil
import requests

from mcp import Server
from mcp.types import Tool, Resource, TextContent
import mcp.server.stdio

# Initialize server
server = Server("health-monitor")

# Configuration
LOGS_DIR = Path(os.environ.get("LOGS_DIR", "/home/w3bsuki/MCP-RAG-V4/perfect-claude-env/logs"))
HEALTH_CHECK_INTERVAL = int(os.environ.get("HEALTH_CHECK_INTERVAL", "30"))  # seconds
QDRANT_URL = os.environ.get("QDRANT_URL", "http://localhost:6333")
REDIS_URL = os.environ.get("REDIS_URL", "redis://localhost:6379")

# Services to monitor
SERVICES = {
    "qdrant": {
        "type": "http",
        "url": f"{QDRANT_URL}/health",
        "expected_status": 200,
        "timeout": 5
    },
    "redis": {
        "type": "redis",
        "url": REDIS_URL,
        "timeout": 5
    },
    "docker": {
        "type": "docker",
        "containers": ["mcp-rag-qdrant", "mcp-rag-redis"]
    }
}

class HealthMonitor:
    def __init__(self):
        self.health_status = {}
        self.metrics = {
            "system": {},
            "services": {},
            "performance": {}
        }
        self.alerts = []
        self.last_check = None
        
    async def check_system_resources(self) -> Dict[str, Any]:
        """Check system resource usage"""
        cpu_percent = psutil.cpu_percent(interval=1)
        memory = psutil.virtual_memory()
        disk = psutil.disk_usage('/')
        
        return {
            "cpu": {
                "percent": cpu_percent,
                "cores": psutil.cpu_count(),
                "status": "warning" if cpu_percent > 80 else "healthy"
            },
            "memory": {
                "percent": memory.percent,
                "available_gb": round(memory.available / (1024**3), 2),
                "total_gb": round(memory.total / (1024**3), 2),
                "status": "warning" if memory.percent > 80 else "healthy"
            },
            "disk": {
                "percent": round(disk.percent, 2),
                "free_gb": round(disk.free / (1024**3), 2),
                "total_gb": round(disk.total / (1024**3), 2),
                "status": "warning" if disk.percent > 80 else "healthy"
            }
        }
    
    async def check_service(self, name: str, config: Dict[str, Any]) -> Dict[str, Any]:
        """Check individual service health"""
        service_status = {
            "name": name,
            "status": "unknown",
            "message": "",
            "response_time": None,
            "timestamp": datetime.now().isoformat()
        }
        
        try:
            start_time = time.time()
            
            if config["type"] == "http":
                response = requests.get(
                    config["url"], 
                    timeout=config.get("timeout", 5)
                )
                response_time = (time.time() - start_time) * 1000
                
                if response.status_code == config.get("expected_status", 200):
                    service_status.update({
                        "status": "healthy",
                        "message": f"HTTP {response.status_code}",
                        "response_time": round(response_time, 2)
                    })
                else:
                    service_status.update({
                        "status": "unhealthy",
                        "message": f"HTTP {response.status_code}",
                        "response_time": round(response_time, 2)
                    })
            
            elif config["type"] == "redis":
                import redis
                r = redis.from_url(config["url"])
                r.ping()
                response_time = (time.time() - start_time) * 1000
                
                service_status.update({
                    "status": "healthy",
                    "message": "Redis PING successful",
                    "response_time": round(response_time, 2)
                })
            
            elif config["type"] == "docker":
                result = subprocess.run(
                    ["docker", "ps", "--format", "json"],
                    capture_output=True,
                    text=True,
                    timeout=config.get("timeout", 5)
                )
                
                if result.returncode == 0:
                    running_containers = []
                    for line in result.stdout.strip().split('\n'):
                        if line:
                            container = json.loads(line)
                            running_containers.append(container['Names'])
                    
                    expected_containers = config.get("containers", [])
                    missing = [c for c in expected_containers if c not in running_containers]
                    
                    if not missing:
                        service_status.update({
                            "status": "healthy",
                            "message": f"All containers running: {', '.join(expected_containers)}",
                            "response_time": round((time.time() - start_time) * 1000, 2)
                        })
                    else:
                        service_status.update({
                            "status": "unhealthy",
                            "message": f"Missing containers: {', '.join(missing)}",
                            "response_time": round((time.time() - start_time) * 1000, 2)
                        })
                else:
                    service_status.update({
                        "status": "unhealthy",
                        "message": "Docker command failed",
                        "response_time": round((time.time() - start_time) * 1000, 2)
                    })
                    
        except Exception as e:
            service_status.update({
                "status": "unhealthy",
                "message": str(e),
                "response_time": round((time.time() - start_time) * 1000, 2) if 'start_time' in locals() else None
            })
        
        return service_status
    
    async def check_log_health(self) -> Dict[str, Any]:
        """Check log file sizes and recent activity"""
        log_status = {
            "total_logs": 0,
            "total_size_mb": 0,
            "recent_activity": {},
            "large_logs": []
        }
        
        if LOGS_DIR.exists():
            for log_file in LOGS_DIR.glob("*.log"):
                size_mb = log_file.stat().st_size / (1024 * 1024)
                log_status["total_size_mb"] += size_mb
                log_status["total_logs"] += 1
                
                # Check for large log files
                if size_mb > 100:  # > 100MB
                    log_status["large_logs"].append({
                        "file": log_file.name,
                        "size_mb": round(size_mb, 2)
                    })
                
                # Check recent activity (last 5 minutes)
                try:
                    modified_time = datetime.fromtimestamp(log_file.stat().st_mtime)
                    if datetime.now() - modified_time < timedelta(minutes=5):
                        log_status["recent_activity"][log_file.name] = modified_time.isoformat()
                except:
                    pass
        
        log_status["total_size_mb"] = round(log_status["total_size_mb"], 2)
        return log_status
    
    async def generate_alerts(self):
        """Generate alerts based on health status"""
        new_alerts = []
        
        # System resource alerts
        system = self.metrics.get("system", {})
        if system.get("cpu", {}).get("percent", 0) > 90:
            new_alerts.append({
                "level": "critical",
                "component": "system",
                "message": f"CPU usage critical: {system['cpu']['percent']}%",
                "timestamp": datetime.now().isoformat()
            })
        
        if system.get("memory", {}).get("percent", 0) > 90:
            new_alerts.append({
                "level": "critical",
                "component": "system",
                "message": f"Memory usage critical: {system['memory']['percent']}%",
                "timestamp": datetime.now().isoformat()
            })
        
        # Service alerts
        for service_name, service_health in self.health_status.items():
            if service_health.get("status") == "unhealthy":
                new_alerts.append({
                    "level": "warning",
                    "component": service_name,
                    "message": f"{service_name} is unhealthy: {service_health.get('message', 'Unknown error')}",
                    "timestamp": datetime.now().isoformat()
                })
        
        # Keep only recent alerts (last hour)
        cutoff_time = datetime.now() - timedelta(hours=1)
        self.alerts = [
            alert for alert in self.alerts 
            if datetime.fromisoformat(alert["timestamp"]) > cutoff_time
        ] + new_alerts
    
    async def perform_health_check(self):
        """Perform comprehensive health check"""
        self.last_check = datetime.now()
        
        # Check system resources
        self.metrics["system"] = await self.check_system_resources()
        
        # Check services
        service_results = {}
        for service_name, service_config in SERVICES.items():
            service_results[service_name] = await self.check_service(service_name, service_config)
        
        self.health_status = service_results
        
        # Check logs
        self.metrics["logs"] = await self.check_log_health()
        
        # Generate alerts
        await self.generate_alerts()
        
        # Calculate overall health
        unhealthy_services = [
            name for name, status in self.health_status.items() 
            if status.get("status") == "unhealthy"
        ]
        
        critical_alerts = [
            alert for alert in self.alerts 
            if alert.get("level") == "critical"
        ]
        
        if critical_alerts:
            overall_status = "critical"
        elif unhealthy_services:
            overall_status = "warning"
        else:
            overall_status = "healthy"
        
        self.metrics["overall"] = {
            "status": overall_status,
            "unhealthy_services": unhealthy_services,
            "critical_alerts": len(critical_alerts),
            "last_check": self.last_check.isoformat()
        }

# Initialize health monitor
health_monitor = HealthMonitor()

@server.list_tools()
async def list_tools() -> List[Tool]:
    return [
        Tool(
            name="get_health_status",
            description="Get comprehensive health status of all components",
            inputSchema={
                "type": "object",
                "properties": {
                    "include_metrics": {"type": "boolean", "default": True},
                    "include_alerts": {"type": "boolean", "default": True}
                }
            }
        ),
        Tool(
            name="run_health_check",
            description="Trigger immediate health check",
            inputSchema={
                "type": "object",
                "properties": {}
            }
        ),
        Tool(
            name="get_service_metrics",
            description="Get detailed metrics for a specific service",
            inputSchema={
                "type": "object",
                "properties": {
                    "service": {"type": "string", "enum": list(SERVICES.keys())}
                },
                "required": ["service"]
            }
        ),
        Tool(
            name="get_system_metrics",
            description="Get detailed system resource metrics",
            inputSchema={
                "type": "object",
                "properties": {
                    "include_processes": {"type": "boolean", "default": False}
                }
            }
        ),
        Tool(
            name="clear_alerts",
            description="Clear all current alerts",
            inputSchema={
                "type": "object",
                "properties": {
                    "level": {"type": "string", "enum": ["warning", "critical"], "description": "Clear only alerts of this level"}
                }
            }
        )
    ]

@server.call_tool()
async def call_tool(name: str, arguments: Dict[str, Any]) -> List[TextContent]:
    try:
        if name == "get_health_status":
            return await get_health_status(arguments)
        elif name == "run_health_check":
            return await run_health_check(arguments)
        elif name == "get_service_metrics":
            return await get_service_metrics(arguments)
        elif name == "get_system_metrics":
            return await get_system_metrics(arguments)
        elif name == "clear_alerts":
            return await clear_alerts(arguments)
        else:
            raise ValueError(f"Unknown tool: {name}")
    except Exception as e:
        return [TextContent(type="text", text=json.dumps({"error": str(e)}))]

async def get_health_status(args: Dict[str, Any]) -> List[TextContent]:
    """Get comprehensive health status"""
    # Ensure we have recent data
    if not health_monitor.last_check or \
       datetime.now() - health_monitor.last_check > timedelta(minutes=1):
        await health_monitor.perform_health_check()
    
    result = {
        "overall": health_monitor.metrics.get("overall", {}),
        "services": health_monitor.health_status,
        "last_check": health_monitor.last_check.isoformat() if health_monitor.last_check else None
    }
    
    if args.get("include_metrics", True):
        result["metrics"] = health_monitor.metrics
    
    if args.get("include_alerts", True):
        result["alerts"] = health_monitor.alerts
    
    return [TextContent(type="text", text=json.dumps(result, indent=2))]

async def run_health_check(args: Dict[str, Any]) -> List[TextContent]:
    """Trigger immediate health check"""
    await health_monitor.perform_health_check()
    
    return [TextContent(type="text", text=json.dumps({
        "success": True,
        "check_completed": health_monitor.last_check.isoformat(),
        "overall_status": health_monitor.metrics.get("overall", {}).get("status", "unknown"),
        "services_checked": len(health_monitor.health_status)
    }))]

async def get_service_metrics(args: Dict[str, Any]) -> List[TextContent]:
    """Get detailed metrics for specific service"""
    service = args["service"]
    
    if service not in SERVICES:
        return [TextContent(type="text", text=json.dumps({
            "error": f"Unknown service: {service}"
        }))]
    
    # Get current status
    service_status = health_monitor.health_status.get(service, {})
    
    # Additional service-specific metrics
    extra_metrics = {}
    if service == "qdrant":
        try:
            response = requests.get(f"{QDRANT_URL}/collections", timeout=5)
            if response.status_code == 200:
                collections = response.json()
                extra_metrics["collections"] = collections
        except:
            pass
    
    result = {
        "service": service,
        "status": service_status,
        "config": SERVICES[service],
        "additional_metrics": extra_metrics,
        "timestamp": datetime.now().isoformat()
    }
    
    return [TextContent(type="text", text=json.dumps(result, indent=2))]

async def get_system_metrics(args: Dict[str, Any]) -> List[TextContent]:
    """Get detailed system metrics"""
    system_metrics = await health_monitor.check_system_resources()
    
    if args.get("include_processes", False):
        # Get top processes by CPU and memory
        processes = []
        for proc in psutil.process_iter(['pid', 'name', 'cpu_percent', 'memory_percent']):
            try:
                processes.append(proc.info)
            except (psutil.NoSuchProcess, psutil.AccessDenied):
                pass
        
        # Sort by CPU usage
        top_cpu = sorted(processes, key=lambda x: x['cpu_percent'] or 0, reverse=True)[:10]
        # Sort by memory usage
        top_memory = sorted(processes, key=lambda x: x['memory_percent'] or 0, reverse=True)[:10]
        
        system_metrics["top_processes"] = {
            "cpu": top_cpu,
            "memory": top_memory
        }
    
    return [TextContent(type="text", text=json.dumps(system_metrics, indent=2))]

async def clear_alerts(args: Dict[str, Any]) -> List[TextContent]:
    """Clear alerts"""
    original_count = len(health_monitor.alerts)
    
    if "level" in args:
        # Clear only specific level
        health_monitor.alerts = [
            alert for alert in health_monitor.alerts 
            if alert.get("level") != args["level"]
        ]
    else:
        # Clear all alerts
        health_monitor.alerts = []
    
    cleared_count = original_count - len(health_monitor.alerts)
    
    return [TextContent(type="text", text=json.dumps({
        "success": True,
        "cleared_alerts": cleared_count,
        "remaining_alerts": len(health_monitor.alerts)
    }))]

@server.list_resources()
async def list_resources() -> List[Resource]:
    """List monitoring resources"""
    resources = []
    
    # Health dashboard
    resources.append(Resource(
        uri="monitoring://health-dashboard",
        name="Health Dashboard",
        description=f"Overall status: {health_monitor.metrics.get('overall', {}).get('status', 'unknown')}",
        mimeType="application/json"
    ))
    
    # Service status
    for service_name in SERVICES.keys():
        status = health_monitor.health_status.get(service_name, {}).get("status", "unknown")
        resources.append(Resource(
            uri=f"monitoring://service/{service_name}",
            name=f"Service: {service_name}",
            description=f"Status: {status}",
            mimeType="application/json"
        ))
    
    # Alerts
    if health_monitor.alerts:
        critical_count = len([a for a in health_monitor.alerts if a.get("level") == "critical"])
        warning_count = len([a for a in health_monitor.alerts if a.get("level") == "warning"])
        resources.append(Resource(
            uri="monitoring://alerts",
            name="Active Alerts",
            description=f"Critical: {critical_count}, Warnings: {warning_count}",
            mimeType="application/json"
        ))
    
    return resources

async def main():
    """Run the server with background health checking"""
    # Start background health checking
    async def background_health_check():
        while True:
            try:
                await health_monitor.perform_health_check()
                await asyncio.sleep(HEALTH_CHECK_INTERVAL)
            except Exception as e:
                print(f"Background health check error: {e}")
                await asyncio.sleep(HEALTH_CHECK_INTERVAL)
    
    # Start background task
    health_task = asyncio.create_task(background_health_check())
    
    try:
        async with mcp.server.stdio.stdio_server() as (read_stream, write_stream):
            await server.run(read_stream, write_stream)
    finally:
        health_task.cancel()

if __name__ == "__main__":
    import asyncio
    asyncio.run(main())