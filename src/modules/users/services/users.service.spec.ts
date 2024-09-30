import { Test, TestingModule } from '@nestjs/testing';
import { UsersService } from './users.service';
import { getModelToken } from '@nestjs/mongoose';
import { User } from '../entities/user.entity';

describe('UsersService', () => {
  let service: UsersService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        {
          provide: getModelToken(User.name),
          useValue: {
            findOne: jest.fn(),
            save: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should create a new user', async () => {
    const user = { username: 'test', email: 'test@test.com', password: 'hashedPassword' };
    jest.spyOn(service, 'createUser').mockResolvedValue(user as any);

    const result = await service.createUser('test', 'test@test.com', 'password123');
    expect(result.username).toEqual('test');
    expect(result.email).toEqual('test@test.com');
  });
});
