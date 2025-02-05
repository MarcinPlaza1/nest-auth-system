import { registerDecorator, ValidationOptions, ValidationArguments } from 'class-validator';
import { ErrorMessages } from '../../config/error-messages.config';

export function IsStrongPassword(validationOptions?: ValidationOptions) {
  return function (object: Object, propertyName: string) {
    registerDecorator({
      name: 'isStrongPassword',
      target: object.constructor,
      propertyName: propertyName,
      options: {
        message: ErrorMessages.PASSWORD_TOO_WEAK,
        ...validationOptions,
      },
      validator: {
        validate(value: any, args: ValidationArguments) {
          if (typeof value !== 'string') return false;
          if (value.length < 8) return false;
          
          const hasUpperCase = /[A-Z]/.test(value);
          const hasLowerCase = /[a-z]/.test(value);
          const hasNumbers = /\d/.test(value);
          const hasSpecialChar = /[@$!%*?&]/.test(value);
          
          return hasUpperCase && hasLowerCase && hasNumbers && hasSpecialChar;
        },
      },
    });
  };
} 