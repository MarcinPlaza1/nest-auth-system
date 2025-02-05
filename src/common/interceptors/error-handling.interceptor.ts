import { Injectable, NestInterceptor, ExecutionContext, CallHandler, Logger } from '@nestjs/common';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { ErrorMessages } from '../../config/error-messages.config';

@Injectable()
export class ErrorHandlingInterceptor implements NestInterceptor {
  private readonly logger = new Logger(ErrorHandlingInterceptor.name);

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    return next.handle().pipe(
      catchError(error => {
        this.logger.error({
          message: 'Błąd asynchroniczny',
          error: error.message,
          stack: error.stack,
          context: context.getClass().name,
          handler: context.getHandler().name,
          timestamp: new Date().toISOString(),
        });

        // Jeśli błąd jest już instancją HttpException, przekazujemy go dalej
        if (error.getStatus) {
          return throwError(() => error);
        }

        // Dla nieobsłużonych błędów Promise
        return throwError(() => new Error(ErrorMessages.INTERNAL_SERVER_ERROR));
      }),
    );
  }
} 