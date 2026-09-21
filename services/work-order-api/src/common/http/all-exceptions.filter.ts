import {
  type ArgumentsHost,
  Catch,
  type ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { InvalidTransitionError } from '@workloop/shared-types';
import type { Request, Response } from 'express';
import { Prisma } from '../../generated/prisma/client';
import type { ErrorResponseDto } from './error-response.dto';

interface MappedError {
  status: number;
  message: string;
  details?: string[];
}

/**
 * Turns every thrown error into the same JSON shape (ErrorResponseDto), maps domain
 * and database errors to meaningful status codes, and never leaks internal details.
 */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const http = host.switchToHttp();
    const request = http.getRequest<Request & { id?: unknown }>();
    const response = http.getResponse<Response>();

    const mapped = mapException(exception);
    if (mapped.status >= 500) {
      // Deliberate 5xx responses (e.g. a failed readiness check) are expected; only
      // unhandled errors get a stack trace, because those need investigating.
      if (exception instanceof HttpException) {
        this.logger.warn(`${mapped.status} ${mapped.message}`);
      } else {
        this.logger.error(exception instanceof Error ? exception : String(exception));
      }
    }

    const body: ErrorResponseDto = {
      statusCode: mapped.status,
      error: reasonPhrase(mapped.status),
      message: mapped.message,
      ...(mapped.details ? { details: mapped.details } : {}),
      path: request.originalUrl ?? request.url,
      requestId: typeof request.id === 'string' ? request.id : String(request.id ?? ''),
      timestamp: new Date().toISOString(),
    };

    response.status(mapped.status).json(body);
  }
}

export function mapException(exception: unknown): MappedError {
  if (exception instanceof HttpException) {
    const status = exception.getStatus();
    const res = exception.getResponse();
    if (typeof res === 'object' && res !== null && 'message' in res) {
      const message = (res as { message: unknown }).message;
      if (Array.isArray(message)) {
        // class-validator failures from ValidationPipe
        return { status, message: 'Validation failed', details: message.map(String) };
      }
      return { status, message: String(message) };
    }
    return { status, message: typeof res === 'string' ? res : exception.message };
  }

  if (exception instanceof InvalidTransitionError) {
    return { status: HttpStatus.CONFLICT, message: exception.message };
  }

  if (exception instanceof Prisma.PrismaClientKnownRequestError) {
    switch (exception.code) {
      case 'P2002': // unique constraint
        return {
          status: HttpStatus.CONFLICT,
          message: 'A record with these details already exists',
        };
      case 'P2025': // record not found
        return { status: HttpStatus.NOT_FOUND, message: 'Record not found' };
    }
  }

  return { status: HttpStatus.INTERNAL_SERVER_ERROR, message: 'Internal server error' };
}

function reasonPhrase(status: number): string {
  const name = HttpStatus[status];
  if (!name) return 'Error';
  return name
    .toLowerCase()
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}
