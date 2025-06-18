#!/usr/bin/env python3
import sys
import os

# Add parent directory to path
parent_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, parent_dir)

# Import and run the server
import subprocess
server_path = os.path.join(os.path.dirname(__file__), "knowledge-base-python", "server.py")
subprocess.run([sys.executable, server_path])