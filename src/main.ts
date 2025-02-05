import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { ValidationPipe } from '@nestjs/common';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import helmet from 'helmet';
import { DatabaseErrorService } from './common/services/database-error.service';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  // Dodanie Helmet (zabezpieczenia nagłówków HTTP)
  app.use(helmet());

  // Konfiguracja CORS
  app.enableCors({
    origin: ['http://localhost:3000'], // Lista dozwolonych źródeł
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
  });

  // Dodanie globalnego filtra wyjątków
  const databaseErrorService = app.get(DatabaseErrorService);
  app.useGlobalFilters(new HttpExceptionFilter(databaseErrorService));

  // Dodanie globalnej walidacji
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    transform: true,
  }));

  // Konfiguracja Swagger
  const config = new DocumentBuilder()
    .setTitle('System Autoryzacji')
    .setDescription('API systemu autoryzacji')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document);
  
  await app.listen(3000);
}
bootstrap();
