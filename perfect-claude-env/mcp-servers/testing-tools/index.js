import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { spawn } from 'child_process';
import { promises as fs } from 'fs';
import path from 'path';
import express from 'express';
import promClient from 'prom-client';

// Initialize Prometheus metrics
const register = new promClient.Registry();
promClient.collectDefaultMetrics({ register });

// Custom metrics
const toolCallsTotal = new promClient.Counter({
  name: 'mcp_tool_calls_total',
  help: 'Total number of MCP tool calls',
  labelNames: ['tool_name', 'status'],
  registers: [register]
});

const toolCallDuration = new promClient.Histogram({
  name: 'mcp_tool_call_duration_seconds',
  help: 'Duration of MCP tool calls in seconds',
  labelNames: ['tool_name'],
  buckets: [0.1, 0.5, 1, 5, 10, 30],
  registers: [register]
});

const serverUptime = new promClient.Gauge({
  name: 'mcp_server_uptime_seconds',
  help: 'Server uptime in seconds',
  registers: [register]
});

const startTime = Date.now();
setInterval(() => {
  serverUptime.set((Date.now() - startTime) / 1000);
}, 5000);

// Initialize HTTP server for metrics
const app = express();
const metricsPort = process.env.NODE_METRICS_PORT || 9100;

app.get('/metrics', async (req, res) => {
  res.set('Content-Type', register.contentType);
  res.end(await register.metrics());
});

app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    server: 'testing-tools-server',
    uptime: (Date.now() - startTime) / 1000,
    timestamp: new Date().toISOString()
  });
});

app.listen(metricsPort, () => {
  console.error(`Metrics server listening on port ${metricsPort}`);
});

const server = new Server({
  name: 'testing-tools-server',
  version: '1.0.0',
}, {
  capabilities: {
    tools: {},
  },
});

// Execute command helper
function executeCommand(command, args = [], cwd = process.cwd()) {
  return new Promise((resolve, reject) => {
    const proc = spawn(command, args, { 
      cwd, 
      shell: true,
      env: { ...process.env, FORCE_COLOR: '0' }
    });
    
    let stdout = '';
    let stderr = '';
    
    proc.stdout.on('data', (data) => {
      stdout += data.toString();
    });
    
    proc.stderr.on('data', (data) => {
      stderr += data.toString();
    });
    
    proc.on('close', (code) => {
      if (code === 0) {
        resolve({ stdout, stderr, code });
      } else {
        reject({ stdout, stderr, code });
      }
    });
  });
}

// Metrics wrapper for tool calls
async function withMetrics(toolName, handler) {
  const startTime = Date.now();
  try {
    const result = await handler();
    const duration = (Date.now() - startTime) / 1000;
    toolCallsTotal.labels(toolName, 'success').inc();
    toolCallDuration.labels(toolName).observe(duration);
    return result;
  } catch (error) {
    const duration = (Date.now() - startTime) / 1000;
    toolCallsTotal.labels(toolName, 'error').inc();
    toolCallDuration.labels(toolName).observe(duration);
    throw error;
  }
}

