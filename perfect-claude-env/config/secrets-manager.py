#!/usr/bin/env python3
"""
Simple secrets manager for MCP-RAG-V4
Supports file-based, environment, and external vault sources
"""
import os
import json
import logging
from pathlib import Path
from typing import Dict, Any, Optional
from abc import ABC, abstractmethod

logger = logging.getLogger(__name__)

class SecretProvider(ABC):
    @abstractmethod
    def get_secret(self, key: str) -> Optional[str]:
        pass
    
    @abstractmethod
    def list_secrets(self) -> Dict[str, str]:
        pass

class FileSecretProvider(SecretProvider):
    def __init__(self, secrets_file: Path):
        self.secrets_file = secrets_file
        self._secrets = {}
        self._load_secrets()
    
    def _load_secrets(self):
        if self.secrets_file.exists():
            with open(self.secrets_file, 'r') as f:
                self._secrets = json.load(f)
    
    def get_secret(self, key: str) -> Optional[str]:
        return self._secrets.get(key)
    
    def list_secrets(self) -> Dict[str, str]:
        # Return keys only, not values for security
        return {k: "***" for k in self._secrets.keys()}

class EnvironmentSecretProvider(SecretProvider):
    def __init__(self, prefix: str = "MCP_SECRET_"):
        self.prefix = prefix
    
    def get_secret(self, key: str) -> Optional[str]:
        env_key = f"{self.prefix}{key.upper()}"
        return os.getenv(env_key)
    
    def list_secrets(self) -> Dict[str, str]:
        secrets = {}
        for key, value in os.environ.items():
            if key.startswith(self.prefix):
                secret_name = key[len(self.prefix):].lower()
                secrets[secret_name] = "***"
        return secrets

class SecretsManager:
    def __init__(self):
        self.providers = []
        self._setup_default_providers()
    
    def _setup_default_providers(self):
        # Environment provider (highest priority)
        self.providers.append(EnvironmentSecretProvider())
        
        # File provider
        secrets_file = Path(os.getenv("SECRETS_FILE", "./config/secrets.json"))
        if secrets_file.exists():
            self.providers.append(FileSecretProvider(secrets_file))
    
    def add_provider(self, provider: SecretProvider):
        self.providers.insert(0, provider)  # Higher priority
    
    def get_secret(self, key: str, default: Optional[str] = None) -> Optional[str]:
        for provider in self.providers:
            value = provider.get_secret(key)
            if value is not None:
                logger.debug(f"Secret '{key}' found via {provider.__class__.__name__}")
                return value
        
        if default is not None:
            logger.warning(f"Secret '{key}' not found, using default")
            return default
        
        logger.error(f"Secret '{key}' not found in any provider")
        return None
    
    def get_required_secret(self, key: str) -> str:
        value = self.get_secret(key)
        if value is None:
            raise ValueError(f"Required secret '{key}' not found")
        return value
    
    def list_all_secrets(self) -> Dict[str, Dict[str, str]]:
        all_secrets = {}
        for provider in self.providers:
            provider_name = provider.__class__.__name__
            all_secrets[provider_name] = provider.list_secrets()
        return all_secrets

# Global instance
secrets_manager = SecretsManager()

def get_secret(key: str, default: Optional[str] = None) -> Optional[str]:
    return secrets_manager.get_secret(key, default)

def get_required_secret(key: str) -> str:
    return secrets_manager.get_required_secret(key)

if __name__ == "__main__":
    # CLI for testing
    import sys
    
    if len(sys.argv) > 1:
        secret_key = sys.argv[1]
        value = get_secret(secret_key)
        if value:
            print(f"{secret_key}: {value}")
        else:
            print(f"Secret '{secret_key}' not found")
            sys.exit(1)
    else:
        print("Available secrets:")
        for provider, secrets in secrets_manager.list_all_secrets().items():
            print(f"  {provider}: {list(secrets.keys())}")