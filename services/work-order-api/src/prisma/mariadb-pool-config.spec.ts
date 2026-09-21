import { mariaDbPoolConfig } from './mariadb-pool-config';

describe('mariaDbPoolConfig', () => {
  it('converts a mysql:// URL into driver pool options', () => {
    expect(
      mariaDbPoolConfig('mysql://app:s%40cret@db.example.com:4000/workloop_orders', { ssl: false }),
    ).toEqual({
      host: 'db.example.com',
      port: 4000,
      user: 'app',
      password: 's@cret',
      database: 'workloop_orders',
      connectionLimit: 5,
    });
  });

  it('defaults the port to 3306', () => {
    expect(mariaDbPoolConfig('mysql://u:p@localhost/db', { ssl: false }).port).toBe(3306);
  });

  it('enables verified TLS when ssl is on', () => {
    expect(mariaDbPoolConfig('mysql://u:p@host/db', { ssl: true }).ssl).toEqual({
      rejectUnauthorized: true,
    });
  });

  it('rejects URLs without a database name or with the wrong scheme', () => {
    expect(() => mariaDbPoolConfig('mysql://u:p@host', { ssl: false })).toThrow(/database name/);
    expect(() => mariaDbPoolConfig('postgres://u:p@host/db', { ssl: false })).toThrow(/scheme/);
  });
});
