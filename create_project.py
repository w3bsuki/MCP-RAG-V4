#!/usr/bin/env python3
"""
Project Creation Helper for MCP-RAG-V4
Converts prompts into PRDs and submits to agents
"""
import json
import asyncio
from datetime import datetime
from pathlib import Path
import sys

sys.path.append('.')
from agents.core.agent_runtime import Message, MessageIntent


def create_prd(project_name: str, description: str, features: list) -> dict:
    """Create a Product Requirements Document"""
    return {
        "name": project_name,
        "description": description,
        "version": "1.0.0",
        "created_at": datetime.now().isoformat(),
        "features": features,
        "tech_stack": {
            "language": "python",
            "framework": "fastapi",
            "database": "postgresql"
        },
        "requirements": {
            "functional": [
                f"Implement {feat['name']}" for feat in features
            ],
            "non_functional": [
                "Response time < 200ms",
                "99.9% uptime",
                "Comprehensive logging",
                "Docker containerization"
            ]
        },
        "scale": "medium"
    }


async def submit_project(prd: dict):
    """Submit project to Admin Agent via message queue"""
    msg = Message(
        sender_id="project-creator",
        recipient_id="admin-01",
        intent=MessageIntent.REQUEST,
        task_id=f"project-{datetime.now().strftime('%Y%m%d-%H%M%S')}",
        payload={
            "type": "submit_task",
            "task": {
                "type": "specification",
                "requirements": prd
            }
        }
    )
    
    # Write to shared message log
    shared_dir = Path("shared")
    message_log = shared_dir / "messages.log"
    
    with open(message_log, 'a') as f:
        f.write(msg.to_json() + '\n')
    
    print(f"✅ Project submitted: {prd['name']}")
    print(f"📋 Task ID: {msg.task_id}")


def interactive_mode():
    """Interactive project creation"""
    print("🚀 MCP-RAG-V4 Project Creator")
    print("-" * 40)
    
    # Get project details
    name = input("Project name: ").strip()
    if not name:
        print("❌ Project name required!")
        return
    
    description = input("Description: ").strip()
    if not description:
        print("❌ Description required!")
        return
    
    # Get features
    features = []
    print("\nAdd features (empty name to finish):")
    while True:
        feature_name = input(f"Feature {len(features)+1} name: ").strip()
        if not feature_name:
            break
        
        feature_desc = input(f"Feature {len(features)+1} description: ").strip()
        features.append({
            "name": feature_name,
            "description": feature_desc or f"Implement {feature_name}"
        })
    
    if not features:
        print("❌ At least one feature required!")
        return
    
    # Create PRD
    prd = create_prd(name, description, features)
    
    # Show PRD
    print("\n📄 Generated PRD:")
    print(json.dumps(prd, indent=2))
    
    # Confirm submission
    confirm = input("\nSubmit to agents? (y/n): ").lower()
    if confirm == 'y':
        asyncio.run(submit_project(prd))
    else:
        print("❌ Cancelled")


def from_prompt(prompt: str):
    """Create project from a single prompt"""
    print(f"🤖 Analyzing prompt: {prompt}")
    
    # Simple prompt parsing (in production, use LLM)
    lines = prompt.strip().split('\n')
    name = lines[0].split(':')[0].strip() if lines else "New Project"
    description = lines[0] if lines else prompt
    
    # Extract features from bullet points or sentences
    features = []
    for line in lines[1:]:
        line = line.strip()
        if line.startswith(('-', '*', '•')) or line:
            feature_text = line.lstrip('-*• ')
            if feature_text:
                features.append({
                    "name": feature_text.split()[0].lower(),
                    "description": feature_text
                })
    
    if not features:
        # Default features based on project type
        if 'api' in prompt.lower():
            features = [
                {"name": "auth", "description": "User authentication"},
                {"name": "crud", "description": "CRUD operations"},
                {"name": "docs", "description": "API documentation"}
            ]
        else:
            features = [
                {"name": "core", "description": "Core functionality"},
                {"name": "api", "description": "REST API"},
                {"name": "tests", "description": "Test suite"}
            ]
    
    prd = create_prd(name, description, features)
    print("\n📄 Generated PRD:")
    print(json.dumps(prd, indent=2))
    
    asyncio.run(submit_project(prd))


# Example projects for quick testing
DEMO_PROJECTS = {
    "task-manager": {
        "name": "Task Manager API",
        "description": "RESTful API for task management with user authentication",
        "features": [
            {"name": "auth", "description": "JWT-based authentication"},
            {"name": "tasks", "description": "CRUD operations for tasks"},
            {"name": "users", "description": "User management"},
            {"name": "categories", "description": "Task categorization"}
        ]
    },
    "blog-api": {
        "name": "Blog Platform API",
        "description": "Content management system for blogging",
        "features": [
            {"name": "posts", "description": "Blog post management"},
            {"name": "comments", "description": "Comment system"},
            {"name": "tags", "description": "Post tagging"},
            {"name": "search", "description": "Full-text search"}
        ]
    },
    "ecommerce": {
        "name": "E-commerce API",
        "description": "Online store backend with payment integration",
        "features": [
            {"name": "products", "description": "Product catalog"},
            {"name": "cart", "description": "Shopping cart"},
            {"name": "orders", "description": "Order processing"},
            {"name": "payments", "description": "Payment gateway integration"}
        ]
    }
}


def main():
    """Main entry point"""
    import argparse
    
    parser = argparse.ArgumentParser(description='Create projects for MCP-RAG-V4 agents')
    parser.add_argument('--prompt', '-p', help='Create from prompt')
    parser.add_argument('--demo', '-d', choices=DEMO_PROJECTS.keys(), help='Use demo project')
    parser.add_argument('--interactive', '-i', action='store_true', help='Interactive mode')
    
    args = parser.parse_args()
    
    if args.demo:
        # Use demo project
        demo = DEMO_PROJECTS[args.demo]
        prd = create_prd(demo['name'], demo['description'], demo['features'])
        print(f"📦 Using demo project: {args.demo}")
        print(json.dumps(prd, indent=2))
        asyncio.run(submit_project(prd))
    
    elif args.prompt:
        # Create from prompt
        from_prompt(args.prompt)
    
    else:
        # Interactive mode
        interactive_mode()


if __name__ == "__main__":
    main()