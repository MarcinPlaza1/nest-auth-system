# System Autoryzacji NestJS

System autoryzacji oparty na frameworku NestJS umożliwiający zarządzanie użytkownikami i uwierzytelnianie przy użyciu JWT i MongoDB (Mongoose).

## Funkcjonalności

- Rejestracja nowego użytkownika
- Logowanie użytkownika
- Uwierzytelnianie oparte na JWT
- Zabezpieczone endpointy API
- Walidacja danych wejściowych
- Szyfrowanie haseł przy użyciu bcrypt
- Dokumentacja API generowana przez Swagger

## Wymagania

- Node.js (wersja 16 lub nowsza)
- npm lub yarn
- MongoDB (lokalnie lub w chmurze, np. MongoDB Atlas)

## Instalacja

1. Sklonuj repozytorium:
   ```bash
   git clone [repository-url]
   ```

2. Zainstaluj zależności:
   ```bash
   npm install
   ```

3. Skonfiguruj zmienne środowiskowe  
   Utwórz plik `.env` w katalogu głównym projektu i dodaj następujące zmienne:
   ```
   MONGO_URI=mongodb://localhost/nest
   JWT_SECRET=twoj_tajny_klucz
   NODE_ENV=development
   ```
   Jeśli korzystasz z MongoDB Atlas, zaktualizuj wartość MONGO_URI odpowiednio.

4. Uruchom aplikację w trybie deweloperskim:
   ```bash
   npm run start:dev
   ```

## Dokumentacja API

Po uruchomieniu aplikacji dokumentacja API jest dostępna pod adresem:  
http://localhost:3000/api

## Uruchamianie w kontenerze Docker

Projekt posiada konfigurację Docker oraz Docker Compose. Aby uruchomić aplikację w kontenerze:

1. Zbuduj i uruchom kontenery:
   ```bash
   docker-compose up --build
   ```

2. Aby uruchomić wersję z obsługą debugowania, użyj:
   ```bash
   docker-compose -f docker-compose.debug.yml up --build
   ```

## Testowanie

Testy jednostkowe i e2e zostały skonfigurowane przy użyciu narzędzia Jest. Aby uruchomić testy, wykonaj:
```bash
npm run test
```
lub dla testów end-to-end:
```bash
npm run test:e2e
```

## Technologie

- [NestJS](https://nestjs.com/)
- [TypeScript](https://www.typescriptlang.org/)
- [MongoDB & Mongoose](https://mongoosejs.com/)
- [Passport.js](http://www.passportjs.org/)
- [JWT](https://jwt.io/)
- [Docker](https://www.docker.com/)
- [Swagger](https://swagger.io/)
- [Jest](https://jestjs.io/)

## Licencja

Projekt opublikowany jest na licencji UNLICENSED.

## Autorzy

- Marcin Plaza – Główny deweloper 