import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { getMongoMemoryServer } from './test/database/mongo-memory-server';
import { APP_FILTER, APP_INTERCEPTOR } from '@nestjs/core';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { ErrorHandlingInterceptor } from './common/interceptors/error-handling.interceptor';
import { DatabaseErrorService } from './common/services/database-error.service';

@Module({
  imports: [
    // Konfiguracja modułu .env
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
      cache: true,
      expandVariables: true,
    }),
    
    // Konfiguracja Mongoose z dynamicznym URI z pliku .env
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => {
        const uri = configService.get<string>('MONGODB_URI') || 'mongodb://localhost:27017/auth-system';
        console.log('MongoDB URI:', uri);
        return {
          uri,
          useNewUrlParser: true,
          useUnifiedTopology: true
        };
      },
      inject: [ConfigService],
    }),

    // Konfiguracja modułu JWT z dynamicznym kluczem secret
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET') || 'default_jwt_secret',
        signOptions: { 
          expiresIn: configService.get<string>('JWT_EXPIRATION_TIME') || '30s',
        },
      }),
      inject: [ConfigService],
    }),

    // Rejestracja PassportModule
    PassportModule.register({ defaultStrategy: 'jwt' }),

    // Importowanie modułów aplikacji
    AuthModule,
    UsersModule,
  ],
  providers: [
    DatabaseErrorService,
    {
      provide: APP_FILTER,
      useClass: HttpExceptionFilter,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: ErrorHandlingInterceptor,
    },
  ],
})
export class AppModule {}
