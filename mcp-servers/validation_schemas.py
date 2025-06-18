#!/usr/bin/env python3
"""
Input validation schemas for MCP servers
Provides comprehensive input validation using Pydantic models
"""
from typing import Optional, List, Dict, Any, Union
from pathlib import Path
import re
from pydantic import BaseModel, Field, validator, root_validator
from enum import Enum


class CategoryEnum(str, Enum):
    """Valid knowledge categories"""
    pattern = "pattern"
    learning = "learning"
    reference = "reference"
    solution = "solution"


class SeverityEnum(str, Enum):
    """Security severity levels"""
    low = "low"
    medium = "medium"
    high = "high"
    critical = "critical"


class ToolNameEnum(str, Enum):
    """Valid security tool names"""
    trivy = "trivy"
    snyk = "snyk"
    npm_audit = "npm-audit"
    pip_audit = "pip-audit"


class BaseValidationModel(BaseModel):
    """Base model with common validation"""
    
    class Config:
        # Forbid extra fields for security
        extra = "forbid"
        # Validate assignment to catch runtime issues
        validate_assignment = True
        # Use enum values directly
        use_enum_values = True


class PathValidation:
    """Path validation utilities"""
    
    # Allowed path patterns (whitelist)
    ALLOWED_PATTERNS = [
        r'^/home/w3bsuki/MCP-RAG-V4/\.worktrees/.*',
        r'^/home/w3bsuki/MCP-RAG-V4/shared/.*',
        r'^/home/w3bsuki/MCP-RAG-V4/projects/.*',
        r'^/home/w3bsuki/MCP-RAG-V4/coordination/.*',
        r'^./\.worktrees/.*',
        r'^./shared/.*',
        r'^./projects/.*',
        r'^./coordination/.*'
    ]
    
    # Dangerous path patterns (blacklist)
    DANGEROUS_PATTERNS = [
        r'.*\.\./.*',  # Path traversal
        r'^/etc/.*',   # System config
        r'^/usr/.*',   # System files
        r'^/bin/.*',   # System binaries
        r'^/root/.*',  # Root directory
        r'.*\.ssh/.*', # SSH keys
        r'.*\.aws/.*', # AWS credentials
        r'.*password.*', # Password files
        r'.*secret.*',   # Secret files
    ]
    
    @classmethod
    def validate_path(cls, path: str) -> str:
        """Validate and sanitize file path"""
        if not path:
            raise ValueError("Path cannot be empty")
        
        # Normalize path
        normalized = str(Path(path).resolve())
        
        # Check for dangerous patterns
        for pattern in cls.DANGEROUS_PATTERNS:
            if re.match(pattern, normalized, re.IGNORECASE):
                raise ValueError(f"Path contains dangerous pattern: {normalized}")
        
        # Check against whitelist
        allowed = False
        for pattern in cls.ALLOWED_PATTERNS:
            if re.match(pattern, normalized):
                allowed = True
                break
        
        if not allowed:
            raise ValueError(f"Path not in allowed list: {normalized}")
        
        return normalized


class StringValidation:
    """String validation utilities"""
    
    @staticmethod
    def validate_agent_name(agent: str) -> str:
        """Validate agent name"""
        if not agent:
            raise ValueError("Agent name cannot be empty")
        
        if not re.match(r'^[a-zA-Z0-9_-]+$', agent):
            raise ValueError("Agent name contains invalid characters")
        
        if len(agent) > 50:
            raise ValueError("Agent name too long (max 50 characters)")
        
        return agent.lower()
    
    @staticmethod
    def validate_content_length(content: str, max_length: int = 1000000) -> str:
        """Validate content length"""
        if len(content) > max_length:
            raise ValueError(f"Content too long (max {max_length} characters)")
        return content


