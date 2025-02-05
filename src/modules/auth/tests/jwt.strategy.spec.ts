import { Test, TestingModule } from '@nestjs/testing';
import { JwtStrategy } from '../strategies/jwt.strategy';
import { ConfigService } from '@nestjs/config';
import { AuthService } from '../services/auth.service';
import { UnauthorizedException } from '@nestjs/common';
import { ExtractJwt } from 'passport-jwt';

jest.mock('passport-jwt', () => ({
  Strategy: jest.fn(),
  ExtractJwt: {
    fromAuthHeaderAsBearerToken: jest.fn(),
  },
}));

describe('JwtStrategy', () => {
  let strategy: JwtStrategy;
  let authService: AuthService;
  let configService: ConfigService;

  const mockAuthService = {
    validateToken: jest.fn(),
  };

  const mockConfigService = {
    get: jest.fn(),
  };

  const mockExtractToken = jest.fn();

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        JwtStrategy,
        {
          provide: AuthService,
          useValue: mockAuthService,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    strategy = module.get<JwtStrategy>(JwtStrategy);
    authService = module.get<AuthService>(AuthService);
    configService = module.get<ConfigService>(ConfigService);

    // Reset all mocks before each test
    jest.clearAllMocks();

    // Domyślna konfiguracja
    mockConfigService.get.mockImplementation((key: string) => {
      if (key === 'JWT_SECRET') {
        return 'test-secret';
      }
      return undefined;
    });

    // Mock ExtractJwt
    mockExtractToken.mockReturnValue('valid-token');
    (ExtractJwt.fromAuthHeaderAsBearerToken as jest.Mock).mockReturnValue(mockExtractToken);
  });

  it('should be defined', () => {
    expect(strategy).toBeDefined();
  });

  describe('validate', () => {
    it('should validate token and return user data', async () => {
      const req = { headers: { authorization: 'Bearer valid-token' } };
      const payload = { sub: 'user-123', username: 'testuser' };

      mockAuthService.validateToken.mockResolvedValue(true);

      const result = await strategy.validate(req, payload);

      expect(result).toEqual({
        userId: payload.sub,
        username: payload.username,
      });
      expect(mockAuthService.validateToken).toHaveBeenCalledWith('valid-token');
    });

    it('should throw UnauthorizedException when token is missing', async () => {
      const req = { headers: {} };
      const payload = { sub: 'user-123', username: 'testuser' };

      mockExtractToken.mockReturnValue(null);

      await expect(strategy.validate(req, payload))
        .rejects.toThrow(UnauthorizedException);
      expect(mockAuthService.validateToken).not.toHaveBeenCalled();
    });

    it('should throw UnauthorizedException when token validation fails', async () => {
      const req = { headers: { authorization: 'Bearer invalid-token' } };
      const payload = { sub: 'user-123', username: 'testuser' };

      mockAuthService.validateToken.mockRejectedValue(new UnauthorizedException());

      await expect(strategy.validate(req, payload))
        .rejects.toThrow(UnauthorizedException);
    });

    it('should handle validation service errors', async () => {
      const req = { headers: { authorization: 'Bearer valid-token' } };
      const payload = { sub: 'user-123', username: 'testuser' };

      mockAuthService.validateToken.mockRejectedValue(new Error('Validation service error'));

      await expect(strategy.validate(req, payload))
        .rejects.toThrow('Validation service error');
    });
  });

  describe('constructor', () => {
    it('should initialize with correct passport options', () => {
      mockConfigService.get.mockReturnValue('test-secret');
      
      // Create new instance to trigger constructor
      new JwtStrategy(configService, authService);
      
      expect(mockConfigService.get).toHaveBeenCalledWith('JWT_SECRET');
      expect(require('passport-jwt').Strategy).toHaveBeenCalledWith(
        {
          jwtFromRequest: expect.any(Function),
          ignoreExpiration: false,
          secretOrKey: 'test-secret',
          passReqToCallback: true,
        },
        expect.any(Function)
      );
    });

    it('should use default secret when JWT_SECRET is not configured', () => {
      mockConfigService.get.mockReturnValue(undefined);

      // Create new instance to trigger constructor
      new JwtStrategy(configService, authService);

      expect(require('passport-jwt').Strategy).toHaveBeenCalledWith(
        {
          jwtFromRequest: expect.any(Function),
          ignoreExpiration: false,
          secretOrKey: 'default_jwt_secret',
          passReqToCallback: true,
        },
        expect.any(Function)
      );
    });
  });
}); 