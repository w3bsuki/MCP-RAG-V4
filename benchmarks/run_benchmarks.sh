#!/bin/bash
# Run performance benchmarks for MCP-RAG-V4

echo "🚀 MCP-RAG-V4 Performance Benchmark Suite"
echo "========================================"
echo ""

# Check if services are running
check_service() {
    local service=$1
    local port=$2
    
    if nc -z localhost $port 2>/dev/null; then
        echo "✅ $service is running on port $port"
    else
        echo "❌ $service is not running on port $port"
        echo "   Please start the service before running benchmarks"
        return 1
    fi
}

echo "Checking required services..."
check_service "Qdrant" 6333 || exit 1
check_service "Dashboard API" 8000 || exit 1
echo ""

# Create results directory
mkdir -p benchmark_results

# Run Python benchmarks
echo "Running performance benchmarks..."
python3 performance_suite.py

# Run API load tests if locust is installed
if command -v locust &> /dev/null; then
    echo ""
    echo "Running API load tests with Locust..."
    locust -f locustfile.py --headless -u 10 -r 2 -t 60s --host http://localhost:8000 --html benchmark_results/locust_report.html
else
    echo ""
    echo "ℹ️  Locust not installed. Skipping API load tests."
    echo "   Install with: pip install locust"
fi

echo ""
echo "✅ Benchmarks complete!"
echo "📊 Results saved in benchmark_results/"