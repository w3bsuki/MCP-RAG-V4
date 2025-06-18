FROM python:3.11-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    git \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements
COPY agents/admin/requirements.txt ./agents/admin/
COPY rag-system/requirements.txt ./rag-system/
COPY mcp-servers/requirements.txt ./mcp-servers/

# Install Python dependencies
RUN pip install --no-cache-dir \
    -r agents/admin/requirements.txt \
    -r rag-system/requirements.txt \
    -r mcp-servers/requirements.txt

# Copy application code
COPY agents/ ./agents/
COPY rag_system/ ./rag_system/
COPY mcp_servers/ ./mcp_servers/
COPY shared/ ./shared/

# Create necessary directories
RUN mkdir -p /app/logs /app/shared/specifications /app/shared/implementations /app/shared/validation-reports

# Set environment variables
ENV PYTHONPATH=/app
ENV PYTHONUNBUFFERED=1

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD python -c "import requests; requests.get('http://localhost:8080/health')"

# Run the admin agent
CMD ["python", "-m", "agents.admin.service"]