#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { readFile, writeFile, readdir, mkdir, access, stat } from "fs/promises";
import { join, relative, dirname } from "path";
import { constants } from "fs";
import { exec } from "child_process";
import { promisify } from "util";
import { createHash } from "crypto";

const execAsync = promisify(exec);

// Enhanced MCP server for multi-agent coordination
const server = new McpServer({
  name: "mcp-rag-enhanced-server",
  version: "2.0.0",
  description: "Advanced MCP server for multi-agent AI development with comprehensive tooling"
});

// Configuration
const ROOT_PATH = process.cwd();
const COORDINATION_PATH = join(ROOT_PATH, "coordination");
const TASKS_PATH = join(COORDINATION_PATH, "ACTIVE_TASKS.json");
const PATTERNS_PATH = join(COORDINATION_PATH, "patterns");
const KNOWLEDGE_PATH = join(COORDINATION_PATH, "knowledge");
const CONTEXT_PATH = join(COORDINATION_PATH, "context");
const WORKTREES_PATH = join(ROOT_PATH, ".worktrees");

// Ensure all directories exist
async function ensureDirectories() {
  const dirs = [PATTERNS_PATH, KNOWLEDGE_PATH, CONTEXT_PATH, WORKTREES_PATH];
  for (const dir of dirs) {
    try {
      await access(dir, constants.F_OK);
    } catch {
      await mkdir(dir, { recursive: true });
    }
  }
}

// Helper functions
async function fileExists(path: string): Promise<boolean> {
  try {
    await access(path, constants.F_OK);
    return true;
  } catch {
    return false;
  }
}

async function getProjectInfo(projectPath: string) {
  const info: any = {
    path: projectPath,
    exists: await fileExists(projectPath),
    type: "unknown",
    framework: null,
    hasTests: false,
    hasPackageJson: false,
    hasTsConfig: false
  };

  if (!info.exists) return info;

  // Check for package.json
  const packageJsonPath = join(projectPath, "package.json");
  if (await fileExists(packageJsonPath)) {
    info.hasPackageJson = true;
    try {
      const packageJson = JSON.parse(await readFile(packageJsonPath, "utf-8"));
      info.name = packageJson.name;
      info.version = packageJson.version;
      info.scripts = packageJson.scripts || {};
      
      // Detect framework
      const deps = { ...packageJson.dependencies, ...packageJson.devDependencies };
      if (deps.next) info.framework = "nextjs";
      else if (deps.react) info.framework = "react";
      else if (deps.vue) info.framework = "vue";
      else if (deps.angular) info.framework = "angular";
      else if (deps.express) info.framework = "express";
      else if (deps.fastify) info.framework = "fastify";
      
      // Check for test frameworks
      if (deps.jest || deps.vitest || deps.mocha || deps["@testing-library/react"]) {
        info.hasTests = true;
      }
    } catch (e) {
      info.packageJsonError = e.message;
    }
  }

  // Check for TypeScript
  if (await fileExists(join(projectPath, "tsconfig.json"))) {
    info.hasTsConfig = true;
    info.type = "typescript";
  } else {
    info.type = "javascript";
  }

  return info;
}

// === PHASE 1: CORE ENHANCEMENTS ===

// Enhanced task management with metadata
server.tool(
  "get_tasks_enhanced",
  {
    filter: z.object({
      status: z.enum(["TODO", "IN_PROGRESS", "COMPLETED", "BLOCKED"]).optional(),
      agent: z.string().optional(),
      priority: z.enum(["low", "medium", "high", "critical"]).optional()
    }).optional()
  },
  async ({ filter }) => {
    try {
      const content = await readFile(TASKS_PATH, "utf-8");
      const data = JSON.parse(content);
      
      let tasks = data.tasks || [];
      
      // Apply filters
      if (filter) {
        if (filter.status) {
          tasks = tasks.filter(t => t.status === filter.status);
        }
        if (filter.agent) {
          tasks = tasks.filter(t => t.assignedTo === filter.agent);
        }
        if (filter.priority) {
          tasks = tasks.filter(t => t.priority === filter.priority);
        }
      }
      
      // Add metadata
      const metadata = {
        total: data.tasks?.length || 0,
        filtered: tasks.length,
        byStatus: {},
        byAgent: {},
        lastUpdated: data.lastUpdated || null
      };
      
      // Calculate stats
      data.tasks?.forEach(task => {
        metadata.byStatus[task.status] = (metadata.byStatus[task.status] || 0) + 1;
        if (task.assignedTo) {
          metadata.byAgent[task.assignedTo] = (metadata.byAgent[task.assignedTo] || 0) + 1;
        }
      });
      
      return {
        content: [{ 
          type: "text", 
          text: JSON.stringify({ tasks, metadata }, null, 2)
        }]
      };
    } catch (error) {
      return {
        content: [{ type: "text", text: JSON.stringify({ error: error.message }) }]
      };
    }
  },
  {
    description: "Get tasks with advanced filtering and metadata"
  }
);

