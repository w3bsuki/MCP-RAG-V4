// Quick verification test for FileMonitor implementation
import { FileMonitor } from '../src/backend/src/services/FileMonitor';

describe('TASK-202 Verification: FileMonitor Implementation', () => {
  let fileMonitor: FileMonitor;

  beforeEach(() => {
    fileMonitor = new FileMonitor(1000);
  });

  afterEach(async () => {
    await fileMonitor.stopAll();
  });

  it('✓ FileMonitor class should be importable and instantiable', () => {
    expect(fileMonitor).toBeInstanceOf(FileMonitor);
    expect(typeof fileMonitor.addAgent).toBe('function');
    expect(typeof fileMonitor.removeAgent).toBe('function');
    expect(typeof fileMonitor.getAgentMetrics).toBe('function');
    expect(typeof fileMonitor.stopAll).toBe('function');
  });

  it('✓ Should have proper event emitter functionality', () => {
    expect(typeof fileMonitor.on).toBe('function');
    expect(typeof fileMonitor.emit).toBe('function');
    expect(typeof fileMonitor.removeListener).toBe('function');
  });

  it('✓ Should handle invalid agent addition gracefully', async () => {
    await expect(fileMonitor.addAgent('test', '/nonexistent/path'))
      .rejects.toThrow('Worktree path does not exist');
  });

  it('✓ Should handle removal of non-existent agent gracefully', async () => {
    await expect(fileMonitor.removeAgent('nonexistent'))
      .rejects.toThrow('Agent nonexistent is not being monitored');
  });

  it('✓ Should provide agent management functionality', () => {
    const agents = fileMonitor.getAgents();
    expect(Array.isArray(agents)).toBe(true);
    expect(agents.length).toBe(0); // No agents added yet
  });
});