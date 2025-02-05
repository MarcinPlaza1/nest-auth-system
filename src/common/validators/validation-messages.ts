import { ValidationError } from '@nestjs/common';
import { ErrorMessages } from '../../config/error-messages.config';

export const ValidationMessages = {
  // Walidacja pól użytkownika
  username: {
    isNotEmpty: 'Nazwa użytkownika jest wymagana',
    minLength: 'Nazwa użytkownika musi mieć minimum 3 znaki',
    maxLength: 'Nazwa użytkownika nie może przekraczać 50 znaków',
    pattern: 'Nazwa użytkownika może zawierać tylko litery, cyfry i podkreślenia',
  },
  email: {
    isNotEmpty: 'Adres email jest wymagany',
    isEmail: 'Podany adres email jest nieprawidłowy',
    maxLength: 'Adres email nie może przekraczać 255 znaków',
  },
  password: {
    isNotEmpty: 'Hasło jest wymagane',
    minLength: 'Hasło musi mieć minimum 8 znaków',
    maxLength: 'Hasło nie może przekraczać 50 znaków',
    pattern: 'Hasło musi zawierać wielką literę, małą literę, cyfrę i znak specjalny',
  },

  // Walidacja tokenów
  token: {
    isNotEmpty: 'Token jest wymagany',
    isString: 'Token musi być tekstem',
    isJWT: 'Nieprawidłowy format tokenu',
  },

  // Walidacja dat
  date: {
    isDate: 'Nieprawidłowy format daty',
    isNotEmpty: 'Data jest wymagana',
    isFuture: 'Data musi być w przyszłości',
    isPast: 'Data musi być w przeszłości',
  },
};

export function formatValidationError(error: ValidationError): string {
  const field = error.property;
  const constraints = error.constraints;
  
  if (!constraints) {
    return ErrorMessages.BAD_REQUEST;
  }

  // Pobierz pierwszy błąd walidacji dla pola
  const firstConstraint = Object.keys(constraints)[0];
  
  // Sprawdź czy istnieją predefiniowane komunikaty dla tego pola i typu błędu
  if (ValidationMessages[field]?.[firstConstraint]) {
    return ValidationMessages[field][firstConstraint];
  }

  // Jeśli nie ma predefiniowanego komunikatu, zwróć ogólny komunikat błędu
  return constraints[firstConstraint] || ErrorMessages.BAD_REQUEST;
} 