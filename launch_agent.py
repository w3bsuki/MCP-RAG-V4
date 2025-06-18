#!/usr/bin/env python3
"""
Agent Launcher for Claude Code instances
Launches architect, builder, or validator agents with proper MCP configuration
"""
import os
import sys
import subprocess
from pathlib import Path


def launch_agent(agent_type: str):
    """Launch a specific agent type"""
    
    if agent_type not in ['architect', 'builder', 'validator']:
        print(f"❌ Invalid agent type: {agent_type}")
        print("Valid types: architect, builder, validator")
        return False
    
    # Set up paths
    project_root = Path.cwd()
    workspace_dir = project_root / "workspaces" / agent_type
    mcp_config = project_root / f".mcp.{agent_type}.json"
    
    # Ensure workspace exists
    workspace_dir.mkdir(parents=True, exist_ok=True)
    
    # Check MCP config exists
    if not mcp_config.exists():
        print(f"❌ MCP config not found: {mcp_config}")
        return False
    
    # Set environment variables
    env = os.environ.copy()
    env['MCP_CONFIG_PATH'] = str(mcp_config)
    env['AGENT_TYPE'] = agent_type
    env['WORKSPACE_DIR'] = str(workspace_dir)
    
    print(f"🚀 Launching {agent_type} agent...")
    print(f"📁 Workspace: {workspace_dir}")
    print(f"⚙️  MCP Config: {mcp_config}")
    print(f"📋 Instructions: {workspace_dir}/AGENT_INSTRUCTIONS.md")
    print("")
    print("The agent should:")
    print(f"1. Read {workspace_dir}/AGENT_INSTRUCTIONS.md for role-specific tasks")
    print("2. Use MCP memory server to check for tasks")
    print("3. Follow the communication protocol")
    print("")
    print("Example commands:")
    print("• memory get task_queue")
    print("• filesystem read_file /shared/tasks.json")
    print("• filesystem write_file /shared/specifications/spec-xyz.yaml")
    print("")
    
    # Launch Claude Code with MCP config
    try:
        cmd = [
            "claude-code",
            "--mcp-config", str(mcp_config),
            "--working-directory", str(workspace_dir)
        ]
        
        print(f"🔧 Command: {' '.join(cmd)}")
        print("=" * 60)
        
        # Start Claude Code process
        result = subprocess.run(cmd, env=env, cwd=workspace_dir)
        return result.returncode == 0
        
    except FileNotFoundError:
        print("❌ claude-code command not found!")
        print("Make sure Claude Code is installed and in your PATH")
        print("")
        print("Alternative: Start Claude Code manually with:")
        print(f"cd {workspace_dir}")
        print(f"claude-code --mcp-config {mcp_config}")
        return False
    except KeyboardInterrupt:
        print(f"\n🛑 {agent_type} agent stopped")
        return True


if __name__ == "__main__":
    if len(sys.argv) != 2:
        print("Usage: python launch_agent.py <agent_type>")
        print("Agent types: architect, builder, validator")
        print("")
        print("Examples:")
        print("  python launch_agent.py architect")
        print("  python launch_agent.py builder") 
        print("  python launch_agent.py validator")
        sys.exit(1)
    
    agent_type = sys.argv[1].lower()
    success = launch_agent(agent_type)
    sys.exit(0 if success else 1)