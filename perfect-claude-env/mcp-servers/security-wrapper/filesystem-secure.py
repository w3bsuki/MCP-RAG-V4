#!/usr/bin/env python3
"""
Security wrapper for filesystem MCP server
Adds path whitelisting, confirmations, and audit logging
"""
import json
import os
import sys
from pathlib import Path
from typing import Dict, List, Any, Optional
from datetime import datetime
import hashlib
import subprocess

from mcp import Server
from mcp.types import Tool, Resource, TextContent
import mcp.server.stdio

# Initialize server
server = Server("filesystem-secure")

# Configuration
CONFIG_FILE = Path(os.environ.get("SECURITY_CONFIG", "./security-config.json"))
AUDIT_LOG = Path(os.environ.get("AUDIT_LOG", "./audit.log"))

# Default security configuration
DEFAULT_CONFIG = {
    "whitelist_paths": [
        "/home/w3bsuki/MCP-RAG-V4/perfect-claude-env/git-worktrees",
        "/home/w3bsuki/MCP-RAG-V4/perfect-claude-env/shared"
    ],
    "blacklist_paths": [
        "/etc",
        "/usr",
        "/bin",
        "/sbin",
        "/root",
        "/.ssh",
        "/.aws",
        "/.config"
    ],
    "require_confirmation": ["delete", "move", "chmod", "chown"],
    "max_file_size_mb": 100,
    "allowed_extensions": None,  # None means all allowed
    "blocked_extensions": [".exe", ".dll", ".so", ".dylib"],
    "enable_audit": True,
    "api_keys": {}  # Agent -> API key mapping
}

class SecurityManager:
    def __init__(self):
        self.config = self.load_config()
        self.pending_confirmations = {}
        
    def load_config(self) -> Dict[str, Any]:
        """Load security configuration"""
        if CONFIG_FILE.exists():
            return json.loads(CONFIG_FILE.read_text())
        else:
            # Create default config
            CONFIG_FILE.parent.mkdir(parents=True, exist_ok=True)
            CONFIG_FILE.write_text(json.dumps(DEFAULT_CONFIG, indent=2))
            return DEFAULT_CONFIG
    
    def is_path_allowed(self, path: str) -> Tuple[bool, Optional[str]]:
        """Check if path is allowed"""
        path_obj = Path(path).resolve()
        path_str = str(path_obj)
        
        # Check blacklist first
        for blacklisted in self.config["blacklist_paths"]:
            if path_str.startswith(blacklisted):
                return False, f"Path is in blacklist: {blacklisted}"
        
        # Check whitelist
        allowed = False
        for whitelisted in self.config["whitelist_paths"]:
            if path_str.startswith(whitelisted):
                allowed = True
                break
        
        if not allowed:
            return False, "Path is not in whitelist"
        
        # Check file extension
        if path_obj.is_file():
            ext = path_obj.suffix.lower()
            if self.config.get("blocked_extensions") and ext in self.config["blocked_extensions"]:
                return False, f"File extension {ext} is blocked"
            
            if self.config.get("allowed_extensions") and ext not in self.config["allowed_extensions"]:
                return False, f"File extension {ext} is not allowed"
        
        return True, None
    
    def requires_confirmation(self, operation: str) -> bool:
        """Check if operation requires confirmation"""
        return operation in self.config.get("require_confirmation", [])
    
    def create_confirmation(self, operation: str, details: Dict[str, Any]) -> str:
        """Create confirmation request"""
        confirmation_id = hashlib.sha256(
            f"{operation}{details}{datetime.now().isoformat()}".encode()
        ).hexdigest()[:12]
        
        self.pending_confirmations[confirmation_id] = {
            "operation": operation,
            "details": details,
            "timestamp": datetime.now().isoformat(),
            "expires_at": (datetime.now() + timedelta(minutes=5)).isoformat()
        }
        
        return confirmation_id
    
    def verify_confirmation(self, confirmation_id: str) -> Tuple[bool, Optional[Dict[str, Any]]]:
        """Verify confirmation ID"""
        if confirmation_id not in self.pending_confirmations:
            return False, None
        
        confirmation = self.pending_confirmations[confirmation_id]
        
        # Check expiration
        if datetime.now() > datetime.fromisoformat(confirmation["expires_at"]):
            del self.pending_confirmations[confirmation_id]
            return False, None
        
        # Remove used confirmation
        del self.pending_confirmations[confirmation_id]
        return True, confirmation
    
    def audit_log(self, operation: str, details: Dict[str, Any], result: str, agent: Optional[str] = None):
        """Log operation to audit file"""
        if not self.config.get("enable_audit", True):
            return
        
        log_entry = {
            "timestamp": datetime.now().isoformat(),
            "operation": operation,
            "agent": agent or "unknown",
            "details": details,
            "result": result
        }
        
        # Append to audit log
        with open(AUDIT_LOG, "a") as f:
            f.write(json.dumps(log_entry) + "\n")
    
    def check_api_key(self, agent: str, provided_key: Optional[str]) -> bool:
        """Verify API key for agent"""
        api_keys = self.config.get("api_keys", {})
        if not api_keys:
            return True  # No API keys configured = open access
        
        expected_key = api_keys.get(agent)
        if not expected_key:
            return False  # Agent not authorized
        
        return provided_key == expected_key

