import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { UsersService } from '../../users/services/users.service';
import { JwtService } from '@nestjs/jwt';

describe('AuthService (integration)', () => {
  let authService: AuthService;
  let usersService: UsersService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: UsersService,
          useValue: {
            findOneByEmail: jest.fn().mockResolvedValue({
              email: 'newuser@example.com',
              password: 'hashedpassword',
            }),
          },
        },
        {
          provide: JwtService,
          useValue: {
            sign: jest.fn().mockReturnValue('jwt_token'),
          },
        },
      ],
    }).compile();

    authService = module.get<AuthService>(AuthService);
    usersService = module.get<UsersService>(UsersService);
  });

  it('should validate user and return JWT', async () => {
    const result = await authService.validateUser('newuser@example.com', 'password123');
    expect(result).toBeDefined();
    const loginResult = await authService.login(result);
    expect(loginResult.access_token).toBe('jwt_token');
  });
});
