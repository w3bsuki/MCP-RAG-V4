FROM python:3.11-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements and install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy server code
COPY server.py .

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:8081/health || exit 1

# Expose port
EXPOSE 8081

# Set environment variables
ENV QDRANT_URL=http://qdrant:6333
ENV REDIS_URL=redis://redis:6379
ENV EMBEDDING_MODEL=sentence-transformers/all-MiniLM-L6-v2
ENV CACHE_TTL=3600
ENV MCP_SERVER_PORT=8081

# Run the server
CMD ["python", "server.py"]