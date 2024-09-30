import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../../../app.module';

describe('UsersController (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  it('/users/register (POST) - should register a new user', () => {
    return request(app.getHttpServer())
      .post('/users/register')
      .send({
        username: 'newuser',
        email: 'newuser@example.com',
        password: 'password123',
      })
      .expect(201);
  });

  afterAll(async () => {
    await app.close();
  });
});
