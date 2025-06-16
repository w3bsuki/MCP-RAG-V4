// Test data factories for consistent test data generation

export function createMockUser(overrides = {}) {
  return {
    id: 'test-user-123',
    email: 'test@example.com',
    name: 'Test User',
    createdAt: new Date('2025-01-01'),
    updatedAt: new Date('2025-01-01'),
    ...overrides
  };
}

export function createMockAgent(overrides = {}) {
  return {
    id: 'test-agent-123',
    name: 'Test Agent',
    type: 'builder',
    status: 'active',
    lastActivity: new Date(),
    metrics: {
      tasksCompleted: 0,
      averageTime: 0,
      successRate: 100
    },
    ...overrides
  };
}

export function createMockTask(overrides = {}) {
  return {
    id: 'TASK-TEST-001',
    title: 'Test Task',
    description: 'Test task description',
    status: 'TODO',
    priority: 'MEDIUM',
    assignedTo: null,
    createdBy: 'test-user',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    dependencies: [],
    tags: ['test'],
    estimatedHours: 1,
    actualHours: 0,
    completionCriteria: ['Test criteria'],
    blockers: [],
    comments: [],
    ...overrides
  };
}

export function createMockGitCommit(overrides = {}) {
  return {
    hash: 'abc123def',
    author: 'Test Author',
    email: 'test@example.com',
    date: new Date(),
    message: 'Test commit message',
    files: ['src/test.ts'],
    ...overrides
  };
}

export function createMockFileChange(overrides = {}) {
  return {
    path: 'src/test.ts',
    type: 'modified',
    additions: 10,
    deletions: 5,
    content: '// Test file content',
    ...overrides
  };
}