// Mock service implementations for testing

import { EventEmitter } from 'events';

export class MockFileMonitor extends EventEmitter {
  private files: Map<string, any> = new Map();
  
  constructor() {
    super();
  }

  start() {
    return Promise.resolve();
  }

  stop() {
    return Promise.resolve();
  }

  addFile(path: string, content: any) {
    this.files.set(path, content);
    this.emit('change', { path, type: 'added' });
  }

  updateFile(path: string, content: any) {
    this.files.set(path, content);
    this.emit('change', { path, type: 'modified' });
  }

  deleteFile(path: string) {
    this.files.delete(path);
    this.emit('change', { path, type: 'deleted' });
  }

  getFile(path: string) {
    return this.files.get(path);
  }
}

export class MockGitService {
  private commits: any[] = [];
  
  async getCommits(branch: string, limit: number) {
    return this.commits.slice(0, limit);
  }

  async getDiff(fromRef: string, toRef: string) {
    return {
      files: [],
      additions: 0,
      deletions: 0
    };
  }

  addCommit(commit: any) {
    this.commits.unshift(commit);
  }

  reset() {
    this.commits = [];
  }
}

export class MockMetricsCollector {
  private metrics: Map<string, any> = new Map();

  record(metric: string, value: any) {
    this.metrics.set(metric, value);
  }

  get(metric: string) {
    return this.metrics.get(metric);
  }

  getAll() {
    return Object.fromEntries(this.metrics);
  }

  reset() {
    this.metrics.clear();
  }
}

export function createMockRepository<T>(methods: string[]) {
  const mock: any = {};
  
  methods.forEach(method => {
    mock[method] = jest.fn();
  });
  
  return mock as T;
}