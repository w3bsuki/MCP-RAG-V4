FROM python:3.11-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    curl \
    git \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements and install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy server code and config
COPY filesystem-secure.py .
COPY security-config.json .

# Create logs directory
RUN mkdir -p /app/logs

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:8082/health || exit 1

# Expose port
EXPOSE 8082

# Set environment variables
ENV SECURITY_CONFIG=/app/security-config.json
ENV AUDIT_LOG=/app/logs/filesystem-audit.log
ENV MCP_SERVER_PORT=8082

# Run the server
CMD ["python", "filesystem-secure.py"]