// Testing tools handler
server.setRequestHandler('tools/call', async (request) => {
  return await withMetrics(request.params.name, async () => {
    if (request.params.name === 'run_tests') {
      const { directory, command = 'npm test', pattern } = request.params.arguments;
      try {
        const testCommand = pattern ? `${command} -- ${pattern}` : command;
        const result = await executeCommand(testCommand, [], directory);
      
      return {
        content: [{
          type: 'text',
          text: `Test Results:\n${result.stdout}\n${result.stderr}`,
        }],
      };
    } catch (error) {
      return {
        content: [{
          type: 'text',
          text: `Test Failed (exit code ${error.code}):\n${error.stdout}\n${error.stderr}`,
        }],
        isError: true,
      };
    }
  }

  if (request.params.name === 'check_coverage') {
    const { directory, command = 'npm run coverage' } = request.params.arguments;
    try {
      const result = await executeCommand(command, [], directory);
      
      return {
        content: [{
          type: 'text',
          text: `Coverage Report:\n${result.stdout}`,
        }],
      };
    } catch (error) {
      return {
        content: [{
          type: 'text',
          text: `Coverage check failed:\n${error.stdout}\n${error.stderr}`,
        }],
        isError: true,
      };
    }
  }

  if (request.params.name === 'lint_code') {
    const { directory, command = 'npm run lint', fix = false } = request.params.arguments;
    try {
      const lintCommand = fix ? `${command} -- --fix` : command;
      const result = await executeCommand(lintCommand, [], directory);
      
      return {
        content: [{
          type: 'text',
          text: `Lint Results:\n${result.stdout}`,
        }],
      };
    } catch (error) {
      return {
        content: [{
          type: 'text',
          text: `Lint found issues:\n${error.stdout}\n${error.stderr}`,
        }],
      };
    }
  }

  if (request.params.name === 'validate_types') {
    const { directory, command = 'npx tsc --noEmit' } = request.params.arguments;
    try {
      const result = await executeCommand(command, [], directory);
      
      return {
        content: [{
          type: 'text',
          text: 'Type validation passed successfully',
        }],
      };
    } catch (error) {
      return {
        content: [{
          type: 'text',
          text: `Type validation failed:\n${error.stdout}\n${error.stderr}`,
        }],
        isError: true,
      };
    }
  }

  if (request.params.name === 'security_scan') {
    const { directory, tool = 'trivy', severity = 'HIGH,CRITICAL' } = request.params.arguments;
    try {
      let result;
      if (tool === 'trivy') {
        result = await executeCommand('trivy', ['fs', '--severity', severity, '--format', 'json', directory], directory);
      } else if (tool === 'snyk') {
        result = await executeCommand('snyk', ['test', '--json'], directory);
      } else if (tool === 'npm-audit') {
        result = await executeCommand('npm', ['audit', '--json'], directory);
      } else {
        throw new Error(`Unsupported security tool: ${tool}`);
      }
      
      return {
        content: [{
          type: 'text',
          text: `Security Scan Results (${tool}):\n${result.stdout}`,
        }],
      };
    } catch (error) {
      return {
        content: [{
          type: 'text',
          text: `Security scan failed:\n${error.stdout}\n${error.stderr}`,
        }],
        isError: true,
      };
    }
  }

  if (request.params.name === 'dependency_audit') {
    const { directory, tool = 'npm' } = request.params.arguments;
    try {
      let result;
      if (tool === 'npm') {
        result = await executeCommand('npm', ['audit', '--json'], directory);
      } else if (tool === 'yarn') {
        result = await executeCommand('yarn', ['audit', '--json'], directory);
      } else if (tool === 'pip-audit') {
        result = await executeCommand('pip-audit', ['--format', 'json'], directory);
      } else {
        throw new Error(`Unsupported audit tool: ${tool}`);
      }
      
      return {
        content: [{
          type: 'text',
          text: `Dependency Audit Results (${tool}):\n${result.stdout}`,
        }],
      };
    } catch (error) {
      return {
        content: [{
          type: 'text',
          text: `Dependency audit failed:\n${error.stdout}\n${error.stderr}`,
        }],
        isError: true,
      };
    }
  }

  if (request.params.name === 'benchmark') {
    const { directory, script } = request.params.arguments;
    try {
      // Create a simple benchmark script if none provided
      const benchmarkScript = script || `
const start = process.hrtime.bigint();
// Run your code here
const end = process.hrtime.bigint();
console.log(\`Execution time: \${(end - start) / 1000000n}ms\`);
      `;
      
      const tempFile = path.join(directory, `benchmark-${Date.now()}.js`);
      await fs.writeFile(tempFile, benchmarkScript);
      
      const result = await executeCommand('node', [tempFile], directory);
      await fs.unlink(tempFile);
      
      return {
        content: [{
          type: 'text',
          text: `Benchmark Results:\n${result.stdout}`,
        }],
      };
    } catch (error) {
      return {
        content: [{
          type: 'text',
          text: `Benchmark failed:\n${error.stdout}\n${error.stderr}`,
        }],
        isError: true,
      };
    }
  }

    throw new Error(`Unknown tool: ${request.params.name}`);
  });
});

// List available tools
server.setRequestHandler('tools/list', async () => {
  return {
    tools: [
      {
        name: 'run_tests',
        description: 'Run tests in a directory',
        inputSchema: {
          type: 'object',
          properties: {
            directory: { type: 'string', description: 'Directory to run tests in' },
            command: { type: 'string', description: 'Test command (default: npm test)' },
            pattern: { type: 'string', description: 'Test file pattern' },
          },
          required: ['directory'],
        },
      },
      {
        name: 'check_coverage',
        description: 'Check test coverage',
        inputSchema: {
          type: 'object',
          properties: {
            directory: { type: 'string', description: 'Directory to check coverage in' },
            command: { type: 'string', description: 'Coverage command (default: npm run coverage)' },
          },
          required: ['directory'],
        },
      },
      {
        name: 'lint_code',
        description: 'Run linter on code',
        inputSchema: {
          type: 'object',
          properties: {
            directory: { type: 'string', description: 'Directory to lint' },
            command: { type: 'string', description: 'Lint command (default: npm run lint)' },
            fix: { type: 'boolean', description: 'Auto-fix issues' },
          },
          required: ['directory'],
        },
      },
      {
        name: 'validate_types',
        description: 'Validate TypeScript types',
        inputSchema: {
          type: 'object',
          properties: {
            directory: { type: 'string', description: 'Directory to validate' },
            command: { type: 'string', description: 'Type check command (default: npx tsc --noEmit)' },
          },
          required: ['directory'],
        },
      },
      {
        name: 'security_scan',
        description: 'Run security vulnerability scan',
        inputSchema: {
          type: 'object',
          properties: {
            directory: { type: 'string', description: 'Directory to scan' },
            tool: { type: 'string', description: 'Security tool (trivy, snyk, npm-audit)', default: 'trivy' },
            severity: { type: 'string', description: 'Severity filter (LOW,MEDIUM,HIGH,CRITICAL)', default: 'HIGH,CRITICAL' },
          },
          required: ['directory'],
        },
      },
      {
        name: 'dependency_audit',
        description: 'Audit dependencies for vulnerabilities',
        inputSchema: {
          type: 'object',
          properties: {
            directory: { type: 'string', description: 'Directory to audit' },
            tool: { type: 'string', description: 'Audit tool (npm, yarn, pip-audit)', default: 'npm' },
          },
          required: ['directory'],
        },
      },
      {
        name: 'benchmark',
        description: 'Run performance benchmark',
        inputSchema: {
          type: 'object',
          properties: {
            directory: { type: 'string', description: 'Directory to run benchmark in' },
            script: { type: 'string', description: 'Benchmark script content' },
          },
          required: ['directory'],
        },
      },
    ],
  };
});

const transport = new StdioServerTransport();
await server.connect(transport);
console.error('Testing Tools MCP server running on stdio');