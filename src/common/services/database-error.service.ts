import { Injectable } from '@nestjs/common';
import { MongoError } from 'mongodb';
import { ErrorMessages } from '../../config/error-messages.config';

export interface DatabaseError {
  type: string;
  message: string;
  code?: number;
  details?: any;
}

@Injectable()
export class DatabaseErrorService {
  handleError(error: MongoError): DatabaseError {
    if (error.code === 11000) {
      return {
        type: 'DuplicateKey',
        message: 'Podana wartość już istnieje w bazie danych',
        code: error.code,
        details: error.message
      };
    }

    return {
      type: 'DatabaseError',
      message: error.message,
      code: typeof error.code === 'number' ? error.code : undefined,
      details: error.errmsg
    };
  }
} 