# Knowledge Base Validation Schemas
class StoreKnowledgeRequest(BaseValidationModel):
    """Validation for store_knowledge requests"""
    title: str = Field(..., min_length=1, max_length=200)
    content: str = Field(..., min_length=1, max_length=1000000)
    category: CategoryEnum
    tags: List[str] = Field(..., min_items=1, max_items=10)
    source: Optional[str] = Field(None, max_length=500)
    agent: str = Field(..., min_length=1, max_length=50)
    api_key: Optional[str] = Field(None, min_length=1, max_length=100)
    
    @validator('title')
    def validate_title(cls, v):
        if not v.strip():
            raise ValueError("Title cannot be empty or whitespace")
        return v.strip()
    
    @validator('tags')
    def validate_tags(cls, v):
        if not v:
            raise ValueError("At least one tag is required")
        
        clean_tags = []
        for tag in v:
            clean_tag = tag.strip().lower()
            if not clean_tag:
                raise ValueError("Tags cannot be empty")
            if len(clean_tag) > 50:
                raise ValueError("Tag too long (max 50 characters)")
            if not re.match(r'^[a-zA-Z0-9_-]+$', clean_tag):
                raise ValueError("Tag contains invalid characters")
            clean_tags.append(clean_tag)
        
        return clean_tags
    
    @validator('agent')
    def validate_agent(cls, v):
        return StringValidation.validate_agent_name(v)
    
    @validator('content')
    def validate_content(cls, v):
        return StringValidation.validate_content_length(v)


class SearchKnowledgeRequest(BaseValidationModel):
    """Validation for search_knowledge requests"""
    query: str = Field(..., min_length=1, max_length=500)
    category: Optional[CategoryEnum] = None
    tags: Optional[List[str]] = Field(None, max_items=10)
    limit: int = Field(10, ge=1, le=100)
    agent: str = Field(..., min_length=1, max_length=50)
    api_key: Optional[str] = Field(None, min_length=1, max_length=100)
    
    @validator('query')
    def validate_query(cls, v):
        if not v.strip():
            raise ValueError("Query cannot be empty or whitespace")
        return v.strip()
    
    @validator('agent')
    def validate_agent(cls, v):
        return StringValidation.validate_agent_name(v)


# Filesystem Security Validation Schemas
class ReadFileSecureRequest(BaseValidationModel):
    """Validation for read_file_secure requests"""
    path: str = Field(..., min_length=1, max_length=1000)
    agent: str = Field(..., min_length=1, max_length=50)
    api_key: Optional[str] = Field(None, min_length=1, max_length=100)
    
    @validator('path')
    def validate_path(cls, v):
        return PathValidation.validate_path(v)
    
    @validator('agent')
    def validate_agent(cls, v):
        return StringValidation.validate_agent_name(v)


class WriteFileSecureRequest(BaseValidationModel):
    """Validation for write_file_secure requests"""
    path: str = Field(..., min_length=1, max_length=1000)
    content: str = Field(..., max_length=10000000)  # 10MB max
    agent: str = Field(..., min_length=1, max_length=50)
    api_key: Optional[str] = Field(None, min_length=1, max_length=100)
    confirmation_id: Optional[str] = Field(None, min_length=1, max_length=100)
    
    @validator('path')
    def validate_path(cls, v):
        return PathValidation.validate_path(v)
    
    @validator('agent')
    def validate_agent(cls, v):
        return StringValidation.validate_agent_name(v)
    
    @validator('content')
    def validate_content(cls, v):
        return StringValidation.validate_content_length(v, max_length=10000000)


class DeleteFileSecureRequest(BaseValidationModel):
    """Validation for delete_file_secure requests"""
    path: str = Field(..., min_length=1, max_length=1000)
    agent: str = Field(..., min_length=1, max_length=50)
    api_key: Optional[str] = Field(None, min_length=1, max_length=100)
    confirmation_id: str = Field(..., min_length=1, max_length=100)
    
    @validator('path')
    def validate_path(cls, v):
        return PathValidation.validate_path(v)
    
    @validator('agent')
    def validate_agent(cls, v):
        return StringValidation.validate_agent_name(v)


class ListDirectorySecureRequest(BaseValidationModel):
    """Validation for list_directory_secure requests"""
    path: str = Field(..., min_length=1, max_length=1000)
    agent: str = Field(..., min_length=1, max_length=50)
    api_key: Optional[str] = Field(None, min_length=1, max_length=100)
    
    @validator('path')
    def validate_path(cls, v):
        return PathValidation.validate_path(v)
    
    @validator('agent')
    def validate_agent(cls, v):
        return StringValidation.validate_agent_name(v)


