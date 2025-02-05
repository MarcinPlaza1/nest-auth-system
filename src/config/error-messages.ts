export const ErrorMessages = {
  // Autoryzacja
  INVALID_CREDENTIALS: 'Nieprawidłowy email lub hasło',
  TOKEN_BLACKLISTED: 'Token jest na czarnej liście',
  SESSION_EXPIRED: 'Sesja wygasła',
  TOKEN_EXPIRED: 'Token wygasł',
  INVALID_TOKEN: 'Nieprawidłowy token',
  UNAUTHORIZED: 'Brak autoryzacji',
  TOKEN_REQUIRED: 'Wymagany token autoryzacyjny',
  
  // Walidacja hasła
  PASSWORD_TOO_WEAK: 'Hasło musi zawierać minimum 8 znaków, w tym: wielką literę, małą literę, cyfrę i znak specjalny',
  PASSWORD_MISMATCH: 'Hasła nie są identyczne',
  CURRENT_PASSWORD_INVALID: 'Aktualne hasło jest nieprawidłowe',
  
  // Rate limiting
  TOO_MANY_REQUESTS: 'Zbyt wiele prób. Spróbuj ponownie za {time} minut',
  TOO_MANY_LOGIN_ATTEMPTS: 'Zbyt wiele nieudanych prób logowania. Spróbuj ponownie za minutę',
  TOO_MANY_RESET_ATTEMPTS: 'Zbyt wiele prób resetowania hasła. Spróbuj ponownie za 5 minut',
  
  // Użytkownicy
  USER_NOT_FOUND: 'Użytkownik nie został znaleziony',
  USER_ALREADY_EXISTS: 'Użytkownik o podanym adresie email już istnieje',
  INVALID_RESET_TOKEN: 'Nieprawidłowy lub wygasły token resetowania hasła',
  
  // Sesje
  INVALID_SESSION: 'Nieprawidłowa sesja',
  SESSION_NOT_FOUND: 'Sesja nie została znaleziona',
  
  // Ogólne
  INTERNAL_SERVER_ERROR: 'Wystąpił błąd serwera',
  BAD_REQUEST: 'Nieprawidłowe żądanie',
  NOT_FOUND: 'Nie znaleziono zasobu',
  FORBIDDEN: 'Brak dostępu',
}; 