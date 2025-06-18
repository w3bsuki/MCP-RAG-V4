#!/usr/bin/env python3
"""
MCP-RAG-V4 System Launcher for Claude Code
Opens separate terminals for each agent with Claude integration
"""
import subprocess
import time
import sys
import os
from pathlib import Path
import argparse


class ClaudeSystemLauncher:
    """
    Launcher that opens separate terminals for each agent with Claude Code
    """
    
    def __init__(self, project_root="/home/w3bsuki/MCP-RAG-V4"):
        self.project_root = Path(project_root)
        self.terminals = []
        
    def launch_agent_terminal(self, agent_type: str, window_title: str = None):
        """Launch an agent in a new terminal with Claude Code"""
        
        if window_title is None:
            window_title = f"MCP-RAG-V4 {agent_type.title()} Agent"
        
        # Agent script paths
        agent_scripts = {
            "admin": "agents/admin/admin_agent.py",
            "architect": "agents/architect/architect_agent.py", 
            "builder": "agents/builder/builder_agent.py",
            "validator": "agents/validator/validator_agent.py"
        }
        
        if agent_type not in agent_scripts:
            print(f"❌ Unknown agent type: {agent_type}")
            return False
        
        script_path = self.project_root / agent_scripts[agent_type]
        if not script_path.exists():
            print(f"❌ Agent script not found: {script_path}")
            return False
        
        # Create the command to run in the terminal
        # This will:
        # 1. Change to project directory
        # 2. Activate virtual environment  
        # 3. Start Claude Code with the agent script
        commands = [
            f"cd '{self.project_root}'",
            "source mcp-venv/bin/activate",
            "export PYTHONPATH=$PWD",
            f"echo '🚀 Starting {agent_type.title()} Agent with Claude Code'",
            f"echo '📁 Project: {self.project_root}'",
            f"echo '🤖 Agent: {agent_type}'",
            f"echo '⚙️  Script: {script_path}'",
            "echo ''",
            f"claude --dangerously-skip-permissions {script_path}"
        ]
        
        # Join commands with && for sequential execution
        command_string = " && ".join(commands)
        
        try:
            # Launch terminal with the command
            # Using gnome-terminal (works in WSL2 with X11 forwarding)
            terminal_cmd = [
                "gnome-terminal",
                "--title", window_title,
                "--geometry", "120x30",
                "--", "bash", "-c", 
                f"{command_string}; exec bash"  # Keep terminal open after execution
            ]
            
            print(f"🖥️  Launching {agent_type} agent terminal...")
            process = subprocess.Popen(terminal_cmd)
            self.terminals.append(process)
            
            return True
            
        except FileNotFoundError:
            # Fallback to xterm if gnome-terminal not available
            try:
                terminal_cmd = [
                    "xterm",
                    "-title", window_title,
                    "-geometry", "120x30",
                    "-e", "bash", "-c",
                    f"{command_string}; exec bash"
                ]
                
                print(f"🖥️  Launching {agent_type} agent terminal (xterm)...")
                process = subprocess.Popen(terminal_cmd)
                self.terminals.append(process)
                
                return True
                
            except FileNotFoundError:
                print(f"❌ No suitable terminal emulator found (tried gnome-terminal, xterm)")
                print(f"   Please install gnome-terminal: sudo apt install gnome-terminal")
                return False
                
        except Exception as e:
            print(f"❌ Failed to launch terminal for {agent_type}: {e}")
            return False
    
    def launch_dashboard_terminal(self):
        """Launch dashboard terminal"""
        dashboard_path = self.project_root / "ui" / "dashboard" / "server.py"
        
        commands = [
            f"cd '{self.project_root}'",
            "source mcp-venv/bin/activate",
            "export PYTHONPATH=$PWD",
            "echo '📊 Starting MCP-RAG-V4 Dashboard'",
            f"echo '📁 Project: {self.project_root}'",
            "echo '🌐 Dashboard will be available at: http://localhost:8000'",
            "echo ''",
            f"python {dashboard_path}" if dashboard_path.exists() else "echo 'Dashboard not available'"
        ]
        
        command_string = " && ".join(commands)
        
        try:
            terminal_cmd = [
                "gnome-terminal",
                "--title", "MCP-RAG-V4 Dashboard",
                "--geometry", "100x25",
                "--", "bash", "-c",
                f"{command_string}; exec bash"
            ]
            
            print("📊 Launching dashboard terminal...")
            process = subprocess.Popen(terminal_cmd)
            self.terminals.append(process)
            return True
            
        except Exception as e:
            print(f"⚠️  Could not launch dashboard: {e}")
            return False
    
    def check_prerequisites(self):
        """Check system prerequisites"""
        print("🔍 Checking prerequisites...")
        
        # Check if we're in WSL2
        try:
            with open('/proc/version', 'r') as f:
                version_info = f.read()
                if 'microsoft' not in version_info.lower():
                    print("⚠️  Warning: Not running in WSL2")
        except:
            pass
        
        # Check virtual environment
        venv_path = self.project_root / "mcp-venv"
        if not venv_path.exists():
            print(f"❌ Virtual environment not found: {venv_path}")
            print("   Run: python3 -m venv mcp-venv && source mcp-venv/bin/activate && pip install mcp")
            return False
        
        # Check Claude Code availability
        try:
            result = subprocess.run(["claude", "--version"], capture_output=True, text=True)
            if result.returncode == 0:
                print(f"✓ Claude Code available: {result.stdout.strip()}")
            else:
                print("❌ Claude Code not available")
                print("   Install from: https://github.com/anthropics/claude-code")
                return False
        except FileNotFoundError:
            print("❌ Claude Code not found in PATH")
            print("   Install from: https://github.com/anthropics/claude-code")
            return False
        
        # Check X11 forwarding (for WSL2)
        if "DISPLAY" not in os.environ:
            print("⚠️  X11 DISPLAY not set - terminals may not open")
            print("   For WSL2, install VcXsrv or similar X server")
            print("   Then set: export DISPLAY=:0")
        else:
            print(f"✓ X11 DISPLAY set: {os.environ['DISPLAY']}")
        
        # Check project structure
        required_files = [
            "agents/admin/admin_agent.py",
            "agents/architect/architect_agent.py",
            "agents/builder/builder_agent.py",
            ".mcp.json"
        ]
        
        for file_path in required_files:
            full_path = self.project_root / file_path
            if not full_path.exists():
                print(f"❌ Required file missing: {full_path}")
                return False
        
        print("✓ All prerequisites met")
        return True
    
    def print_startup_info(self):
        """Print startup information"""
        print("\n" + "="*70)
        print("🎛️  MCP-RAG-V4 Claude Code System Launcher")
        print("="*70)
        print(f"📁 Project: {self.project_root}")
        print(f"🔧 Config: {self.project_root}/.mcp.json")
        print(f"📂 Shared: {self.project_root}/shared")
        print("")
        print("🚀 Each agent will launch in its own terminal with Claude Code")
        print("💡 Use '--dangerously-skip-permissions' for full MCP access")
        print("🔗 Agents will communicate via file-based message passing")
        print("")
        print("Terminals will open for:")
        print("  • Admin Agent (orchestration & task management)")
        print("  • Architect Agent (system design & specifications)")  
        print("  • Builder Agent (code implementation)")
        print("  • Dashboard (optional monitoring)")
        print("="*70)
    
    def launch_system(self, agents=None, include_dashboard=False):
        """Launch the complete system"""
        if agents is None:
            agents = ["admin", "architect", "builder"]
        
        self.print_startup_info()
        
        if not self.check_prerequisites():
            print("\n❌ Prerequisites not met. Please fix issues above.")
            return False
        
        print(f"\n🚀 Launching {len(agents)} agents...")
        
        success_count = 0
        
        # Launch each agent in its own terminal
        for i, agent_type in enumerate(agents):
            print(f"\n({i+1}/{len(agents)}) Launching {agent_type} agent...")
            
            if self.launch_agent_terminal(agent_type):
                success_count += 1
                print(f"✓ {agent_type.title()} agent terminal launched")
                # Brief delay between launches
                time.sleep(2)
            else:
                print(f"❌ Failed to launch {agent_type} agent")
        
        # Launch dashboard if requested
        if include_dashboard:
            print(f"\n({len(agents)+1}/{len(agents)+1}) Launching dashboard...")
            if self.launch_dashboard_terminal():
                print("✓ Dashboard terminal launched")
            time.sleep(1)
        
        print(f"\n🎉 System launch complete!")
        print(f"   ✓ {success_count}/{len(agents)} agents launched successfully")
        
        if success_count > 0:
            print("\n📋 Next steps:")
            print("   1. Wait for all terminals to load")
            print("   2. In each terminal, Claude Code will start with the agent")
            print("   3. Use the Admin agent terminal to submit tasks")
            print("   4. Watch agents coordinate through the shared file system")
            print("\n💡 Tips:")
            print("   • Use Ctrl+C in any terminal to stop that agent")
            print("   • Check logs/ directory for detailed logs")
            print("   • shared/ directory contains all agent communications")
            
            return True
        else:
            print("\n❌ No agents launched successfully")
            return False
    
    def cleanup(self):
        """Clean up any remaining processes"""
        for process in self.terminals:
            try:
                if process.poll() is None:
                    process.terminate()
            except:
                pass


