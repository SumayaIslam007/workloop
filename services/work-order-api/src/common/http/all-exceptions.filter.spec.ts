import { BadRequestException, NotFoundException } from '@nestjs/common';
import { InvalidTransitionError, WorkOrderAction, WorkOrderStatus } from '@workloop/shared-types';
import { Prisma } from '../../generated/prisma/client';
import { mapException } from './all-exceptions.filter';

const prismaError = (code: string) =>
  new Prisma.PrismaClientKnownRequestError('db error', { code, clientVersion: 'test' });

describe('mapException', () => {
  it('keeps the status and message of HTTP exceptions', () => {
    expect(mapException(new NotFoundException('Work order not found'))).toEqual({
      status: 404,
      message: 'Work order not found',
    });
  });

  it('returns validation messages as details', () => {
    const error = new BadRequestException({
      message: ['email must be an email'],
      error: 'Bad Request',
    });
    expect(mapException(error)).toEqual({
      status: 400,
      message: 'Validation failed',
      details: ['email must be an email'],
    });
  });

  it('maps invalid state transitions to 409 Conflict', () => {
    const error = new InvalidTransitionError(WorkOrderStatus.APPROVED, WorkOrderAction.CANCEL);
    expect(mapException(error)).toEqual({
      status: 409,
      message: 'Cannot cancel a work order that is APPROVED',
    });
  });

  it('maps Prisma unique-constraint and not-found errors', () => {
    expect(mapException(prismaError('P2002')).status).toBe(409);
    expect(mapException(prismaError('P2025')).status).toBe(404);
  });

  it('hides the details of unexpected errors', () => {
    expect(mapException(new Error('connection string leaked here'))).toEqual({
      status: 500,
      message: 'Internal server error',
    });
    expect(mapException(prismaError('P1001')).status).toBe(500);
  });
});
