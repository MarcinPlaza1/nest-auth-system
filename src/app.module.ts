import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';

@Module({
  imports: [
    // Konfiguracja modułu .env
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    
    // Konfiguracja Mongoose z dynamicznym URI z pliku .env
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        uri: configService.get<string>('MONGO_URI') || 'mongodb://localhost/nest', // Dodaj domyślną wartość, aby uniknąć błędów
      }),
      inject: [ConfigService],
    }),

    // Konfiguracja modułu JWT z dynamicznym kluczem secret
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET') || 'default_jwt_secret', // Sprawdzanie wartości JWT_SECRET
        signOptions: { expiresIn: '60s' },
      }),
      inject: [ConfigService],
    }),

    // Rejestracja PassportModule
    PassportModule.register({ defaultStrategy: 'jwt' }),

    // Importowanie modułów aplikacji
    AuthModule,
    UsersModule,
  ],
})
export class AppModule {}
