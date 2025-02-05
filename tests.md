# Testy Systemu Autoryzacji

## Testy Logowania

### Pozytywne
1. ✅ Logowanie z poprawnymi danymi
   - Endpoint: POST /auth/login
   - Request: `{"email":"testuser@example.com", "password":"Password123!"}`
   - Response: 200 OK
   - Zwraca token JWT w formacie `{"access_token": "..."}`

### Negatywne
1. ✅ Logowanie z nieprawidłowym hasłem
   - Endpoint: POST /auth/login
   - Request: `{"email":"testuser@example.com", "password":"WrongPassword123!"}`
   - Response: 401 Unauthorized
   - Komunikat: "Unauthorized"

2. ✅ Logowanie z nieistniejącym kontem
   - Endpoint: POST /auth/login
   - Request: `{"email":"nonexistent@example.com", "password":"Password123!"}`
   - Response: 401 Unauthorized
   - Komunikat: "Unauthorized"

3. ✅ Logowanie z pustymi danymi
   - Endpoint: POST /auth/login
   - Request: `{"email":"", "password":""}`
   - Response: 401 Unauthorized
   - Komunikat: "Unauthorized"

## Testy Rejestracji

### Pozytywne
1. ✅ Rejestracja nowego użytkownika
   - Endpoint: POST /users/register
   - Request: `{"email":"testuser@example.com", "password":"Password123!", "username":"testuser"}`
   - Response: 201 Created
   - Zwraca dane utworzonego użytkownika (bez hasła)

### Negatywne
1. ✅ Rejestracja z istniejącym emailem
   - Endpoint: POST /users/register
   - Request: `{"email":"testuser@example.com", "password":"Password123!", "username":"testuser2"}`
   - Response: 409 Conflict
   - Komunikat: "Email already exists"

2. ✅ Rejestracja z nieprawidłowym formatem emaila
   - Endpoint: POST /users/register
   - Request: `{"email":"invalid-email", "password":"Password123!", "username":"testuser"}`
   - Response: 400 Bad Request
   - Komunikat: "email must be an email"

3. ✅ Rejestracja z za krótkim hasłem
   - Endpoint: POST /users/register
   - Request: `{"email":"test@example.com", "password":"123", "username":"testuser"}`
   - Response: 400 Bad Request
   - Komunikat: "password must be longer than or equal to 6 characters"

4. ✅ Rejestracja bez wymaganego pola
   - Endpoint: POST /users/register
   - Request: `{"email":"test@example.com", "password":"Password123!"}`
   - Response: 400 Bad Request
   - Komunikat: "username should not be empty"

## Testy Walidacji Danych

1. ✅ Wysłanie nieprawidłowego formatu JSON
   - Endpoint: POST /users/register
   - Request: `invalid-json`
   - Response: 400 Bad Request
   - Komunikat: błąd parsowania JSON

## Testy JWT i Chronionego Endpointu

### Pozytywne
1. ✅ Dostęp do chronionego endpointu z poprawnym tokenem
   - Endpoint: GET /users/profile
   - Headers: `Authorization: Bearer <valid_token>`
   - Response: 200 OK
   - Zwraca dane profilu użytkownika

### Negatywne
1. ✅ Dostęp do chronionego endpointu bez tokena
   - Endpoint: GET /users/profile
   - Response: 401 Unauthorized
   - Komunikat: "Unauthorized"

2. ✅ Dostęp do chronionego endpointu z nieprawidłowym tokenem
   - Endpoint: GET /users/profile
   - Headers: `Authorization: Bearer invalid_token`
   - Response: 401 Unauthorized
   - Komunikat: "Unauthorized"

## Testy Zarządzania Tokenami

### Wygasanie Tokena
1. ✅ Dostęp z wygasłym tokenem
   - Endpoint: GET /users/profile
   - Headers: `Authorization: Bearer <expired_token>`
   - Response: 401 Unauthorized
   - Komunikat: "Unauthorized"

### Odświeżanie Tokena
1. ✅ Odświeżanie tokena
   - Endpoint: POST /auth/refresh
   - Headers: `Authorization: Bearer <valid_token>`
   - Response: 200 OK
   - Zwraca nowy token JWT

### Wylogowywanie
1. ✅ Wylogowanie użytkownika
   - Endpoint: POST /auth/logout
   - Headers: `Authorization: Bearer <valid_token>`
   - Response: 200 OK
   - Komunikat: "Logged out successfully"

## Testy Rate Limitingu

1. ✅ Przekroczenie limitu prób logowania
   - Endpoint: POST /auth/login
   - Limit: 5 prób w ciągu 1 minuty
   - Request: Wielokrotne próby logowania z nieprawidłowymi danymi
   - Response po przekroczeniu limitu: 429 Too Many Requests
   - Komunikat: "ThrottlerException: Too Many Requests"

## Testy Walidacji Hasła

1. ✅ Rejestracja z hasłem niespełniającym wymagań
   - Endpoint: POST /users/register
   - Request: `{"email":"test@example.com", "password":"weakpass", "username":"testuser"}`
   - Response: 400 Bad Request
   - Komunikat: "Hasło musi zawierać minimum 8 znaków, w tym: wielką literę, małą literę, cyfrę i znak specjalny"

2. ✅ Rejestracja z poprawnym silnym hasłem
   - Endpoint: POST /users/register
   - Request: `{"email":"test@example.com", "password":"StrongP@ssw0rd", "username":"testuser"}`
   - Response: 201 Created
   - Zwraca dane utworzonego użytkownika

## Testy Blacklisty Tokenów

1. ✅ Próba użycia unieważnionego tokena
   - Endpoint: GET /users/profile
   - Krok 1: Wylogowanie użytkownika (token trafia na blacklistę)
   - Krok 2: Próba dostępu z unieważnionym tokenem
   - Response: 401 Unauthorized
   - Komunikat: "Token jest na czarnej liście"

2. ✅ Automatyczne czyszczenie wygasłych tokenów
   - Tokeny są automatycznie usuwane z blacklisty po wygaśnięciu
   - Zmniejsza rozmiar bazy danych
   - Optymalizuje wydajność systemu

## Zabezpieczenia
- ✅ Hasła są hashowane przed zapisem do bazy danych (bcrypt)
- ✅ Hasła nie są zwracane w odpowiedziach API
- ✅ Tokeny JWT są generowane z odpowiednim czasem ważności
- ✅ Walidacja danych wejściowych jest wykonywana przez class-validator
- ✅ Obsługa błędów zwraca odpowiednie kody HTTP i komunikaty
- ✅ Chronione endpointy wymagają ważnego tokena JWT
- ✅ Implementacja JWT Guard do weryfikacji tokenów
- ✅ Tokeny JWT wygasają po określonym czasie (30 sekund w trybie testowym)
- ✅ Możliwość odświeżenia tokena przed wygaśnięciem
- ✅ Bezpieczne wylogowanie użytkownika
- ✅ Rate limiting dla endpointów logowania (5 prób/minutę)
- ✅ Ochrona przed atakami brute force
- ✅ Silne wymagania dotyczące hasła (min. 8 znaków, wielka litera, mała litera, cyfra, znak specjalny)
- ✅ Helmet - zabezpieczenia nagłówków HTTP
- ✅ CORS - kontrola dostępu do zasobów
- ✅ Walidacja i sanityzacja wszystkich danych wejściowych
- ✅ Blacklista unieważnionych tokenów JWT
- ✅ Automatyczne czyszczenie wygasłych tokenów z blacklisty 