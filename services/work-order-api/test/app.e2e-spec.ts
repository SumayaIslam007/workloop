/**
 * Boots the real AppModule (guards, validation, error filter, logging, Swagger) with the
 * database replaced by a stub, so the HTTP contract can be tested without MySQL.
 * Database-backed e2e tests are added alongside the work-order lifecycle.
 */
import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import type { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/bootstrap';
import { PrismaService } from '../src/prisma/prisma.service';

describe('Work-order API (HTTP contract)', () => {
  let app: INestApplication<App>;
  const prisma = { $queryRaw: jest.fn(), $disconnect: jest.fn() };

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(PrismaService)
      .useValue(prisma)
      .compile();

    app = moduleRef.createNestApplication();
    configureApp(app);
    await app.init();
  }, 180_000); // booting the full app can take minutes on a low-memory machine under load

  afterAll(async () => {
    await app.close();
  });

  it('GET /health/live is public and echoes a request id', async () => {
    const res = await request(app.getHttpServer())
      .get('/health/live')
      .set('x-request-id', 'req-123');

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: 'ok' });
    expect(res.headers['x-request-id']).toBe('req-123');
  });

  it('GET /health/ready returns 503 in the standard error shape when the database is down', async () => {
    prisma.$queryRaw.mockRejectedValueOnce(new Error('ECONNREFUSED'));

    const res = await request(app.getHttpServer()).get('/health/ready');

    expect(res.status).toBe(503);
    expect(res.body).toMatchObject({
      statusCode: 503,
      error: 'Service Unavailable',
      message: 'Database is not reachable',
      path: '/health/ready',
      requestId: expect.any(String),
      timestamp: expect.any(String),
    });
  });

  it('rejects protected routes without an access token', async () => {
    const res = await request(app.getHttpServer()).get('/work-orders');

    expect(res.status).toBe(401);
    expect(res.body).toMatchObject({ statusCode: 401, message: 'Missing access token' });
  });

  it('rejects a forged access token', async () => {
    const res = await request(app.getHttpServer())
      .get('/users/me')
      .set('Authorization', 'Bearer not.a.real.token');

    expect(res.status).toBe(401);
    expect(res.body.message).toBe('Invalid or expired access token');
  });

  it('validates the registration body and lists every problem', async () => {
    const res = await request(app.getHttpServer())
      .post('/auth/register')
      .send({ email: 'not-an-email', password: 'short', role: 'buyer', isAdmin: true });

    expect(res.status).toBe(400);
    expect(res.body.message).toBe('Validation failed');
    expect(res.body.details).toEqual(
      expect.arrayContaining([
        'email must be an email',
        'password must be longer than or equal to 8 characters',
        'name should not be empty',
        'companyName is required for buyers',
        'property isAdmin should not exist',
      ]),
    );
  });

  it('does not allow registering as an admin', async () => {
    const res = await request(app.getHttpServer()).post('/auth/register').send({
      email: 'sneaky@example.com',
      password: 'Password123!',
      name: 'Sneaky',
      role: 'admin',
    });

    expect(res.status).toBe(400);
    expect(res.body.details).toEqual(
      expect.arrayContaining([expect.stringContaining('role must be one of the following values')]),
    );
  });

  it('serves the OpenAPI document', async () => {
    const res = await request(app.getHttpServer()).get('/docs/json');

    expect(res.status).toBe(200);
    expect(Object.keys(res.body.paths)).toEqual(
      expect.arrayContaining([
        '/auth/register',
        '/auth/login',
        '/auth/refresh',
        '/auth/logout',
        '/users/me',
        '/work-orders',
        '/work-orders/{id}',
        '/health/live',
        '/health/ready',
      ]),
    );
  });
});
