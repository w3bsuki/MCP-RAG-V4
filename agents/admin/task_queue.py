#!/usr/bin/env python3
"""
Redis-based Task Queue for Agent Coordination
Replaces file-based ACTIVE_TASKS.json with reliable queue
"""
import asyncio
import json
import os
from datetime import datetime
from typing import Dict, List, Optional, Any
from dataclasses import asdict
import redis.asyncio as redis
from redis.asyncio import Redis
from dotenv import load_dotenv

import sys
sys.path.append('../../mcp-servers/')
from logging_config import setup_logging

load_dotenv()


class TaskQueue:
    """
    Redis-based task queue for agent coordination
    Provides reliable task submission, status tracking, and result storage
    """
    
    def __init__(self):
        # Initialize logging
        loggers = setup_logging("task-queue", "INFO")
        self.logger = loggers['main']
        
        # Redis configuration
        self.redis_host = os.getenv('REDIS_HOST', 'localhost')
        self.redis_port = int(os.getenv('REDIS_PORT', '6379'))
        self.redis_password = os.getenv('REDIS_PASSWORD', None)
        self.use_redis = os.getenv('ENABLE_REDIS_QUEUE', 'false').lower() == 'true'
        
        self.redis_client: Optional[Redis] = None
        self.connected = False
        
        # Queue names
        self.PENDING_QUEUE = 'mcp:tasks:pending'
        self.PROCESSING_SET = 'mcp:tasks:processing'
        self.COMPLETED_SET = 'mcp:tasks:completed'
        self.FAILED_SET = 'mcp:tasks:failed'
        self.TASK_DATA = 'mcp:tasks:data:'
        self.TASK_STATUS = 'mcp:tasks:status:'
        self.AGENT_TASKS = 'mcp:agent:tasks:'
        
        # Fallback to in-memory if Redis disabled
        if not self.use_redis:
            self.logger.info("Redis disabled, using in-memory task queue")
            self.memory_queue = asyncio.Queue()
            self.memory_tasks = {}
    
    async def connect(self):
        """Connect to Redis"""
        if not self.use_redis:
            self.connected = True
            return
        
        try:
            self.redis_client = await redis.Redis(
                host=self.redis_host,
                port=self.redis_port,
                password=self.redis_password,
                decode_responses=True
            )
            
            # Test connection
            await self.redis_client.ping()
            self.connected = True
            self.logger.info(f"Connected to Redis at {self.redis_host}:{self.redis_port}")
            
        except Exception as e:
            self.logger.error(f"Failed to connect to Redis: {e}")
            self.logger.warning("Falling back to in-memory queue")
            self.use_redis = False
            self.connected = True
    
    async def disconnect(self):
        """Disconnect from Redis"""
        if self.redis_client:
            await self.redis_client.close()
            self.connected = False
    
    async def submit_task(self, task_data: Dict[str, Any]) -> str:
        """Submit a task to the queue"""
        if not self.connected:
            await self.connect()
        
        task_id = task_data.get('id', '')
        
        if self.use_redis:
            # Store task data
            await self.redis_client.hset(
                f"{self.TASK_DATA}{task_id}",
                mapping={
                    'data': json.dumps(task_data),
                    'submitted_at': datetime.now().isoformat(),
                    'status': 'pending'
                }
            )
            
            # Add to pending queue
            await self.redis_client.lpush(self.PENDING_QUEUE, task_id)
            
            # Set initial status
            await self.redis_client.hset(
                f"{self.TASK_STATUS}{task_id}",
                mapping={
                    'status': 'pending',
                    'updated_at': datetime.now().isoformat()
                }
            )
            
            self.logger.info(f"Task {task_id} submitted to Redis queue")
            
        else:
            # In-memory fallback
            self.memory_tasks[task_id] = {
                'data': task_data,
                'status': 'pending',
                'submitted_at': datetime.now().isoformat()
            }
            await self.memory_queue.put(task_id)
            self.logger.info(f"Task {task_id} submitted to memory queue")
        
        return task_id
    
    async def get_next_task(self, agent_id: str) -> Optional[Dict[str, Any]]:
        """Get next task from queue for processing"""
        if not self.connected:
            await self.connect()
        
        if self.use_redis:
            # Pop from pending queue
            task_id = await self.redis_client.rpop(self.PENDING_QUEUE)
            if not task_id:
                return None
            
            # Add to processing set
            await self.redis_client.sadd(self.PROCESSING_SET, task_id)
            
            # Update status
            await self.redis_client.hset(
                f"{self.TASK_STATUS}{task_id}",
                mapping={
                    'status': 'processing',
                    'agent_id': agent_id,
                    'started_at': datetime.now().isoformat(),
                    'updated_at': datetime.now().isoformat()
                }
            )
            
            # Track task assignment
            await self.redis_client.sadd(f"{self.AGENT_TASKS}{agent_id}", task_id)
            
            # Get task data
            task_info = await self.redis_client.hgetall(f"{self.TASK_DATA}{task_id}")
            if task_info and 'data' in task_info:
                return json.loads(task_info['data'])
            
        else:
            # In-memory fallback
            try:
                task_id = await asyncio.wait_for(self.memory_queue.get(), timeout=1.0)
                if task_id in self.memory_tasks:
                    task = self.memory_tasks[task_id]
                    task['status'] = 'processing'
                    task['agent_id'] = agent_id
                    task['started_at'] = datetime.now().isoformat()
                    return task['data']
            except asyncio.TimeoutError:
                return None
        
        return None
    
    async def update_task_status(
        self, 
        task_id: str, 
        status: str, 
        agent_id: str,
        result: Optional[Dict[str, Any]] = None,
        error: Optional[str] = None
    ):
        """Update task status"""
        if not self.connected:
            await self.connect()
        
        if self.use_redis:
            # Update status
            status_data = {
                'status': status,
                'agent_id': agent_id,
                'updated_at': datetime.now().isoformat()
            }
            
            if status == 'completed':
                status_data['completed_at'] = datetime.now().isoformat()
                if result:
                    status_data['result'] = json.dumps(result)
                
                # Move from processing to completed
                await self.redis_client.srem(self.PROCESSING_SET, task_id)
                await self.redis_client.sadd(self.COMPLETED_SET, task_id)
                
            elif status == 'failed':
                status_data['failed_at'] = datetime.now().isoformat()
                if error:
                    status_data['error'] = error
                
                # Move from processing to failed
                await self.redis_client.srem(self.PROCESSING_SET, task_id)
                await self.redis_client.sadd(self.FAILED_SET, task_id)
            
            await self.redis_client.hset(
                f"{self.TASK_STATUS}{task_id}",
                mapping=status_data
            )
            
            self.logger.info(f"Task {task_id} status updated to {status}")
            
        else:
            # In-memory fallback
            if task_id in self.memory_tasks:
                self.memory_tasks[task_id]['status'] = status
                self.memory_tasks[task_id]['updated_at'] = datetime.now().isoformat()
                
                if result:
                    self.memory_tasks[task_id]['result'] = result
                if error:
                    self.memory_tasks[task_id]['error'] = error
    
    async def get_task_status(self, task_id: str) -> Optional[Dict[str, Any]]:
        """Get current task status"""
        if not self.connected:
            await self.connect()
        
        if self.use_redis:
            status = await self.redis_client.hgetall(f"{self.TASK_STATUS}{task_id}")
            if status:
                # Parse JSON fields
                if 'result' in status:
                    status['result'] = json.loads(status['result'])
                return status
        else:
            # In-memory fallback
            if task_id in self.memory_tasks:
                return {
                    'status': self.memory_tasks[task_id]['status'],
                    'updated_at': self.memory_tasks[task_id].get('updated_at')
                }
        
        return None
    
    async def get_queue_stats(self) -> Dict[str, int]:
        """Get queue statistics"""
        if not self.connected:
            await self.connect()
        
        if self.use_redis:
            stats = {
                'pending': await self.redis_client.llen(self.PENDING_QUEUE),
                'processing': await self.redis_client.scard(self.PROCESSING_SET),
                'completed': await self.redis_client.scard(self.COMPLETED_SET),
                'failed': await self.redis_client.scard(self.FAILED_SET)
            }
        else:
            # In-memory fallback
            stats = {
                'pending': self.memory_queue.qsize(),
                'processing': sum(1 for t in self.memory_tasks.values() if t['status'] == 'processing'),
                'completed': sum(1 for t in self.memory_tasks.values() if t['status'] == 'completed'),
                'failed': sum(1 for t in self.memory_tasks.values() if t['status'] == 'failed')
            }
        
        return stats
    
    async def cleanup_old_tasks(self, days: int = 7):
        """Clean up old completed/failed tasks"""
        if not self.use_redis:
            return
        
        cutoff_date = datetime.now().timestamp() - (days * 24 * 60 * 60)
        
        # Get all completed and failed tasks
        all_tasks = await self.redis_client.sunion(self.COMPLETED_SET, self.FAILED_SET)
        
        removed_count = 0
        for task_id in all_tasks:
            status = await self.redis_client.hgetall(f"{self.TASK_STATUS}{task_id}")
            if status:
                completed_at = status.get('completed_at') or status.get('failed_at')
                if completed_at:
                    task_timestamp = datetime.fromisoformat(completed_at).timestamp()
                    if task_timestamp < cutoff_date:
                        # Remove task data
                        await self.redis_client.delete(f"{self.TASK_DATA}{task_id}")
                        await self.redis_client.delete(f"{self.TASK_STATUS}{task_id}")
                        await self.redis_client.srem(self.COMPLETED_SET, task_id)
                        await self.redis_client.srem(self.FAILED_SET, task_id)
                        removed_count += 1
        
        self.logger.info(f"Cleaned up {removed_count} old tasks")


# Singleton instance
task_queue = TaskQueue()