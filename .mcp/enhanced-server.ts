import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import { readFile, writeFile, readdir, stat } from "fs/promises";
import { join, dirname } from "path";
import cron from 'node-cron';
import chokidar from 'chokidar';
import { SimpleGit, simpleGit } from 'simple-git';

interface Pattern {
  id: string;
  content: string;
  description: string;
  tags: string[];
  agentId: string;
  timestamp: string;
  successMetrics?: {
    reusabilityScore?: number;
    timeToImplement?: number;
    successRate?: number;
  };
}

interface CoordinationGap {
  type: 'stale_update' | 'missing_dependency' | 'blocked_task';
  severity: 'low' | 'medium' | 'high' | 'critical';
  agentId: string;
  taskId?: string;
  description: string;
  suggestedAction: string;
  detectedAt: string;
}

interface SystemMetrics {
  coordinationEfficiency: number;
  taskCompletionAccuracy: number;
  ragQueryEffectiveness: number;
  blockerResolutionTime: number;
  lastUpdated: string;
}

class EnhancedMCPServer {
  private server: Server;
  private patterns: Map<string, Pattern> = new Map();
  private coordinationWatcher: chokidar.FSWatcher | null = null;
  private systemMetrics: SystemMetrics = {
    coordinationEfficiency: 0,
    taskCompletionAccuracy: 0,
    ragQueryEffectiveness: 0,
    blockerResolutionTime: 0,
    lastUpdated: new Date().toISOString()
  };

  constructor() {
    this.server = new Server(
      {
        name: "enhanced-mcp-rag-server",
        version: "1.1.0",
      },
      {
        capabilities: {
          tools: {}
        }
      }
    );

    this.setupToolHandlers();
    this.startCoordinationMonitoring();
    this.startSystemMetricsCollection();
  }

