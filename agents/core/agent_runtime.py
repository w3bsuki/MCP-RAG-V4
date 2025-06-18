#!/usr/bin/env python3
"""
Agent Runtime Base Class for MCP-RAG-V4
Implements FIPA-compliant message passing with Redis/file fallback
"""
import asyncio
import json
import os
import uuid
from abc import ABC, abstractmethod
from dataclasses import dataclass, asdict, field
from datetime import datetime, timezone
from enum import Enum
from pathlib import Path
from typing import Dict, List, Optional, Any, Callable, Set
import logging
from contextlib import asynccontextmanager

# MCP client integration
from .simple_mcp_client import SimpleMCPClient, get_simple_mcp_client

try:
    import redis.asyncio as redis
except ImportError:
    redis = None

# Message Intent Types (FIPA-compliant)
class MessageIntent(str, Enum):
    REQUEST = "REQUEST"              # Request action/information
    INFORM = "INFORM"               # Provide information
    PROPOSE = "PROPOSE"             # Propose to perform action
    ACCEPT_PROPOSAL = "ACCEPT_PROPOSAL"  # Accept proposal
    REJECT_PROPOSAL = "REJECT_PROPOSAL"  # Reject proposal
    REPORT_STATUS = "REPORT_STATUS"      # Report task status
    ERROR = "ERROR"                      # Report error
    ACK = "ACK"                         # Acknowledge receipt

# Task States
class TaskState(str, Enum):
    PENDING = "pending"
    ASSIGNED = "assigned"
    EXECUTING = "executing"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"

@dataclass
class Message:
    """Standard message envelope for agent communication"""
    sender_id: str
    recipient_id: str  # Use "*" for broadcast
    intent: MessageIntent
    task_id: str
    payload: Dict[str, Any]
    timestamp: datetime = field(default_factory=lambda: datetime.now(timezone.utc))
    retry_count: int = 0
    message_id: str = field(default_factory=lambda: str(uuid.uuid4()))
    
    def to_json(self) -> str:
        """Serialize to JSON with datetime handling"""
        data = asdict(self)
        data['timestamp'] = self.timestamp.isoformat()
        data['intent'] = self.intent.value
        return json.dumps(data)
    
    @classmethod
    def from_json(cls, json_str: str) -> 'Message':
        """Deserialize from JSON"""
        data = json.loads(json_str)
        data['timestamp'] = datetime.fromisoformat(data['timestamp'])
        data['intent'] = MessageIntent(data['intent'])
        return cls(**data)