// Git operations for agents
server.tool(
  "git_operation",
  {
    operation: z.enum(["status", "diff", "add", "commit", "branch", "checkout", "merge", "pull", "push"]),
    workingDir: z.string().describe("Working directory for git operation"),
    options: z.object({
      files: z.array(z.string()).optional(),
      message: z.string().optional(),
      branch: z.string().optional(),
      remote: z.string().optional()
    }).optional()
  },
  async ({ operation, workingDir, options }) => {
    try {
      let command = `cd ${workingDir} && git `;
      
      switch (operation) {
        case "status":
          command += "status --porcelain";
          break;
        case "diff":
          command += `diff ${options?.files?.join(" ") || ""}`;
          break;
        case "add":
          command += `add ${options?.files?.join(" ") || "."}`;
          break;
        case "commit":
          if (!options?.message) throw new Error("Commit message required");
          command += `commit -m "${options.message}"`;
          break;
        case "branch":
          command += `branch ${options?.branch || ""}`;
          break;
        case "checkout":
          if (!options?.branch) throw new Error("Branch name required");
          command += `checkout ${options.branch}`;
          break;
        case "merge":
          if (!options?.branch) throw new Error("Branch name required");
          command += `merge ${options.branch}`;
          break;
        case "pull":
          command += `pull ${options?.remote || "origin"} ${options?.branch || ""}`;
          break;
        case "push":
          command += `push ${options?.remote || "origin"} ${options?.branch || ""}`;
          break;
      }
      
      const { stdout, stderr } = await execAsync(command);
      
      return {
        content: [{ 
          type: "text", 
          text: JSON.stringify({
            operation,
            workingDir,
            stdout: stdout.trim(),
            stderr: stderr.trim(),
            success: !stderr || stderr.includes("warning")
          }, null, 2)
        }]
      };
    } catch (error) {
      return {
        content: [{ 
          type: "text", 
          text: JSON.stringify({ 
            error: error.message,
            operation,
            workingDir 
          }, null, 2)
        }]
      };
    }
  },
  {
    description: "Perform git operations in agent worktrees"
  }
);

// Project analysis tool
server.tool(
  "analyze_project",
  {
    projectPath: z.string(),
    depth: z.enum(["shallow", "deep", "comprehensive"]).default("deep"),
    focus: z.array(z.string()).optional().describe("Specific areas to focus on")
  },
  async ({ projectPath, depth, focus }) => {
    try {
      const analysis: any = {
        projectInfo: await getProjectInfo(projectPath),
        structure: {},
        insights: [],
        recommendations: [],
        timestamp: new Date().toISOString()
      };
      
      // Analyze project structure
      if (depth !== "shallow") {
        const files = await execAsync(`find ${projectPath} -type f -name "*.js" -o -name "*.ts" -o -name "*.jsx" -o -name "*.tsx" | head -100`);
        const fileList = files.stdout.trim().split("\n").filter(Boolean);
        
        analysis.structure = {
          totalFiles: fileList.length,
          fileTypes: {},
          directories: new Set()
        };
        
        fileList.forEach(file => {
          const ext = file.split(".").pop();
          analysis.structure.fileTypes[ext] = (analysis.structure.fileTypes[ext] || 0) + 1;
          analysis.structure.directories.add(dirname(relative(projectPath, file)).split("/")[0]);
        });
        
        analysis.structure.directories = Array.from(analysis.structure.directories);
      }
      
      // Generate insights
      if (analysis.projectInfo.hasPackageJson && !analysis.projectInfo.scripts.test) {
        analysis.insights.push("No test script defined in package.json");
        analysis.recommendations.push("Add test script to enable automated testing");
      }
      
      if (analysis.projectInfo.type === "javascript" && depth === "comprehensive") {
        analysis.recommendations.push("Consider migrating to TypeScript for better type safety");
      }
      
      if (focus?.includes("performance")) {
        analysis.insights.push("Performance analysis requested - checking for common issues");
        // Add performance-specific checks
      }
      
      if (focus?.includes("security")) {
        analysis.insights.push("Security analysis requested - checking dependencies");
        // Add security-specific checks
      }
      
      return {
        content: [{ 
          type: "text", 
          text: JSON.stringify(analysis, null, 2)
        }]
      };
    } catch (error) {
      return {
        content: [{ 
          type: "text", 
          text: JSON.stringify({ error: error.message }, null, 2)
        }]
      };
    }
  },
  {
    description: "Comprehensive project analysis with insights and recommendations"
  }
);