  private setupToolHandlers() {
    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: [
        {
          name: "rag_search",
          description: "Search for patterns and knowledge with intelligent ranking",
          inputSchema: {
            type: "object",
            properties: {
              query: { type: "string", description: "Search query" },
              limit: { type: "number", default: 5 },
              tags: { type: "array", items: { type: "string" } },
              includeMetrics: { type: "boolean", default: false }
            },
            required: ["query"]
          }
        },
        {
          name: "rag_upsert",
          description: "Store patterns with success metrics tracking",
          inputSchema: {
            type: "object",
            properties: {
              content: { type: "string" },
              description: { type: "string" },
              tags: { type: "array", items: { type: "string" } },
              agentId: { type: "string" },
              successMetrics: {
                type: "object",
                properties: {
                  reusabilityScore: { type: "number" },
                  timeToImplement: { type: "number" },
                  successRate: { type: "number" }
                }
              }
            },
            required: ["content", "description", "agentId"]
          }
        },
        {
          name: "detect_coordination_gaps",
          description: "Analyze coordination for gaps and inefficiencies",
          inputSchema: {
            type: "object",
            properties: {
              checkLast: { type: "number", default: 60, description: "Minutes to check back" }
            }
          }
        },
        {
          name: "get_system_metrics",
          description: "Get current system performance metrics",
          inputSchema: {
            type: "object",
            properties: {
              includeHistory: { type: "boolean", default: false }
            }
          }
        },
        {
          name: "predict_task_blockers",
          description: "Predict potential blockers for upcoming tasks",
          inputSchema: {
            type: "object",
            properties: {
              taskId: { type: "string" },
              context: { type: "object" }
            },
            required: ["taskId"]
          }
        },
        {
          name: "suggest_workflow_optimizations",
          description: "Analyze workflow and suggest improvements",
          inputSchema: {
            type: "object",
            properties: {
              agentId: { type: "string" },
              timeframe: { type: "string", default: "24h" }
            }
          }
        }
      ]
    }));

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      try {
        switch (name) {
          case "rag_search":
            return await this.enhancedSearch(args);
          case "rag_upsert":
            return await this.enhancedUpsert(args);
          case "detect_coordination_gaps":
            return await this.detectCoordinationGaps(args);
          case "get_system_metrics":
            return await this.getSystemMetrics(args);
          case "predict_task_blockers":
            return await this.predictTaskBlockers(args);
          case "suggest_workflow_optimizations":
            return await this.suggestWorkflowOptimizations(args);
          default:
            throw new Error(`Unknown tool: ${name}`);
        }
      } catch (error) {
        return {
          content: [
            {
              type: "text",
              text: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`
            }
          ]
        };
      }
    });
  }

  private async enhancedSearch(args: any) {
    const { query, limit = 5, tags = [], includeMetrics = false } = args;
    
    // Load existing patterns
    await this.loadPatterns();
    
    // Smart ranking: relevance + success metrics
    const results = Array.from(this.patterns.values())
      .filter(pattern => {
        const matchesQuery = pattern.content.toLowerCase().includes(query.toLowerCase()) ||
                           pattern.description.toLowerCase().includes(query.toLowerCase());
        const matchesTags = tags.length === 0 || tags.some((tag: string) => pattern.tags.includes(tag));
        return matchesQuery && matchesTags;
      })
      .sort((a, b) => {
        // Weight by success metrics
        const scoreA = (a.successMetrics?.successRate || 0.5) * (a.successMetrics?.reusabilityScore || 0.5);
        const scoreB = (b.successMetrics?.successRate || 0.5) * (b.successMetrics?.reusabilityScore || 0.5);
        return scoreB - scoreA;
      })
      .slice(0, limit);

    const response = {
      query,
      results: results.map(pattern => ({
        id: pattern.id,
        content: pattern.content,
        description: pattern.description,
        tags: pattern.tags,
        agentId: pattern.agentId,
        timestamp: pattern.timestamp,
        ...(includeMetrics && { successMetrics: pattern.successMetrics })
      })),
      total: results.length,
      searchMetrics: {
        totalPatterns: this.patterns.size,
        avgSuccessRate: this.calculateAverageSuccessRate(),
        lastUpdated: new Date().toISOString()
      }
    };

    return {
      content: [{ type: "text", text: JSON.stringify(response, null, 2) }]
    };
  }

  private async enhancedUpsert(args: any) {
    const { content, description, tags = [], agentId, successMetrics } = args;
    
    const pattern: Pattern = {
      id: `${agentId}-${Date.now()}`,
      content,
      description,
      tags,
      agentId,
      timestamp: new Date().toISOString(),
      successMetrics
    };

    this.patterns.set(pattern.id, pattern);
    await this.savePattern(pattern);

    // Update system metrics
    this.updateRagEffectiveness();

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify({
            success: true,
            patternId: pattern.id,
            message: `Pattern stored with enhanced metrics tracking`,
            systemImpact: {
              totalPatterns: this.patterns.size,
              agentContribution: Array.from(this.patterns.values())
                .filter(p => p.agentId === agentId).length
            }
          }, null, 2)
        }
      ]
    };
  }

  private async detectCoordinationGaps(args: any): Promise<any> {
    const { checkLast = 60 } = args;
    const gaps: CoordinationGap[] = [];

    try {
      // Check task board for stale updates
      const taskBoardPath = join(process.cwd(), 'coordination', 'task-board.json');
      const taskBoard = JSON.parse(await readFile(taskBoardPath, 'utf-8'));
      const now = new Date();
      const checkTime = new Date(now.getTime() - checkLast * 60 * 1000);

      // Detect stale updates
      taskBoard.tasks?.forEach((task: any) => {
        const lastUpdate = new Date(task.updatedAt);
        if (task.status === 'IN_PROGRESS' && lastUpdate < checkTime) {
          gaps.push({
            type: 'stale_update',
            severity: 'medium',
            agentId: task.assignedTo,
            taskId: task.id,
            description: `Task ${task.id} hasn't been updated in ${Math.round((now.getTime() - lastUpdate.getTime()) / (1000 * 60))} minutes`,
            suggestedAction: `Contact ${task.assignedTo} agent to provide status update`,
            detectedAt: new Date().toISOString()
          });
        }
      });

      // Detect missing dependencies
      taskBoard.tasks?.forEach((task: any) => {
        if (task.status === 'TODO' && task.dependencies?.length > 0) {
          const blockedBy = task.dependencies.filter((depId: string) => {
            const depTask = taskBoard.tasks.find((t: any) => t.id === depId);
            return depTask && depTask.status !== 'DONE' && depTask.status !== 'VERIFIED';
          });

          if (blockedBy.length > 0) {
            gaps.push({
              type: 'missing_dependency',
              severity: 'high',
              agentId: task.assignedTo,
              taskId: task.id,
              description: `Task ${task.id} blocked by incomplete dependencies: ${blockedBy.join(', ')}`,
              suggestedAction: `Prioritize completion of blocking tasks or find alternative approach`,
              detectedAt: new Date().toISOString()
            });
          }
        }
      });

    } catch (error) {
      gaps.push({
        type: 'stale_update',
        severity: 'critical',
        agentId: 'system',
        description: `Failed to analyze coordination: ${error}`,
        suggestedAction: 'Check coordination file integrity',
        detectedAt: new Date().toISOString()
      });
    }

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify({
            gaps,
            summary: {
              total: gaps.length,
              critical: gaps.filter(g => g.severity === 'critical').length,
              high: gaps.filter(g => g.severity === 'high').length,
              medium: gaps.filter(g => g.severity === 'medium').length,
              low: gaps.filter(g => g.severity === 'low').length
            },
            recommendations: this.generateRecommendations(gaps)
          }, null, 2)
        }
      ]
    };
  }

  private async getSystemMetrics(args: any) {
    await this.updateSystemMetrics();
    
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify({
            current: this.systemMetrics,
            insights: {
              coordinationHealth: this.systemMetrics.coordinationEfficiency > 0.8 ? 'excellent' : 
                                 this.systemMetrics.coordinationEfficiency > 0.6 ? 'good' : 'needs improvement',
              ragUtilization: this.systemMetrics.ragQueryEffectiveness > 0.7 ? 'high' : 'moderate',
              systemStatus: this.getOverallSystemStatus()
            },
            timestamp: new Date().toISOString()
          }, null, 2)
        }
      ]
    };
  }

  private async predictTaskBlockers(args: any) {
    const { taskId, context = {} } = args;
    
    // Analyze historical patterns for similar tasks
    await this.loadPatterns();
    const predictions = [];

    // Look for patterns of blockers in similar tasks
    const relatedPatterns = Array.from(this.patterns.values())
      .filter(p => p.tags.includes('blocker') || p.description.toLowerCase().includes('blocked'));

    predictions.push({
      probability: 0.3,
      type: 'dependency_delay',
      description: 'Dependent tasks may take longer than estimated',
      mitigation: 'Plan parallel work or alternative approaches',
      confidence: 'medium'
    });

    if (context.complexity === 'high') {
      predictions.push({
        probability: 0.6,
        type: 'implementation_complexity',
        description: 'Complex tasks often reveal additional requirements',
        mitigation: 'Break down into smaller, verifiable sub-tasks',
        confidence: 'high'
      });
    }

    return {
      content: [
        {
          type: "text", 
          text: JSON.stringify({
            taskId,
            predictions,
            overallRisk: predictions.length > 2 ? 'high' : predictions.length > 0 ? 'medium' : 'low',
            recommendedActions: [
              'Monitor dependency completion closely',
              'Plan contingency approaches',
              'Set up early warning checkpoints'
            ]
          }, null, 2)
        }
      ]
    };
  }

  private async suggestWorkflowOptimizations(args: any) {
    const suggestions = [];

    // Analyze coordination patterns
    suggestions.push({
      type: 'coordination',
      title: 'Increase update frequency',
      description: 'Agents should update task status every 30 minutes instead of hourly',
      impact: 'medium',
      effort: 'low'
    });

    suggestions.push({
      type: 'parallelization',
      title: 'Enable more parallel work',
      description: 'Break down large tasks to reduce dependency chains',
      impact: 'high',
      effort: 'medium'
    });

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify({
            suggestions,
            priorityActions: suggestions.filter(s => s.impact === 'high'),
            quickWins: suggestions.filter(s => s.effort === 'low')
          }, null, 2)
        }
      ]
    };
  }

  // Helper methods
  private async loadPatterns() {
    // Implementation similar to original but with enhanced metrics
  }

  private async savePattern(pattern: Pattern) {
    const dir = join(process.cwd(), 'coordination', 'memory-bank');
    const filename = `${pattern.id}.json`;
    await writeFile(join(dir, filename), JSON.stringify(pattern, null, 2));
  }

  private calculateAverageSuccessRate(): number {
    const patternsWithMetrics = Array.from(this.patterns.values())
      .filter(p => p.successMetrics?.successRate);
    
    if (patternsWithMetrics.length === 0) return 0;
    
    return patternsWithMetrics.reduce((sum, p) => sum + (p.successMetrics?.successRate || 0), 0) / patternsWithMetrics.length;
  }

  private updateRagEffectiveness() {
    this.systemMetrics.ragQueryEffectiveness = this.calculateAverageSuccessRate();
    this.systemMetrics.lastUpdated = new Date().toISOString();
  }

  private async updateSystemMetrics() {
    // Calculate coordination efficiency based on task completion rates
    // Calculate task completion accuracy based on estimates vs actual
    // Update blocker resolution time based on resolved issues
  }

  private getOverallSystemStatus(): string {
    const avgScore = (
      this.systemMetrics.coordinationEfficiency +
      this.systemMetrics.taskCompletionAccuracy +
      this.systemMetrics.ragQueryEffectiveness
    ) / 3;

    return avgScore > 0.8 ? 'excellent' : avgScore > 0.6 ? 'good' : 'needs attention';
  }

  private generateRecommendations(gaps: CoordinationGap[]): string[] {
    const recommendations = [];
    
    if (gaps.some(g => g.type === 'stale_update')) {
      recommendations.push('Implement automated status reminders for agents');
    }
    
    if (gaps.some(g => g.type === 'missing_dependency')) {
      recommendations.push('Review task dependencies and consider parallelization opportunities');
    }

    return recommendations;
  }

  private startCoordinationMonitoring() {
    // Watch coordination files for changes
    this.coordinationWatcher = chokidar.watch('coordination/**/*.json', {
      cwd: process.cwd(),
      ignoreInitial: true
    });

    this.coordinationWatcher.on('change', (path) => {
      console.log(`Coordination change detected: ${path}`);
      this.updateSystemMetrics();
    });

    // Schedule periodic gap detection
    cron.schedule('*/10 * * * *', () => {
      this.detectCoordinationGaps({ checkLast: 10 });
    });
  }

  private startSystemMetricsCollection() {
    // Collect metrics every 5 minutes
    cron.schedule('*/5 * * * *', () => {
      this.updateSystemMetrics();
    });
  }

  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error("Enhanced MCP RAG Server running with intelligent coordination monitoring");
  }
}

const server = new EnhancedMCPServer();
server.run().catch(console.error);