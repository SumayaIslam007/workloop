// Test defaults. Real values in the environment take precedence.
process.env['NODE_ENV'] ??= 'test';
process.env['LOG_LEVEL'] ??= 'silent';
process.env['DATABASE_URL'] ??= 'mysql://test:test@127.0.0.1:3306/workloop_test';
process.env['JWT_ACCESS_SECRET'] ??= 'test-secret-that-is-at-least-32-characters-long';
