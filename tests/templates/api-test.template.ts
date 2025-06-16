// API Integration Test Template
import request from 'supertest';
import { Application } from 'express';
import { TestDatabase } from '../helpers/test-database';

describe('API: [ENDPOINT_NAME]', () => {
  let app: Application;
  let db: TestDatabase;
  let authToken: string;

  beforeAll(async () => {
    // Initialize test database
    db = await TestDatabase.create();
    
    // Create application with test database
    app = createApp({ database: db });
    
    // Create test user and get auth token
    const user = await db.users.create({
      email: 'test@example.com',
      password: 'TestPass123!'
    });
    
    const loginResponse = await request(app)
      .post('/api/auth/login')
      .send({ email: 'test@example.com', password: 'TestPass123!' });
    
    authToken = loginResponse.body.token;
  });

  afterAll(async () => {
    await db.cleanup();
  });

  beforeEach(async () => {
    // Clear specific tables before each test
    await db.clearTables(['table1', 'table2']);
  });

  describe('GET /api/[endpoint]', () => {
    it('should return 200 with valid data', async () => {
      const response = await request(app)
        .get('/api/[endpoint]')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        data: expect.any(Array)
      });
    });

    it('should return 401 without authentication', async () => {
      await request(app)
        .get('/api/[endpoint]')
        .expect(401);
    });

    it('should handle query parameters correctly', async () => {
      const response = await request(app)
        .get('/api/[endpoint]?limit=10&offset=0')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.data).toHaveLength(10);
    });
  });

  describe('POST /api/[endpoint]', () => {
    it('should create resource with valid data', async () => {
      const validData = {
        // Add valid request body
      };

      const response = await request(app)
        .post('/api/[endpoint]')
        .set('Authorization', `Bearer ${authToken}`)
        .send(validData)
        .expect(201);

      expect(response.body).toMatchObject({
        success: true,
        data: expect.objectContaining({
          id: expect.any(String),
          ...validData
        })
      });

      // Verify in database
      const created = await db.query('SELECT * FROM table WHERE id = ?', [response.body.data.id]);
      expect(created).toBeDefined();
    });

    it('should return 400 with invalid data', async () => {
      const invalidData = {
        // Add invalid request body
      };

      const response = await request(app)
        .post('/api/[endpoint]')
        .set('Authorization', `Bearer ${authToken}`)
        .send(invalidData)
        .expect(400);

      expect(response.body).toMatchObject({
        success: false,
        error: expect.any(String)
      });
    });
  });

  describe('PUT /api/[endpoint]/:id', () => {
    let resourceId: string;

    beforeEach(async () => {
      // Create a resource to update
      const resource = await db.resources.create({ /* data */ });
      resourceId = resource.id;
    });

    it('should update resource with valid data', async () => {
      const updateData = {
        // Add update data
      };

      const response = await request(app)
        .put(`/api/[endpoint]/${resourceId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body.data).toMatchObject(updateData);
    });

    it('should return 404 for non-existent resource', async () => {
      await request(app)
        .put('/api/[endpoint]/non-existent-id')
        .set('Authorization', `Bearer ${authToken}`)
        .send({})
        .expect(404);
    });
  });

  describe('DELETE /api/[endpoint]/:id', () => {
    it('should delete existing resource', async () => {
      const resource = await db.resources.create({ /* data */ });

      await request(app)
        .delete(`/api/[endpoint]/${resource.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(204);

      // Verify deletion
      const deleted = await db.resources.findById(resource.id);
      expect(deleted).toBeNull();
    });
  });
});