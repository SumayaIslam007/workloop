import { validateEnv } from './env';

const valid = {
  DATABASE_URL: 'mysql://user:pass@db.example.com:3306/orders',
  JWT_ACCESS_SECRET: 'x'.repeat(32),
};

describe('validateEnv', () => {
  it('applies defaults for optional values', () => {
    expect(validateEnv(valid)).toMatchObject({
      NODE_ENV: 'development',
      PORT: 3000,
      LOG_LEVEL: 'debug',
      DATABASE_SSL: false,
      JWT_ACCESS_TTL_SECONDS: 900,
      REFRESH_TOKEN_TTL_DAYS: 7,
    });
  });

  it('parses numbers and booleans from strings', () => {
    const env = validateEnv({
      ...valid,
      PORT: '8080',
      DATABASE_SSL: 'true',
      NODE_ENV: 'production',
    });
    expect(env).toMatchObject({ PORT: 8080, DATABASE_SSL: true, LOG_LEVEL: 'info' });
  });

  it('reports every problem at once', () => {
    expect(() =>
      validateEnv({
        DATABASE_URL: 'postgres://nope',
        JWT_ACCESS_SECRET: 'short',
        PORT: 'abc',
        DATABASE_SSL: 'yes',
      }),
    ).toThrow(
      expect.objectContaining({
        message: expect.stringMatching(
          /DATABASE_URL must start[\s\S]*JWT_ACCESS_SECRET must be at least 32[\s\S]*PORT must be an integer[\s\S]*DATABASE_SSL must be true or false/,
        ),
      }),
    );
  });

  it('requires DATABASE_URL and JWT_ACCESS_SECRET', () => {
    expect(() => validateEnv({})).toThrow(
      /DATABASE_URL is required[\s\S]*JWT_ACCESS_SECRET is required/,
    );
  });
});
