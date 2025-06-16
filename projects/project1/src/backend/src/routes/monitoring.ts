import { Router, Request, Response, NextFunction } from 'express';
import { MonitoringService } from '../services/MonitoringService';

export function createMonitoringRouter(monitoringService: MonitoringService): Router {
  const router = Router();

  /**
   * Get system-wide metrics
   */
  router.get('/metrics', async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const metrics = await monitoringService.getSystemMetrics();
      res.json(metrics);
    } catch (error) {
      next(error);
    }
  });

  /**
   * Get metrics for all agents
   */
  router.get('/agents', async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const metrics = await monitoringService.getAllAgentMetrics();
      res.json(metrics);
    } catch (error) {
      next(error);
    }
  });

  /**
   * Get metrics for a specific agent
   */
  router.get('/agents/:agentId', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { agentId } = req.params;
      const metrics = await monitoringService.getAgentMetrics(agentId);
      res.json(metrics);
    } catch (error) {
      next(error);
    }
  });

  /**
   * Get recent activity
   */
  router.get('/activity', (req: Request, res: Response) => {
    const limit = parseInt(req.query.limit as string) || 50;
    const activity = monitoringService.getRecentActivity(limit);
    res.json(activity);
  });

  /**
   * Add a new agent to monitor
   */
  router.post('/agents', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { agentId, name, worktreePath } = req.body;

      if (!agentId || !name || !worktreePath) {
        res.status(400).json({
          error: 'Missing required fields: agentId, name, worktreePath'
        });
        return;
      }

      await monitoringService.addAgent(agentId, name, worktreePath);
      res.status(201).json({ success: true, agentId });
    } catch (error) {
      next(error);
    }
  });

  /**
   * Remove an agent from monitoring
   */
  router.delete('/agents/:agentId', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { agentId } = req.params;
      await monitoringService.removeAgent(agentId);
      res.json({ success: true, agentId });
    } catch (error) {
      next(error);
    }
  });

  return router;
}