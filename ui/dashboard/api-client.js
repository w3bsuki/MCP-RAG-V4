/**
 * API Client for MCP-RAG-V4 Dashboard
 * Handles communication with backend services
 */

class MCPRAGApiClient {
    constructor(config = {}) {
        this.baseUrl = config.baseUrl || 'http://localhost:3000/api';
        this.wsUrl = config.wsUrl || 'ws://localhost:3000/ws';
        this.token = config.token || null;
        this.ws = null;
        this.eventHandlers = new Map();
    }

    // Authentication
    async authenticate(credentials) {
        const response = await this.request('/auth/login', {
            method: 'POST',
            body: JSON.stringify(credentials)
        });
        
        if (response.token) {
            this.token = response.token;
            localStorage.setItem('mcp_rag_token', response.token);
        }
        
        return response;
    }

    // Agent Management
    async getAgents() {
        return this.request('/agents');
    }

    async getAgentStatus(agentId) {
        return this.request(`/agents/${agentId}/status`);
    }

    async submitTask(task) {
        return this.request('/tasks', {
            method: 'POST',
            body: JSON.stringify(task)
        });
    }

    // Task Management
    async getTasks(params = {}) {
        const queryString = new URLSearchParams(params).toString();
        return this.request(`/tasks?${queryString}`);
    }

    async getTaskStatus(taskId) {
        return this.request(`/tasks/${taskId}`);
    }

    async cancelTask(taskId) {
        return this.request(`/tasks/${taskId}/cancel`, {
            method: 'POST'
        });
    }

    // RAG Operations
    async searchKnowledge(query, options = {}) {
        return this.request('/rag/search', {
            method: 'POST',
            body: JSON.stringify({ query, ...options })
        });
    }

    async ingestDocument(document) {
        return this.request('/rag/ingest', {
            method: 'POST',
            body: JSON.stringify(document)
        });
    }

    async getRAGStats() {
        return this.request('/rag/stats');
    }

    // Metrics and Monitoring
    async getMetrics(period = '1h') {
        return this.request(`/metrics?period=${period}`);
    }

    async getSystemHealth() {
        return this.request('/health');
    }

    // WebSocket Connection for Real-time Updates
    connectWebSocket() {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            return;
        }

        this.ws = new WebSocket(this.wsUrl);

        this.ws.onopen = () => {
            console.log('WebSocket connected');
            this.emit('connected');
            
            // Authenticate WebSocket connection
            if (this.token) {
                this.ws.send(JSON.stringify({
                    type: 'auth',
                    token: this.token
                }));
            }
        };

        this.ws.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                this.handleWebSocketMessage(data);
            } catch (error) {
                console.error('Failed to parse WebSocket message:', error);
            }
        };

        this.ws.onerror = (error) => {
            console.error('WebSocket error:', error);
            this.emit('error', error);
        };

        this.ws.onclose = () => {
            console.log('WebSocket disconnected');
            this.emit('disconnected');
            
            // Attempt to reconnect after 5 seconds
            setTimeout(() => this.connectWebSocket(), 5000);
        };
    }

    handleWebSocketMessage(data) {
        switch (data.type) {
            case 'agent_status_update':
                this.emit('agentStatusUpdate', data.payload);
                break;
            
            case 'task_update':
                this.emit('taskUpdate', data.payload);
                break;
            
            case 'metrics_update':
                this.emit('metricsUpdate', data.payload);
                break;
            
            case 'log_entry':
                this.emit('logEntry', data.payload);
                break;
            
            default:
                console.warn('Unknown WebSocket message type:', data.type);
        }
    }

    // Event Handling
    on(event, handler) {
        if (!this.eventHandlers.has(event)) {
            this.eventHandlers.set(event, new Set());
        }
        this.eventHandlers.get(event).add(handler);
    }

    off(event, handler) {
        if (this.eventHandlers.has(event)) {
            this.eventHandlers.get(event).delete(handler);
        }
    }

    emit(event, data) {
        if (this.eventHandlers.has(event)) {
            this.eventHandlers.get(event).forEach(handler => {
                try {
                    handler(data);
                } catch (error) {
                    console.error(`Error in event handler for ${event}:`, error);
                }
            });
        }
    }

    // HTTP Request Helper
    async request(endpoint, options = {}) {
        const url = `${this.baseUrl}${endpoint}`;
        const headers = {
            'Content-Type': 'application/json',
            ...options.headers
        };

        if (this.token) {
            headers['Authorization'] = `Bearer ${this.token}`;
        }

        try {
            const response = await fetch(url, {
                ...options,
                headers
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.message || `HTTP ${response.status}`);
            }

            return response.json();
        } catch (error) {
            console.error(`API request failed: ${endpoint}`, error);
            throw error;
        }
    }

    // Utility Methods
    disconnect() {
        if (this.ws) {
            this.ws.close();
            this.ws = null;
        }
    }

    setToken(token) {
        this.token = token;
        if (token) {
            localStorage.setItem('mcp_rag_token', token);
        } else {
            localStorage.removeItem('mcp_rag_token');
        }
    }

    loadStoredToken() {
        const storedToken = localStorage.getItem('mcp_rag_token');
        if (storedToken) {
            this.token = storedToken;
        }
        return storedToken;
    }
}

// Export for use in browser
if (typeof window !== 'undefined') {
    window.MCPRAGApiClient = MCPRAGApiClient;
}

// Export for Node.js/module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = MCPRAGApiClient;
}