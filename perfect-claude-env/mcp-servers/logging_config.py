#!/usr/bin/env python3
"""
Centralized logging configuration for MCP servers
Provides structured logging with security and performance monitoring
"""
import logging
import sys
import json
import time
import traceback
import asyncio
from pathlib import Path
from typing import Dict, Any, Optional
from datetime import datetime
import functools


class StructuredFormatter(logging.Formatter):
    """Custom formatter for structured JSON logging"""
    
    def format(self, record):
        """Format log record as structured JSON"""
        log_entry = {
            "timestamp": datetime.utcnow().isoformat() + "Z",
            "level": record.levelname,
            "logger": record.name,
            "message": record.getMessage(),
            "module": record.module,
            "function": record.funcName,
            "line": record.lineno,
        }
        
        # Add extra fields if present
        if hasattr(record, 'agent'):
            log_entry['agent'] = record.agent
        if hasattr(record, 'tool_name'):
            log_entry['tool_name'] = record.tool_name
        if hasattr(record, 'duration'):
            log_entry['duration_ms'] = record.duration
        if hasattr(record, 'request_id'):
            log_entry['request_id'] = record.request_id
        if hasattr(record, 'ip_address'):
            log_entry['ip_address'] = record.ip_address
        if hasattr(record, 'user_agent'):
            log_entry['user_agent'] = record.user_agent
        
        # Add exception info if present
        if record.exc_info:
            log_entry['exception'] = {
                'type': record.exc_info[0].__name__,
                'message': str(record.exc_info[1]),
                'traceback': traceback.format_exception(*record.exc_info)
            }
        
        return json.dumps(log_entry)


class SecurityLogger:
    """Security-focused logging for audit trails"""
    
    def __init__(self, server_name: str):
        self.server_name = server_name
        self.logger = logging.getLogger(f"security.{server_name}")
        
    def log_access(self, agent: str, tool_name: str, args: Dict[str, Any], 
                   result: str, ip_address: Optional[str] = None):
        """Log access attempts for security auditing"""
        self.logger.info(
            f"Tool access: {tool_name}",
            extra={
                'agent': agent,
                'tool_name': tool_name,
                'args_hash': hash(str(sorted(args.items()))),
                'result': result,
                'ip_address': ip_address,
                'event_type': 'tool_access'
            }
        )
    
    def log_authentication(self, agent: str, success: bool, 
                          ip_address: Optional[str] = None):
        """Log authentication attempts"""
        level = logging.INFO if success else logging.WARNING
        self.logger.log(
            level,
            f"Authentication {'successful' if success else 'failed'}",
            extra={
                'agent': agent,
                'auth_success': success,
                'ip_address': ip_address,
                'event_type': 'authentication'
            }
        )
    
    def log_security_violation(self, agent: str, violation_type: str, 
                              details: Dict[str, Any]):
        """Log security violations"""
        self.logger.error(
            f"Security violation: {violation_type}",
            extra={
                'agent': agent,
                'violation_type': violation_type,
                'details': details,
                'event_type': 'security_violation'
            }
        )


class PerformanceLogger:
    """Performance monitoring logger"""
    
    def __init__(self, server_name: str):
        self.server_name = server_name
        self.logger = logging.getLogger(f"performance.{server_name}")
    
    def log_tool_performance(self, tool_name: str, duration_ms: float, 
                           agent: str, success: bool):
        """Log tool execution performance"""
        level = logging.INFO if success else logging.WARNING
        self.logger.log(
            level,
            f"Tool execution: {tool_name}",
            extra={
                'tool_name': tool_name,
                'duration': duration_ms,
                'agent': agent,
                'success': success,
                'event_type': 'tool_performance'
            }
        )
    
    def log_slow_operation(self, operation: str, duration_ms: float, 
                          threshold_ms: float = 1000):
        """Log operations that exceed performance thresholds"""
        if duration_ms > threshold_ms:
            self.logger.warning(
                f"Slow operation detected: {operation}",
                extra={
                    'operation': operation,
                    'duration': duration_ms,
                    'threshold': threshold_ms,
                    'event_type': 'slow_operation'
                }
            )


