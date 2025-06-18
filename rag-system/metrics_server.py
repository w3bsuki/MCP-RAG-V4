#!/usr/bin/env python3
"""
Prometheus Metrics Server for RAG System
Exposes metrics on port 8006 by default
"""
import os
from prometheus_client import start_http_server, REGISTRY
import time
import logging
from dotenv import load_dotenv

load_dotenv()

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


def start_metrics_server():
    """Start the Prometheus metrics server"""
    port = int(os.getenv('METRICS_PORT', '8006'))
    
    # Start HTTP server
    start_http_server(port)
    logger.info(f"Prometheus metrics server started on port {port}")
    logger.info(f"Access metrics at http://localhost:{port}/metrics")
    
    # Keep the server running
    try:
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        logger.info("Metrics server stopped")


if __name__ == "__main__":
    start_metrics_server()