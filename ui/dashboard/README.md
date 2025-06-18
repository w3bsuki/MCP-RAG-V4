# MCP-RAG-V4 Agent Dashboard

A real-time monitoring dashboard for the MCP-RAG-V4 multi-agent system.

## Features

- **Real-time Agent Monitoring**: View status, progress, and metrics for all agents
- **Task Queue Management**: Submit tasks, track progress, and view results
- **RAG Knowledge Search**: Search the knowledge base with hybrid search
- **Performance Metrics**: Charts showing system performance over time
- **WebSocket Updates**: Real-time updates without page refresh

## Quick Start

### 1. Install Dependencies

```bash
cd ui/dashboard
pip3 install -r requirements.txt
```

### 2. Start the Dashboard Server

```bash
python3 server.py
```

The server will start on http://localhost:8000

### 3. Access the Dashboard

Open your browser and navigate to http://localhost:8000

Default credentials:
- Username: `admin`
- Password: `admin`

## Architecture

### Frontend
- **Technology**: React with Tailwind CSS
- **Real-time**: WebSocket connection for live updates
- **Charts**: Chart.js for metrics visualization
- **API Client**: JavaScript client for backend communication

### Backend
- **Framework**: FastAPI with async support
- **WebSocket**: Real-time bidirectional communication
- **Authentication**: JWT-based authentication
- **Integration**: Direct integration with AdminAgent and RAG system

## API Endpoints

### Authentication
- `POST /api/auth/login` - Login with credentials

### Agents
- `GET /api/agents` - List all agents
- `GET /api/agents/{agent_id}/status` - Get agent status

### Tasks
- `POST /api/tasks` - Submit new task
- `GET /api/tasks` - List tasks
- `GET /api/tasks/{task_id}` - Get task details

### RAG System
- `POST /api/rag/search` - Search knowledge base
- `POST /api/rag/ingest` - Ingest new document
- `GET /api/rag/stats` - Get RAG statistics

### Monitoring
- `GET /api/metrics` - Get performance metrics
- `GET /api/health` - Health check

### WebSocket
- `WS /ws` - Real-time updates

## Configuration

Environment variables:
- `JWT_SECRET_KEY` - Secret key for JWT tokens (required for production)
- `PORT` - Server port (default: 8000)

## Development

### Adding New Features

1. **Frontend Components**: Add React components to `index.html`
2. **API Endpoints**: Add FastAPI routes to `server.py`
3. **Real-time Updates**: Use WebSocket broadcast in `server.py`

### Testing

```bash
# Run with test data
python server.py --test-mode
```

## Production Deployment

1. Set secure JWT secret key
2. Configure CORS for your domain
3. Use production database
4. Enable HTTPS
5. Set up reverse proxy (nginx/Apache)

## Screenshots

### Agent Status Grid
Shows real-time status of all agents with progress indicators.

### Task Queue
Displays pending, executing, and completed tasks with priority levels.

### RAG Search
Powerful search interface with relevance scoring and source attribution.

### Performance Metrics
Real-time charts showing task completion rates and system performance.

## Troubleshooting

### WebSocket Connection Issues
- Check firewall settings
- Ensure WebSocket support in reverse proxy
- Verify CORS configuration

### Authentication Errors
- Clear browser localStorage
- Check JWT secret key configuration
- Verify token expiration

### Performance Issues
- Reduce update frequency in `send_periodic_updates`
- Implement pagination for large task lists
- Use connection pooling for database

## Future Enhancements

1. **User Management**: Add user roles and permissions
2. **Task Templates**: Pre-defined task configurations
3. **Export Functions**: Export metrics and logs
4. **Mobile Responsive**: Improve mobile experience
5. **Dark Mode**: Add theme toggle
6. **Notifications**: Browser notifications for important events