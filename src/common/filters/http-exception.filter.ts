import { ExceptionFilter, Catch, ArgumentsHost, HttpException, HttpStatus } from '@nestjs/common';
import { Response } from 'express';
import { DatabaseErrorService } from '../services/database-error.service';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  constructor(private readonly databaseErrorService: DatabaseErrorService) {}

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Internal server error';
    let error = null;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();
      message = typeof exceptionResponse === 'string' 
        ? exceptionResponse 
        : (exceptionResponse as any).message || exception.message;
      error = (exceptionResponse as any).error;
    } else if (exception instanceof Error) {
      message = exception.message;
    }

    response
      .status(status)
      .json({
        statusCode: status,
        message,
        error,
        timestamp: new Date().toISOString(),
      });
  }
}