# Initialize security manager
security_manager = SecurityManager()

@server.list_tools()
async def list_tools() -> List[Tool]:
    return [
        Tool(
            name="read_file_secure",
            description="Read file with security checks",
            inputSchema={
                "type": "object",
                "properties": {
                    "path": {"type": "string"},
                    "agent": {"type": "string"},
                    "api_key": {"type": "string"}
                },
                "required": ["path", "agent"]
            }
        ),
        Tool(
            name="write_file_secure",
            description="Write file with security checks",
            inputSchema={
                "type": "object",
                "properties": {
                    "path": {"type": "string"},
                    "content": {"type": "string"},
                    "agent": {"type": "string"},
                    "api_key": {"type": "string"},
                    "confirmation_id": {"type": "string"}
                },
                "required": ["path", "content", "agent"]
            }
        ),
        Tool(
            name="delete_file_secure",
            description="Delete file with security checks and confirmation",
            inputSchema={
                "type": "object",
                "properties": {
                    "path": {"type": "string"},
                    "agent": {"type": "string"},
                    "api_key": {"type": "string"},
                    "confirmation_id": {"type": "string"}
                },
                "required": ["path", "agent"]
            }
        ),
        Tool(
            name="list_directory_secure",
            description="List directory contents with security checks",
            inputSchema={
                "type": "object",
                "properties": {
                    "path": {"type": "string"},
                    "agent": {"type": "string"},
                    "api_key": {"type": "string"}
                },
                "required": ["path", "agent"]
            }
        ),
        Tool(
            name="request_confirmation",
            description="Request confirmation for a dangerous operation",
            inputSchema={
                "type": "object",
                "properties": {
                    "operation": {"type": "string"},
                    "details": {"type": "object"},
                    "agent": {"type": "string"}
                },
                "required": ["operation", "details", "agent"]
            }
        )
    ]

@server.call_tool()
async def call_tool(name: str, arguments: Dict[str, Any]) -> List[TextContent]:
    try:
        # Check API key
        agent = arguments.get("agent", "unknown")
        api_key = arguments.get("api_key")
        
        if not security_manager.check_api_key(agent, api_key):
            security_manager.audit_log(name, arguments, "unauthorized", agent)
            return [TextContent(type="text", text=json.dumps({
                "error": "Unauthorized: Invalid or missing API key"
            }))]
        
        if name == "read_file_secure":
            return await read_file_secure(arguments)
        elif name == "write_file_secure":
            return await write_file_secure(arguments)
        elif name == "delete_file_secure":
            return await delete_file_secure(arguments)
        elif name == "list_directory_secure":
            return await list_directory_secure(arguments)
        elif name == "request_confirmation":
            return await request_confirmation(arguments)
        else:
            raise ValueError(f"Unknown tool: {name}")
            
    except Exception as e:
        security_manager.audit_log(name, arguments, f"error: {str(e)}", agent)
        return [TextContent(type="text", text=json.dumps({"error": str(e)}))]