def main():
    """Main entry point"""
    parser = argparse.ArgumentParser(
        description="Launch MCP-RAG-V4 system with Claude Code terminals"
    )
    parser.add_argument(
        "--agents",
        nargs="+",
        choices=["admin", "architect", "builder", "validator"],
        default=["admin", "architect", "builder"],
        help="Agents to launch (default: admin architect builder)"
    )
    parser.add_argument(
        "--dashboard",
        action="store_true",
        help="Also launch dashboard terminal"
    )
    parser.add_argument(
        "--project-root",
        default="/home/w3bsuki/MCP-RAG-V4",
        help="Project root directory"
    )
    
    args = parser.parse_args()
    
    # Create launcher
    launcher = ClaudeSystemLauncher(args.project_root)
    
    try:
        # Launch system
        success = launcher.launch_system(
            agents=args.agents,
            include_dashboard=args.dashboard
        )
        
        if success:
            print("\n⏳ System running... Press Ctrl+C to exit")
            try:
                # Wait for user interrupt
                while True:
                    time.sleep(1)
            except KeyboardInterrupt:
                print("\n🛑 Shutting down...")
        
    except Exception as e:
        print(f"\n💥 System error: {e}")
    finally:
        launcher.cleanup()
    
    print("✓ Shutdown complete")


if __name__ == "__main__":
    main()