class AgentRuntime(ABC):
    """
    Base runtime for all agents in the MCP-RAG-V4 system
    Handles message passing, task lifecycle, and coordination
    """
    
    def __init__(self, agent_id: str, agent_role: str, config: Dict[str, Any]):
        self.agent_id = agent_id
        self.agent_role = agent_role
        self.config = config
        self.running = False
        
        # Message handling
        self.seen_messages: Set[str] = set()
        self.message_handlers: Dict[MessageIntent, Callable] = {}
        
        # Redis connection (optional)
        self.redis_client: Optional[redis.Redis] = None
        self.redis_enabled = config.get('enable_redis', False)  # Default to False for Claude Code
        self.redis_url = config.get('redis_url', 'redis://localhost:6379')
        
        # File-based fallback
        self.shared_dir = Path(config.get('shared_dir', 'shared'))
        self.message_log = self.shared_dir / 'messages.log'
        self.file_position = 0
        
        # MCP client integration
        self.mcp_client: Optional[SimpleMCPClient] = None
        self.mcp_enabled = config.get('enable_mcp', True)  # Default to True
        self.mcp_config_path = config.get('mcp_config', '/home/w3bsuki/MCP-RAG-V4/.mcp.json')
        
        # Ensure shared directories exist
        self.shared_dir.mkdir(exist_ok=True)
        (self.shared_dir / 'specs').mkdir(exist_ok=True)
        (self.shared_dir / 'builds').mkdir(exist_ok=True)
        (self.shared_dir / 'reports').mkdir(exist_ok=True)
        
        # Logging
        self.logger = logging.getLogger(f"{self.agent_role}.{self.agent_id}")
        self._setup_handlers()
        
        # Initialize MCP client immediately
        if self.mcp_enabled:
            try:
                self.mcp_client = SimpleMCPClient(self.mcp_config_path)
                self.logger.info("Simple MCP client initialized")
            except Exception as e:
                self.logger.error(f"Failed to initialize MCP client: {e}")
                self.mcp_client = None
    
    def _setup_handlers(self):
        """Setup default message handlers"""
        self.register_handler(MessageIntent.REQUEST, self.handle_request)
        self.register_handler(MessageIntent.INFORM, self.handle_inform)
        self.register_handler(MessageIntent.PROPOSE, self.handle_propose)
        self.register_handler(MessageIntent.ACCEPT_PROPOSAL, self.handle_accept)
        self.register_handler(MessageIntent.REJECT_PROPOSAL, self.handle_reject)
        self.register_handler(MessageIntent.REPORT_STATUS, self.handle_status)
        self.register_handler(MessageIntent.ERROR, self.handle_error)
        self.register_handler(MessageIntent.ACK, self.handle_ack)
    
    @asynccontextmanager
    async def _redis_connection(self):
        """Context manager for Redis connection"""
        if not self.redis_enabled or not redis:
            yield None
            return
            
        try:
            if not self.redis_client:
                self.redis_client = await redis.from_url(self.redis_url)
            yield self.redis_client
        except Exception as e:
            self.logger.warning(f"Redis connection failed: {e}, falling back to file")
            yield None
    
    async def start(self):
        """Start the agent runtime"""
        self.running = True
        self.logger.info(f"Starting {self.agent_role} agent: {self.agent_id}")
        if not self.redis_enabled:
            self.logger.info("Using file-based message passing (Redis disabled)")
        
        # MCP client should already be initialized in constructor
        
        # Initialize agent-specific resources
        await self.initialize()
        
        # Main runtime loop
        try:
            await self.run()
        except KeyboardInterrupt:
            self.logger.info("Received shutdown signal")
        except Exception as e:
            self.logger.error(f"Agent runtime error: {e}", exc_info=True)
        finally:
            await self.cleanup()
    
    async def run(self):
        """Main agent runtime loop"""
        idle_count = 0
        max_idle_cycles = 10
        
        while self.running:
            try:
                # Pull next message
                message = await self.next_message(timeout=5.0)
                
                if message is None:
                    idle_count += 1
                    if idle_count >= max_idle_cycles:
                        # Do periodic tasks when idle
                        await self.on_idle()
                        idle_count = 0
                    await asyncio.sleep(0.5)
                    continue
                
                idle_count = 0
                
                # Deduplicate
                if message.message_id in self.seen_messages:
                    self.logger.debug(f"Skipping duplicate message: {message.message_id}")
                    continue
                
                self.seen_messages.add(message.message_id)
                
                # Route message
                await self.route_message(message)
                
            except Exception as e:
                self.logger.error(f"Error processing message: {e}", exc_info=True)
                await asyncio.sleep(1)
    
    async def next_message(self, timeout: float = 5.0) -> Optional[Message]:
        """Get next message from queue (Redis or file)"""
        # Try Redis first
        async with self._redis_connection() as redis_conn:
            if redis_conn:
                try:
                    # Check personal queue and broadcast queue
                    queues = [
                        f"queue:{self.agent_id}",
                        "queue:__broadcast__"
                    ]
                    
                    result = await redis_conn.blpop(queues, timeout=int(timeout))
                    if result:
                        _, message_data = result
                        return Message.from_json(message_data.decode())
                except Exception as e:
                    self.logger.error(f"Redis read error: {e}")
        
        # Fallback to file
        return await self._read_file_queue()
    
    async def _read_file_queue(self) -> Optional[Message]:
        """Read messages from file-based queue"""
        if not self.message_log.exists():
            return None
            
        try:
            with open(self.message_log, 'r') as f:
                # Read all lines and track position
                lines = f.readlines()
                
                # Start from where we left off
                for i in range(self.file_position, len(lines)):
                    line = lines[i].strip()
                    if not line:
                        continue
                        
                    try:
                        message = Message.from_json(line)
                        
                        # Check if message is for us
                        if (message.recipient_id == self.agent_id or 
                            message.recipient_id == "*"):
                            self.file_position = i + 1
                            return message
                    except json.JSONDecodeError:
                        self.logger.warning(f"Invalid message in log: {line}")
                
                self.file_position = len(lines)
                
        except Exception as e:
            self.logger.error(f"File queue read error: {e}")
            
        return None
    
    async def send_message(self, message: Message):
        """Send message to another agent"""
        self.logger.info(f"Sending {message.intent} to {message.recipient_id} for task {message.task_id}")
        
        # Try Redis first
        async with self._redis_connection() as redis_conn:
            if redis_conn:
                try:
                    queue_name = f"queue:{message.recipient_id}"
                    if message.recipient_id == "*":
                        queue_name = "queue:__broadcast__"
                    
                    await redis_conn.lpush(queue_name, message.to_json())
                    return
                except Exception as e:
                    self.logger.error(f"Redis send error: {e}")
        
        # Fallback to file
        await self._write_file_queue(message)
    
    async def _write_file_queue(self, message: Message):
        """Write message to file-based queue"""
        try:
            with open(self.message_log, 'a') as f:
                f.write(message.to_json() + '\n')
                f.flush()
        except Exception as e:
            self.logger.error(f"File queue write error: {e}")
            raise
    
    async def send_ack(self, to_agent: str, original_message_id: str):
        """Send acknowledgment for received message"""
        ack_message = Message(
            sender_id=self.agent_id,
            recipient_id=to_agent,
            intent=MessageIntent.ACK,
            task_id="ack",
            payload={
                "original_message_id": original_message_id,
                "timestamp": datetime.now(timezone.utc).isoformat()
            }
        )
        await self.send_message(ack_message)
    
    async def broadcast_status(self, task_id: str, status: TaskState, details: Dict[str, Any] = None):
        """Broadcast task status update"""
        status_message = Message(
            sender_id=self.agent_id,
            recipient_id="*",  # Broadcast
            intent=MessageIntent.REPORT_STATUS,
            task_id=task_id,
            payload={
                "status": status.value,
                "details": details or {},
                "agent_role": self.agent_role,
                "timestamp": datetime.now(timezone.utc).isoformat()
            }
        )
        await self.send_message(status_message)
    
    def register_handler(self, intent: MessageIntent, handler: Callable):
        """Register a handler for specific message intent"""
        self.message_handlers[intent] = handler
    
    async def route_message(self, message: Message):
        """Route message to appropriate handler"""
        handler = self.message_handlers.get(message.intent)
        
        if handler:
            try:
                await handler(message)
                
                # Send ACK if not broadcast
                if message.recipient_id != "*":
                    await self.send_ack(message.sender_id, message.message_id)
                    
            except Exception as e:
                self.logger.error(f"Handler error for {message.intent}: {e}", exc_info=True)
                
                # Send error response
                error_message = Message(
                    sender_id=self.agent_id,
                    recipient_id=message.sender_id,
                    intent=MessageIntent.ERROR,
                    task_id=message.task_id,
                    payload={
                        "error": str(e),
                        "original_message_id": message.message_id
                    }
                )
                await self.send_message(error_message)
        else:
            self.logger.warning(f"No handler for intent: {message.intent}")
    
    # Abstract methods for agent-specific implementation
    @abstractmethod
    async def initialize(self):
        """Initialize agent-specific resources"""
        pass
    
    @abstractmethod
    async def cleanup(self):
        """Cleanup agent-specific resources"""
        pass
    
    @abstractmethod
    async def on_idle(self):
        """Called periodically when no messages"""
        pass
    
    # Default handlers (can be overridden)
    async def handle_request(self, message: Message):
        """Handle REQUEST messages"""
        self.logger.info(f"Received request: {message.payload}")
    
    async def handle_inform(self, message: Message):
        """Handle INFORM messages"""
        self.logger.info(f"Received inform: {message.payload}")
    
    async def handle_propose(self, message: Message):
        """Handle PROPOSE messages"""
        self.logger.info(f"Received proposal: {message.payload}")
    
    async def handle_accept(self, message: Message):
        """Handle ACCEPT_PROPOSAL messages"""
        self.logger.info(f"Proposal accepted: {message.payload}")
    
    async def handle_reject(self, message: Message):
        """Handle REJECT_PROPOSAL messages"""
        self.logger.info(f"Proposal rejected: {message.payload}")
    
    async def handle_status(self, message: Message):
        """Handle REPORT_STATUS messages"""
        self.logger.info(f"Status update: {message.payload}")
    
    async def handle_error(self, message: Message):
        """Handle ERROR messages"""
        self.logger.error(f"Error from {message.sender_id}: {message.payload}")
    
    async def handle_ack(self, message: Message):
        """Handle ACK messages"""
        self.logger.debug(f"ACK received from {message.sender_id}")
    
    async def stop(self):
        """Stop the agent runtime"""
        self.logger.info(f"Stopping {self.agent_role} agent: {self.agent_id}")
        self.running = False
        
        # Cleanup MCP client
        if self.mcp_client:
            await self.mcp_client.stop_all_servers()
        
        if self.redis_client:
            await self.redis_client.close()