async def read_file_secure(args: Dict[str, Any]) -> List[TextContent]:
    """Read file with security checks"""
    path = args["path"]
    agent = args["agent"]
    
    # Check if path is allowed
    allowed, reason = security_manager.is_path_allowed(path)
    if not allowed:
        security_manager.audit_log("read_file", args, f"denied: {reason}", agent)
        return [TextContent(type="text", text=json.dumps({
            "error": f"Access denied: {reason}"
        }))]
    
    # Check file size
    path_obj = Path(path)
    if path_obj.exists() and path_obj.is_file():
        size_mb = path_obj.stat().st_size / (1024 * 1024)
        max_size = security_manager.config.get("max_file_size_mb", 100)
        if size_mb > max_size:
            security_manager.audit_log("read_file", args, f"denied: file too large ({size_mb:.2f}MB)", agent)
            return [TextContent(type="text", text=json.dumps({
                "error": f"File too large: {size_mb:.2f}MB (max: {max_size}MB)"
            }))]
    
    # Read file
    try:
        content = path_obj.read_text()
        security_manager.audit_log("read_file", args, "success", agent)
        return [TextContent(type="text", text=content)]
    except Exception as e:
        security_manager.audit_log("read_file", args, f"error: {str(e)}", agent)
        return [TextContent(type="text", text=json.dumps({
            "error": f"Failed to read file: {str(e)}"
        }))]

async def write_file_secure(args: Dict[str, Any]) -> List[TextContent]:
    """Write file with security checks"""
    path = args["path"]
    content = args["content"]
    agent = args["agent"]
    confirmation_id = args.get("confirmation_id")
    
    # Check if path is allowed
    allowed, reason = security_manager.is_path_allowed(path)
    if not allowed:
        security_manager.audit_log("write_file", args, f"denied: {reason}", agent)
        return [TextContent(type="text", text=json.dumps({
            "error": f"Access denied: {reason}"
        }))]
    
    # Check if overwriting existing file (requires confirmation)
    path_obj = Path(path)
    if path_obj.exists() and security_manager.requires_confirmation("write"):
        if not confirmation_id:
            security_manager.audit_log("write_file", args, "confirmation_required", agent)
            return [TextContent(type="text", text=json.dumps({
                "error": "Confirmation required to overwrite existing file",
                "action": "Use request_confirmation tool first"
            }))]
        
        # Verify confirmation
        valid, confirmation = security_manager.verify_confirmation(confirmation_id)
        if not valid:
            security_manager.audit_log("write_file", args, "invalid_confirmation", agent)
            return [TextContent(type="text", text=json.dumps({
                "error": "Invalid or expired confirmation ID"
            }))]
    
    # Write file
    try:
        path_obj.parent.mkdir(parents=True, exist_ok=True)
        path_obj.write_text(content)
        security_manager.audit_log("write_file", args, "success", agent)
        return [TextContent(type="text", text=json.dumps({
            "success": True,
            "path": str(path_obj),
            "size": len(content)
        }))]
    except Exception as e:
        security_manager.audit_log("write_file", args, f"error: {str(e)}", agent)
        return [TextContent(type="text", text=json.dumps({
            "error": f"Failed to write file: {str(e)}"
        }))]