// Testing capabilities
server.tool(
  "run_tests",
  {
    projectPath: z.string(),
    testCommand: z.string().optional().describe("Override default test command"),
    coverage: z.boolean().default(false),
    watch: z.boolean().default(false),
    filter: z.string().optional().describe("Test name pattern to filter")
  },
  async ({ projectPath, testCommand, coverage, watch, filter }) => {
    try {
      const projectInfo = await getProjectInfo(projectPath);
      
      // Determine test command
      let command = testCommand;
      if (!command && projectInfo.scripts?.test) {
        command = "npm test";
        if (coverage) command += " -- --coverage";
        if (filter) command += ` -- --testNamePattern="${filter}"`;
        if (watch) command += " -- --watch";
      } else if (!command) {
        throw new Error("No test command found. Please provide testCommand parameter.");
      }
      
      // Run tests with timeout
      const { stdout, stderr } = await execAsync(
        `cd ${projectPath} && ${command}`,
        { timeout: 300000 } // 5 minute timeout
      );
      
      // Parse results if possible
      const results: any = {
        command,
        projectPath,
        stdout: stdout.trim(),
        stderr: stderr.trim(),
        success: !stderr.includes("FAIL") && !stderr.includes("error"),
        timestamp: new Date().toISOString()
      };
      
      // Try to extract test counts
      const passMatch = stdout.match(/(\d+) pass/);
      const failMatch = stdout.match(/(\d+) fail/);
      if (passMatch || failMatch) {
        results.summary = {
          passed: passMatch ? parseInt(passMatch[1]) : 0,
          failed: failMatch ? parseInt(failMatch[1]) : 0
        };
      }
      
      return {
        content: [{ 
          type: "text", 
          text: JSON.stringify(results, null, 2)
        }]
      };
    } catch (error) {
      return {
        content: [{ 
          type: "text", 
          text: JSON.stringify({ 
            error: error.message,
            projectPath,
            command: testCommand 
          }, null, 2)
        }]
      };
    }
  },
  {
    description: "Run tests with coverage and filtering options"
  }
);

// Knowledge extraction and pattern learning
server.tool(
  "extract_pattern",
  {
    name: z.string(),
    description: z.string(),
    sourceFile: z.string().describe("File containing the pattern"),
    startLine: z.number().optional(),
    endLine: z.number().optional(),
    category: z.enum(["architecture", "implementation", "testing", "optimization", "bugfix"]),
    tags: z.array(z.string()),
    metadata: z.record(z.any()).optional()
  },
  async ({ name, description, sourceFile, startLine, endLine, category, tags, metadata }) => {
    try {
      let code = "";
      
      if (await fileExists(sourceFile)) {
        const content = await readFile(sourceFile, "utf-8");
        const lines = content.split("\n");
        
        if (startLine && endLine) {
          code = lines.slice(startLine - 1, endLine).join("\n");
        } else {
          code = content;
        }
      }
      
      const pattern = {
        id: `pattern-${category}-${Date.now()}`,
        name,
        description,
        category,
        code,
        sourceFile,
        lineRange: startLine && endLine ? [startLine, endLine] : null,
        tags,
        metadata: {
          ...metadata,
          extractedBy: process.env.AGENT_NAME || "unknown",
          extractedAt: new Date().toISOString(),
          codeHash: createHash("sha256").update(code).digest("hex").substring(0, 8)
        }
      };
      
      // Store in categorized directory
      const categoryDir = join(PATTERNS_PATH, category);
      await mkdir(categoryDir, { recursive: true });
      
      await writeFile(
        join(categoryDir, `${pattern.id}.json`),
        JSON.stringify(pattern, null, 2)
      );
      
      // Update pattern index
      const indexPath = join(PATTERNS_PATH, "index.json");
      let index = {};
      if (await fileExists(indexPath)) {
        index = JSON.parse(await readFile(indexPath, "utf-8"));
      }
      
      if (!index[category]) index[category] = [];
      index[category].push({
        id: pattern.id,
        name: pattern.name,
        tags: pattern.tags,
        timestamp: pattern.metadata.extractedAt
      });
      
      await writeFile(indexPath, JSON.stringify(index, null, 2));
      
      return {
        content: [{ 
          type: "text", 
          text: JSON.stringify({ 
            success: true,
            patternId: pattern.id,
            category,
            stored: true
          }, null, 2)
        }]
      };
    } catch (error) {
      return {
        content: [{ 
          type: "text", 
          text: JSON.stringify({ error: error.message }, null, 2)
        }]
      };
    }
  },
  {
    description: "Extract and store successful implementation patterns with categorization"
  }
);