def setup_logging(server_name: str, log_level: str = "INFO") -> Dict[str, Any]:
    """
    Set up structured logging for an MCP server
    
    Args:
        server_name: Name of the MCP server
        log_level: Logging level (DEBUG, INFO, WARNING, ERROR)
        
    Returns:
        Dictionary containing logger instances
    """
    # Create logs directory
    log_dir = Path("logs") / "mcp-servers"
    log_dir.mkdir(parents=True, exist_ok=True)
    
    # Configure root logger
    logging.basicConfig(
        level=getattr(logging, log_level.upper()),
        handlers=[
            logging.StreamHandler(sys.stdout),
            logging.FileHandler(log_dir / f"{server_name}.log"),
            logging.FileHandler(log_dir / f"{server_name}-security.log")
        ]
    )
    
    # Set structured formatter for file handlers
    formatter = StructuredFormatter()
    for handler in logging.getLogger().handlers:
        if isinstance(handler, logging.FileHandler):
            handler.setFormatter(formatter)
    
    # Create specialized loggers
    main_logger = logging.getLogger(f"mcp.{server_name}")
    security_logger = SecurityLogger(server_name)
    performance_logger = PerformanceLogger(server_name)
    
    return {
        'main': main_logger,
        'security': security_logger,
        'performance': performance_logger
    }


def log_tool_call(security_logger: SecurityLogger, 
                 performance_logger: PerformanceLogger):
    """
    Decorator for logging tool calls with security and performance monitoring
    """
    def decorator(func):
        @functools.wraps(func)
        async def wrapper(name: str, arguments: Dict[str, Any], *args, **kwargs):
            start_time = time.time()
            agent = arguments.get('agent', 'unknown')
            request_id = f"{int(time.time())}-{hash(str(arguments))}"
            
            try:
                # Log tool access attempt
                security_logger.log_access(
                    agent=agent,
                    tool_name=name,
                    args=arguments,
                    result="started",
                    ip_address=kwargs.get('client_ip')
                )
                
                # Execute the tool
                result = await func(name, arguments, *args, **kwargs)
                
                # Calculate duration
                duration_ms = (time.time() - start_time) * 1000
                
                # Log successful completion
                security_logger.log_access(
                    agent=agent,
                    tool_name=name,
                    args=arguments,
                    result="success"
                )
                
                performance_logger.log_tool_performance(
                    tool_name=name,
                    duration_ms=duration_ms,
                    agent=agent,
                    success=True
                )
                
                return result
                
            except Exception as e:
                # Calculate duration for failed operations
                duration_ms = (time.time() - start_time) * 1000
                
                # Log failure
                security_logger.log_access(
                    agent=agent,
                    tool_name=name,
                    args=arguments,
                    result=f"error: {str(e)}"
                )
                
                performance_logger.log_tool_performance(
                    tool_name=name,
                    duration_ms=duration_ms,
                    agent=agent,
                    success=False
                )
                
                # Re-raise the exception
                raise
        
        return wrapper
    return decorator


def log_async_errors(logger: logging.Logger):
    """
    Decorator for comprehensive async error handling and logging
    """
    def decorator(func):
        @functools.wraps(func)
        async def wrapper(*args, **kwargs):
            try:
                return await func(*args, **kwargs)
            except asyncio.TimeoutError as e:
                logger.error(
                    f"Timeout in {func.__name__}: {str(e)}",
                    extra={'function': func.__name__, 'error_type': 'timeout'}
                )
                raise
            except asyncio.CancelledError as e:
                logger.warning(
                    f"Operation cancelled in {func.__name__}: {str(e)}",
                    extra={'function': func.__name__, 'error_type': 'cancelled'}
                )
                raise
            except ConnectionError as e:
                logger.error(
                    f"Connection error in {func.__name__}: {str(e)}",
                    extra={'function': func.__name__, 'error_type': 'connection'}
                )
                raise
            except ValueError as e:
                logger.error(
                    f"Validation error in {func.__name__}: {str(e)}",
                    extra={'function': func.__name__, 'error_type': 'validation'}
                )
                raise
            except Exception as e:
                logger.error(
                    f"Unexpected error in {func.__name__}: {str(e)}",
                    extra={'function': func.__name__, 'error_type': 'unexpected'},
                    exc_info=True
                )
                raise
        return wrapper
    return decorator