async def delete_file_secure(args: Dict[str, Any]) -> List[TextContent]:
    """Delete file with security checks and confirmation"""
    path = args["path"]
    agent = args["agent"]
    confirmation_id = args.get("confirmation_id")
    
    # Always require confirmation for delete
    if not confirmation_id:
        security_manager.audit_log("delete_file", args, "confirmation_required", agent)
        return [TextContent(type="text", text=json.dumps({
            "error": "Confirmation required for delete operation",
            "action": "Use request_confirmation tool first"
        }))]
    
    # Verify confirmation
    valid, confirmation = security_manager.verify_confirmation(confirmation_id)
    if not valid:
        security_manager.audit_log("delete_file", args, "invalid_confirmation", agent)
        return [TextContent(type="text", text=json.dumps({
            "error": "Invalid or expired confirmation ID"
        }))]
    
    # Check if path is allowed
    allowed, reason = security_manager.is_path_allowed(path)
    if not allowed:
        security_manager.audit_log("delete_file", args, f"denied: {reason}", agent)
        return [TextContent(type="text", text=json.dumps({
            "error": f"Access denied: {reason}"
        }))]
    
    # Delete file
    try:
        path_obj = Path(path)
        if path_obj.exists():
            if path_obj.is_file():
                path_obj.unlink()
            else:
                return [TextContent(type="text", text=json.dumps({
                    "error": "Cannot delete directory with this tool"
                }))]
        else:
            return [TextContent(type="text", text=json.dumps({
                "error": "File does not exist"
            }))]
        
        security_manager.audit_log("delete_file", args, "success", agent)
        return [TextContent(type="text", text=json.dumps({
            "success": True,
            "deleted": str(path_obj)
        }))]
    except Exception as e:
        security_manager.audit_log("delete_file", args, f"error: {str(e)}", agent)
        return [TextContent(type="text", text=json.dumps({
            "error": f"Failed to delete file: {str(e)}"
        }))]

async def list_directory_secure(args: Dict[str, Any]) -> List[TextContent]:
    """List directory with security checks"""
    path = args["path"]
    agent = args["agent"]
    
    # Check if path is allowed
    allowed, reason = security_manager.is_path_allowed(path)
    if not allowed:
        security_manager.audit_log("list_directory", args, f"denied: {reason}", agent)
        return [TextContent(type="text", text=json.dumps({
            "error": f"Access denied: {reason}"
        }))]
    
    # List directory
    try:
        path_obj = Path(path)
        if not path_obj.exists():
            return [TextContent(type="text", text=json.dumps({
                "error": "Directory does not exist"
            }))]
        
        if not path_obj.is_dir():
            return [TextContent(type="text", text=json.dumps({
                "error": "Path is not a directory"
            }))]
        
        items = []
        for item in path_obj.iterdir():
            # Check if each item is allowed
            item_allowed, _ = security_manager.is_path_allowed(str(item))
            if item_allowed:
                items.append({
                    "name": item.name,
                    "type": "directory" if item.is_dir() else "file",
                    "size": item.stat().st_size if item.is_file() else None,
                    "modified": item.stat().st_mtime
                })
        
        security_manager.audit_log("list_directory", args, "success", agent)
        return [TextContent(type="text", text=json.dumps({
            "path": str(path_obj),
            "items": items,
            "count": len(items)
        }, indent=2))]
        
    except Exception as e:
        security_manager.audit_log("list_directory", args, f"error: {str(e)}", agent)
        return [TextContent(type="text", text=json.dumps({
            "error": f"Failed to list directory: {str(e)}"
        }))]

async def request_confirmation(args: Dict[str, Any]) -> List[TextContent]:
    """Request confirmation for dangerous operation"""
    operation = args["operation"]
    details = args["details"]
    agent = args["agent"]
    
    confirmation_id = security_manager.create_confirmation(operation, details)
    
    security_manager.audit_log("request_confirmation", args, "created", agent)
    
    return [TextContent(type="text", text=json.dumps({
        "confirmation_id": confirmation_id,
        "operation": operation,
        "details": details,
        "expires_in_minutes": 5,
        "usage": f"Include confirmation_id in your {operation} request"
    }))]

@server.list_resources()
async def list_resources() -> List[Resource]:
    """List security resources"""
    resources = []
    
    # Security configuration
    resources.append(Resource(
        uri="security://config",
        name="Security Configuration",
        description=f"Path whitelist: {len(security_manager.config.get('whitelist_paths', []))} entries",
        mimeType="application/json"
    ))
    
    # Audit log
    if AUDIT_LOG.exists():
        size_kb = AUDIT_LOG.stat().st_size / 1024
        resources.append(Resource(
            uri="security://audit-log",
            name="Audit Log",
            description=f"Size: {size_kb:.2f}KB",
            mimeType="text/plain"
        ))
    
    return resources

async def main():
    """Run the server"""
    async with mcp.server.stdio.stdio_server() as (read_stream, write_stream):
        await server.run(read_stream, write_stream)

if __name__ == "__main__":
    import asyncio
    from datetime import timedelta
    asyncio.run(main())