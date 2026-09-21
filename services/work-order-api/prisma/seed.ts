/**
 * Development seed: 2 companies, 5 technicians and 12 work orders across every status,
 * so the app has realistic data to look at immediately.
 *
 * Run with `pnpm db:seed`. It deletes existing data first. Never run it against production.
 */
import 'dotenv/config';
import { PrismaMariaDb } from '@prisma/adapter-mariadb';
import { transition, WorkOrderAction, WorkOrderStatus } from '@workloop/shared-types';
import * as argon2 from 'argon2';
import { validateEnv } from '../src/config/env';
import { PrismaClient } from '../src/generated/prisma/client';
import { mariaDbPoolConfig } from '../src/prisma/mariadb-pool-config';

const DEMO_PASSWORD = 'Password123!';
const DAY_MS = 24 * 60 * 60 * 1000;

const env = validateEnv(process.env);
if (env.NODE_ENV === 'production') {
  throw new Error('Refusing to seed a production database');
}

const prisma = new PrismaClient({
  adapter: new PrismaMariaDb(
    mariaDbPoolConfig(env.DATABASE_URL, {
      ssl: env.DATABASE_SSL,
      ...(env.DATABASE_SSL_CA ? { sslCa: env.DATABASE_SSL_CA } : {}),
    }),
  ),
});

/** The actions that take a new DRAFT order to each status, replayed through the real state machine. */
const PATH_TO: Record<WorkOrderStatus, WorkOrderAction[]> = {
  DRAFT: [],
  PUBLISHED: [WorkOrderAction.PUBLISH],
  ASSIGNED: [WorkOrderAction.PUBLISH, WorkOrderAction.ASSIGN],
  IN_PROGRESS: [WorkOrderAction.PUBLISH, WorkOrderAction.ASSIGN, WorkOrderAction.START],
  COMPLETED: [
    WorkOrderAction.PUBLISH,
    WorkOrderAction.ASSIGN,
    WorkOrderAction.START,
    WorkOrderAction.COMPLETE,
  ],
  APPROVED: [
    WorkOrderAction.PUBLISH,
    WorkOrderAction.ASSIGN,
    WorkOrderAction.START,
    WorkOrderAction.COMPLETE,
    WorkOrderAction.APPROVE,
  ],
  CANCELLED: [WorkOrderAction.PUBLISH, WorkOrderAction.CANCEL],
};

function reach(status: WorkOrderStatus): WorkOrderStatus {
  // Throws if the seed ever describes a status the state machine can't reach.
  return PATH_TO[status].reduce<WorkOrderStatus>(transition, WorkOrderStatus.DRAFT);
}

/** Picks an item, wrapping around, so work orders are spread over the seeded companies and technicians. */
function cycle<T>(items: readonly T[], index: number): T {
  const item = items[index % items.length];
  if (!item) throw new Error('Cannot cycle over an empty list');
  return item;
}

const hasTechnician = (status: WorkOrderStatus) =>
  status === 'ASSIGNED' ||
  status === 'IN_PROGRESS' ||
  status === 'COMPLETED' ||
  status === 'APPROVED';

async function main(): Promise<void> {
  const passwordHash = await argon2.hash(DEMO_PASSWORD);

  // Delete children before parents.
  await prisma.refreshToken.deleteMany();
  await prisma.application.deleteMany();
  await prisma.outboxEvent.deleteMany();
  await prisma.workOrder.deleteMany();
  await prisma.user.updateMany({ data: { companyId: null } });
  await prisma.company.deleteMany();
  await prisma.user.deleteMany();

  const companies = await Promise.all(
    [
      { name: 'Acme Facilities', buyerName: 'Maria Lopez', email: 'buyer@acme.test' },
      { name: 'Northwind Retail', buyerName: 'James Chen', email: 'buyer@northwind.test' },
    ].map(async ({ name, buyerName, email }) => {
      const buyer = await prisma.user.create({
        data: { email, name: buyerName, passwordHash, role: 'buyer' },
      });
      const company = await prisma.company.create({ data: { name, ownerUserId: buyer.id } });
      await prisma.user.update({ where: { id: buyer.id }, data: { companyId: company.id } });
      return { company, buyer };
    }),
  );

  const technicians = await Promise.all(
    ['Aisha Rahman', 'Ben Okafor', 'Chloe Martin', 'Diego Alvarez', 'Emma Novak'].map((name, i) =>
      prisma.user.create({
        data: { email: `tech${i + 1}@workloop.test`, name, passwordHash, role: 'technician' },
      }),
    ),
  );

  const orders: Array<{
    title: string;
    location: string;
    payRate: string;
    status: WorkOrderStatus;
  }> = [
    {
      title: 'Replace office network switch',
      location: 'Austin, TX',
      payRate: '65.00',
      status: 'PUBLISHED',
    },
    {
      title: 'Install four ceiling Wi-Fi access points',
      location: 'Austin, TX',
      payRate: '55.00',
      status: 'PUBLISHED',
    },
    {
      title: 'POS terminal troubleshooting',
      location: 'Dallas, TX',
      payRate: '48.50',
      status: 'PUBLISHED',
    },
    {
      title: 'Mount and wire conference room display',
      location: 'Houston, TX',
      payRate: '50.00',
      status: 'DRAFT',
    },
    {
      title: 'Rack and label new server cabinet',
      location: 'San Antonio, TX',
      payRate: '70.00',
      status: 'ASSIGNED',
    },
    {
      title: 'Replace failed UPS batteries',
      location: 'Austin, TX',
      payRate: '60.00',
      status: 'ASSIGNED',
    },
    {
      title: 'Structured cabling for new office wing',
      location: 'Dallas, TX',
      payRate: '58.00',
      status: 'IN_PROGRESS',
    },
    {
      title: 'Security camera installation (8 units)',
      location: 'Houston, TX',
      payRate: '62.50',
      status: 'IN_PROGRESS',
    },
    {
      title: 'Printer fleet maintenance',
      location: 'Austin, TX',
      payRate: '45.00',
      status: 'COMPLETED',
    },
    {
      title: 'Retail kiosk hardware swap',
      location: 'Dallas, TX',
      payRate: '52.00',
      status: 'APPROVED',
    },
    {
      title: 'Badge reader replacement',
      location: 'San Antonio, TX',
      payRate: '57.00',
      status: 'APPROVED',
    },
    {
      title: 'Emergency router replacement',
      location: 'Houston, TX',
      payRate: '75.00',
      status: 'CANCELLED',
    },
  ];

  for (const [i, order] of orders.entries()) {
    const { company, buyer } = cycle(companies, i);
    const technician = cycle(technicians, i);
    const status = reach(order.status);

    const created = await prisma.workOrder.create({
      data: {
        companyId: company.id,
        createdById: buyer.id,
        title: order.title,
        description: `${order.title}. Bring standard tools; site contact will meet you at reception.`,
        location: order.location,
        payRate: order.payRate,
        status,
        technicianId: hasTechnician(status) ? technician.id : null,
        scheduledAt: new Date(Date.now() + (i - 4) * DAY_MS),
      },
    });

    if (status === 'PUBLISHED') {
      // Two technicians have applied to each open order.
      await prisma.application.createMany({
        data: [0, 1].map((offset) => ({
          workOrderId: created.id,
          technicianId: cycle(technicians, i + offset).id,
        })),
      });
    }
  }

  console.log('Seed complete.');
  console.log(`  Buyers:      buyer@acme.test, buyer@northwind.test`);
  console.log(`  Technicians: tech1@workloop.test ... tech5@workloop.test`);
  console.log(`  Password:    ${DEMO_PASSWORD}`);
}

main()
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