class RequestConfirmationRequest(BaseValidationModel):
    """Validation for request_confirmation requests"""
    operation: str = Field(..., min_length=1, max_length=50)
    details: Dict[str, Any] = Field(..., max_items=20)
    agent: str = Field(..., min_length=1, max_length=50)
    
    @validator('operation')
    def validate_operation(cls, v):
        allowed_operations = ["delete", "write", "move", "chmod", "chown", "execute"]
        if v.lower() not in allowed_operations:
            raise ValueError(f"Operation must be one of: {allowed_operations}")
        return v.lower()
    
    @validator('agent')
    def validate_agent(cls, v):
        return StringValidation.validate_agent_name(v)


# Testing Tools Validation Schemas
class RunTestsRequest(BaseValidationModel):
    """Validation for run_tests requests"""
    directory: str = Field(..., min_length=1, max_length=1000)
    command: str = Field("npm test", max_length=200)
    pattern: Optional[str] = Field(None, max_length=200)
    agent: str = Field(..., min_length=1, max_length=50)
    
    @validator('directory')
    def validate_directory(cls, v):
        return PathValidation.validate_path(v)
    
    @validator('command')
    def validate_command(cls, v):
        # Basic command injection protection
        dangerous_chars = [';', '&', '|', '`', '$', '(', ')', '<', '>']
        for char in dangerous_chars:
            if char in v:
                raise ValueError(f"Command contains dangerous character: {char}")
        return v.strip()
    
    @validator('agent')
    def validate_agent(cls, v):
        return StringValidation.validate_agent_name(v)


class SecurityScanRequest(BaseValidationModel):
    """Validation for security_scan requests"""
    directory: str = Field(..., min_length=1, max_length=1000)
    tool: ToolNameEnum = Field(ToolNameEnum.trivy)
    severity: str = Field("HIGH,CRITICAL", max_length=100)
    agent: str = Field(..., min_length=1, max_length=50)
    
    @validator('directory')
    def validate_directory(cls, v):
        return PathValidation.validate_path(v)
    
    @validator('severity')
    def validate_severity(cls, v):
        allowed_severities = ["LOW", "MEDIUM", "HIGH", "CRITICAL"]
        severities = [s.strip().upper() for s in v.split(',')]
        for severity in severities:
            if severity not in allowed_severities:
                raise ValueError(f"Invalid severity: {severity}")
        return ','.join(severities)
    
    @validator('agent')
    def validate_agent(cls, v):
        return StringValidation.validate_agent_name(v)


# Vector Search Validation Schemas
class VectorSearchRequest(BaseValidationModel):
    """Validation for vector search requests"""
    query: str = Field(..., min_length=1, max_length=500)
    limit: int = Field(5, ge=1, le=100)
    score_threshold: float = Field(0.5, ge=0.0, le=1.0)
    collection: Optional[str] = Field(None, max_length=100)
    agent: str = Field(..., min_length=1, max_length=50)
    
    @validator('query')
    def validate_query(cls, v):
        if not v.strip():
            raise ValueError("Query cannot be empty or whitespace")
        return v.strip()
    
    @validator('collection')
    def validate_collection(cls, v):
        if v and not re.match(r'^[a-zA-Z0-9_-]+$', v):
            raise ValueError("Collection name contains invalid characters")
        return v
    
    @validator('agent')
    def validate_agent(cls, v):
        return StringValidation.validate_agent_name(v)


def validate_input(schema_class: BaseModel, data: Dict[str, Any]) -> BaseModel:
    """
    Validate input data against a schema
    
    Args:
        schema_class: Pydantic model class
        data: Input data dictionary
        
    Returns:
        Validated model instance
        
    Raises:
        ValueError: If validation fails
    """
    try:
        return schema_class(**data)
    except Exception as e:
        raise ValueError(f"Input validation failed: {str(e)}")


# Schema mapping for tools
TOOL_SCHEMAS = {
    # Knowledge Base
    "store_knowledge": StoreKnowledgeRequest,
    "search_knowledge": SearchKnowledgeRequest,
    
    # Filesystem Security
    "read_file_secure": ReadFileSecureRequest,
    "write_file_secure": WriteFileSecureRequest,
    "delete_file_secure": DeleteFileSecureRequest,
    "list_directory_secure": ListDirectorySecureRequest,
    "request_confirmation": RequestConfirmationRequest,
    
    # Testing Tools
    "run_tests": RunTestsRequest,
    "security_scan": SecurityScanRequest,
    
    # Vector Search
    "vector_search": VectorSearchRequest,
}