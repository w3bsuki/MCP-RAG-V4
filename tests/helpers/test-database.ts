// Test Database Helper
export class TestDatabase {
  private connection: any;
  private tables: Set<string> = new Set();

  static async create() {
    const db = new TestDatabase();
    await db.initialize();
    return db;
  }

  private async initialize() {
    // Initialize test database connection
    // This would connect to a test database or in-memory database
    this.connection = {
      // Mock connection for now
      query: jest.fn(),
      close: jest.fn()
    };
  }

  async clearTables(tables: string[]) {
    for (const table of tables) {
      await this.connection.query(`DELETE FROM ${table}`);
      this.tables.add(table);
    }
  }

  async cleanup() {
    // Clean up all touched tables
    for (const table of this.tables) {
      await this.connection.query(`DELETE FROM ${table}`);
    }
    
    // Close connection
    await this.connection.close();
  }

  async seed(table: string, data: any[]) {
    for (const item of data) {
      await this.connection.query(
        `INSERT INTO ${table} SET ?`,
        [item]
      );
    }
    this.tables.add(table);
  }

  async query(sql: string, params?: any[]) {
    return this.connection.query(sql, params);
  }

  // Mock repositories
  get users() {
    return {
      create: async (data: any) => ({ id: 'test-id', ...data }),
      findById: async (id: string) => null,
      findByEmail: async (email: string) => null,
      update: async (id: string, data: any) => ({ id, ...data }),
      delete: async (id: string) => true
    };
  }

  get resources() {
    return {
      create: async (data: any) => ({ id: 'test-id', ...data }),
      findById: async (id: string) => null,
      find: async (query: any) => [],
      update: async (id: string, data: any) => ({ id, ...data }),
      delete: async (id: string) => true
    };
  }
}