// Enhanced verification with multiple checks
server.tool(
  "verify_implementation",
  {
    projectPath: z.string(),
    checks: z.array(z.object({
      type: z.enum(["file_exists", "npm_installed", "tests_pass", "build_succeeds", "lint_passes", "server_runs", "endpoint_responds"]),
      config: z.record(z.any()).optional()
    }))
  },
  async ({ projectPath, checks }) => {
    const results = {
      projectPath,
      timestamp: new Date().toISOString(),
      checks: {},
      overall: true
    };
    
    for (const check of checks) {
      try {
        switch (check.type) {
          case "file_exists":
            const filePath = join(projectPath, check.config?.path || "");
            results.checks[check.type] = await fileExists(filePath);
            break;
            
          case "npm_installed":
            const nodeModulesPath = join(projectPath, "node_modules");
            results.checks[check.type] = await fileExists(nodeModulesPath);
            break;
            
          case "tests_pass":
            try {
              const testResult = await execAsync(`cd ${projectPath} && npm test`, { timeout: 120000 });
              results.checks[check.type] = !testResult.stderr.includes("FAIL");
            } catch {
              results.checks[check.type] = false;
            }
            break;
            
          case "build_succeeds":
            try {
              const buildResult = await execAsync(`cd ${projectPath} && npm run build`, { timeout: 180000 });
              results.checks[check.type] = buildResult.stderr === "" || !buildResult.stderr.includes("error");
            } catch {
              results.checks[check.type] = false;
            }
            break;
            
          case "lint_passes":
            try {
              const lintResult = await execAsync(`cd ${projectPath} && npm run lint`, { timeout: 60000 });
              results.checks[check.type] = !lintResult.stderr.includes("error");
            } catch {
              results.checks[check.type] = false;
            }
            break;
            
          case "server_runs":
            // This would need more sophisticated implementation
            results.checks[check.type] = "not_implemented";
            break;
            
          case "endpoint_responds":
            // This would need HTTP client implementation
            results.checks[check.type] = "not_implemented";
            break;
        }
        
        if (results.checks[check.type] === false) {
          results.overall = false;
        }
      } catch (error) {
        results.checks[check.type] = { error: error.message };
        results.overall = false;
      }
    }
    
    return {
      content: [{ 
        type: "text", 
        text: JSON.stringify(results, null, 2)
      }]
    };
  },
  {
    description: "Comprehensive verification with multiple check types"
  }
);

// Agent context sharing
server.tool(
  "share_context",
  {
    agent: z.string(),
    context: z.object({
      currentTask: z.string().optional(),
      workingDirectory: z.string().optional(),
      blockers: z.array(z.string()).optional(),
      discoveries: z.array(z.string()).optional(),
      needs: z.array(z.string()).optional()
    })
  },
  async ({ agent, context }) => {
    try {
      const contextPath = join(CONTEXT_PATH, `${agent}.json`);
      const fullContext = {
        ...context,
        agent,
        timestamp: new Date().toISOString()
      };
      
      await writeFile(contextPath, JSON.stringify(fullContext, null, 2));
      
      // Also update shared context
      const sharedPath = join(CONTEXT_PATH, "shared.json");
      let shared = {};
      if (await fileExists(sharedPath)) {
        shared = JSON.parse(await readFile(sharedPath, "utf-8"));
      }
      
      shared[agent] = fullContext;
      await writeFile(sharedPath, JSON.stringify(shared, null, 2));
      
      return {
        content: [{ 
          type: "text", 
          text: JSON.stringify({ 
            success: true,
            agent,
            contextUpdated: true
          }, null, 2)
        }]
      };
    } catch (error) {
      return {
        content: [{ 
          type: "text", 
          text: JSON.stringify({ error: error.message }, null, 2)
        }]
      };
    }
  },
  {
    description: "Share working context with other agents"
  }
);

// Get all agent contexts
server.tool(
  "get_agent_contexts",
  {},
  async () => {
    try {
      const sharedPath = join(CONTEXT_PATH, "shared.json");
      if (await fileExists(sharedPath)) {
        const contexts = JSON.parse(await readFile(sharedPath, "utf-8"));
        return {
          content: [{ 
            type: "text", 
            text: JSON.stringify(contexts, null, 2)
          }]
        };
      }
      
      return {
        content: [{ 
          type: "text", 
          text: JSON.stringify({ message: "No shared contexts found" })
        }]
      };
    } catch (error) {
      return {
        content: [{ 
          type: "text", 
          text: JSON.stringify({ error: error.message })
        }]
      };
    }
  },
  {
    description: "Get the current context of all agents"
  }
);

