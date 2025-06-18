#!/bin/bash
# Setup RAG system with Qdrant and dependencies

set -e

echo "🚀 Setting up RAG system..."

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo "❌ Docker is required but not installed. Please install Docker first."
    exit 1
fi

# Check if Docker Compose is installed
if ! command -v docker-compose &> /dev/null; then
    echo "❌ Docker Compose is required but not installed. Please install Docker Compose first."
    exit 1
fi

# Create necessary directories
echo "📁 Creating directories..."
mkdir -p vector-db/{qdrant_storage,redis_data}
mkdir -p monitoring
mkdir -p knowledge/{patterns,specifications,code_snippets,decisions}

# Create Prometheus config
echo "📝 Creating Prometheus configuration..."
cat > monitoring/prometheus.yml << EOF
global:
  scrape_interval: 15s
  evaluation_interval: 15s

scrape_configs:
  - job_name: 'qdrant'
    static_configs:
      - targets: ['qdrant:6334']
    metrics_path: '/metrics'
    
  - job_name: 'redis'
    static_configs:
      - targets: ['redis-exporter:9121']
EOF

# Start services
echo "🐳 Starting Docker services..."
docker-compose up -d

# Wait for services to be healthy
echo "⏳ Waiting for services to be ready..."
sleep 10

# Check service health
echo "🏥 Checking service health..."
docker-compose ps

# Initialize Qdrant collections
echo "🎯 Initializing Qdrant collections..."
python3 -m venv venv
source venv/bin/activate || . venv/Scripts/activate  # Windows compatibility

# Install dependencies for initialization
pip install qdrant-client sentence-transformers

# Run initialization
python init_qdrant.py

echo "
✅ RAG system setup complete!

🔗 Service URLs:
   - Qdrant UI: http://localhost:6333/dashboard
   - Qdrant API: http://localhost:6333
   - Redis: redis://localhost:6379
   - Prometheus: http://localhost:9090

📊 Available Collections:
   - patterns: Architectural patterns
   - specifications: Technical specs
   - knowledge: General knowledge
   - code_snippets: Code examples
   - decisions: Design decisions

💡 Next steps:
   1. Configure MCP servers to use these endpoints
   2. Start ingesting data
   3. Test vector search functionality
"