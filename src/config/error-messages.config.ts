export const ErrorMessages = {
  // Autoryzacja
  UNAUTHORIZED: 'Brak uprawnień do wykonania tej operacji',
  INVALID_CREDENTIALS: 'Nieprawidłowy email lub hasło',
  TOKEN_BLACKLISTED: 'Token jest nieważny lub znajduje się na czarnej liście',
  TOKEN_EXPIRED: 'Token wygasł',
  TOKEN_INVALID: 'Nieprawidłowy format tokenu',
  TOKEN_MISSING: 'Brak tokenu autoryzacji',

  // Użytkownicy
  USER_NOT_FOUND: 'Użytkownik nie został znaleziony',
  USER_ALREADY_EXISTS: 'Użytkownik o podanym adresie email już istnieje',
  USER_CREATE_ERROR: 'Nie udało się utworzyć użytkownika',
  USER_UPDATE_ERROR: 'Nie udało się zaktualizować użytkownika',
  USER_DELETE_ERROR: 'Nie udało się usunąć użytkownika',

  // Walidacja hasła
  PASSWORD_TOO_SHORT: 'Hasło musi zawierać minimum 8 znaków',
  PASSWORD_TOO_WEAK: 'Hasło musi zawierać minimum 8 znaków, w tym: wielką literę, małą literę, cyfrę i znak specjalny',
  PASSWORD_RESET_TOKEN_INVALID: 'Nieprawidłowy token resetowania hasła',
  PASSWORD_RESET_TOKEN_EXPIRED: 'Token resetowania hasła wygasł',

  // Rate limiting
  TOO_MANY_REQUESTS: 'Przekroczono limit prób. Spróbuj ponownie później',
  TOO_MANY_LOGIN_ATTEMPTS: 'Przekroczono limit prób logowania. Spróbuj ponownie za kilka minut',
  TOO_MANY_PASSWORD_RESET_ATTEMPTS: 'Przekroczono limit prób resetowania hasła. Spróbuj ponownie za kilka minut',
  RATE_LIMIT_WINDOW: 'Musisz poczekać {time} przed kolejną próbą',

  // Ogólne
  INTERNAL_SERVER_ERROR: 'Wystąpił błąd serwera. Spróbuj ponownie później',
  BAD_REQUEST: 'Nieprawidłowe żądanie',
  NOT_FOUND: 'Zasób nie został znaleziony',
  FORBIDDEN: 'Brak dostępu do zasobu',
  SERVICE_UNAVAILABLE: 'Usługa tymczasowo niedostępna',
}; 