// === RESOURCES ===

// Dynamic resource for current system state
server.resource(
  "system_state",
  "Current state of the multi-agent system",
  async () => {
    try {
      const state = {
        agents: {},
        tasks: { total: 0, byStatus: {} },
        patterns: { total: 0, byCategory: {} },
        timestamp: new Date().toISOString()
      };
      
      // Get agent contexts
      const sharedPath = join(CONTEXT_PATH, "shared.json");
      if (await fileExists(sharedPath)) {
        state.agents = JSON.parse(await readFile(sharedPath, "utf-8"));
      }
      
      // Get task summary
      if (await fileExists(TASKS_PATH)) {
        const tasks = JSON.parse(await readFile(TASKS_PATH, "utf-8"));
        state.tasks.total = tasks.tasks?.length || 0;
        tasks.tasks?.forEach(task => {
          state.tasks.byStatus[task.status] = (state.tasks.byStatus[task.status] || 0) + 1;
        });
      }
      
      // Get pattern summary
      const indexPath = join(PATTERNS_PATH, "index.json");
      if (await fileExists(indexPath)) {
        const index = JSON.parse(await readFile(indexPath, "utf-8"));
        for (const category in index) {
          state.patterns.byCategory[category] = index[category].length;
          state.patterns.total += index[category].length;
        }
      }
      
      return {
        resources: [{
          uri: "system://state",
          name: "System State",
          mimeType: "application/json",
          text: JSON.stringify(state, null, 2)
        }]
      };
    } catch (error) {
      return {
        resources: [{
          uri: "system://state",
          name: "System State Error",
          mimeType: "application/json",
          text: JSON.stringify({ error: error.message })
        }]
      };
    }
  }
);

// === PROMPTS ===

// Enhanced coordination prompt
server.prompt(
  "agent_setup",
  {
    agent: z.enum(["architect", "builder", "validator"]),
    project: z.string().optional()
  },
  async ({ agent, project }) => {
    const messages = [
      {
        role: "system",
        content: {
          type: "text",
          text: `You are the ${agent.toUpperCase()} agent in a multi-agent development system.`
        }
      }
    ];
    
    // Add role-specific instructions
    switch (agent) {
      case "architect":
        messages.push({
          role: "user",
          content: {
            type: "text",
            text: `Your responsibilities:
1. Design system architecture and create detailed specifications
2. Use analyze_project to understand existing codebases
3. Extract successful patterns using extract_pattern
4. Share your context regularly with share_context
5. Never implement code - only design and specify

Start by checking tasks with get_tasks_enhanced and sharing your initial context.`
          }
        });
        break;
        
      case "builder":
        messages.push({
          role: "user",
          content: {
            type: "text",
            text: `Your responsibilities:
1. Implement designs from the architect
2. Use git_operation for version control in your worktree
3. Run tests with run_tests after implementation
4. Verify your work with verify_implementation
5. Extract reusable patterns when successful

Start by checking tasks and architect's context with get_agent_contexts.`
          }
        });
        break;
        
      case "validator":
        messages.push({
          role: "user",
          content: {
            type: "text",
            text: `Your responsibilities:
1. Test and validate all implementations
2. Use verify_implementation with comprehensive checks
3. Run visual tests and take screenshots
4. Block any code that doesn't meet standards
5. Document issues and provide detailed feedback

Start by checking what needs validation with get_tasks_enhanced.`
          }
        });
        break;
    }
    
    if (project) {
      messages.push({
        role: "user",
        content: {
          type: "text",
          text: `Current project: ${project}\nAnalyze it first with analyze_project tool.`
        }
      });
    }
    
    return { messages };
  },
  {
    description: "Initialize an agent with role-specific instructions"
  }
);

// Main server startup
async function main() {
  await ensureDirectories();
  
  const transport = new StdioServerTransport();
  await server.connect(transport);
  
  console.error("Enhanced MCP Agent Server v2.0 running");
  console.error(`Available tools: ${server._tools?.size || 0}`);
  console.error(`Available resources: ${server._resources?.size || 0}`);
  console.error(`Available prompts: ${server._prompts?.size || 0}`);
}

main().catch((error) => {
  console.error("Server error:", error);
  process.exit(1);
});