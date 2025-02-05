import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from '../services/auth.service';
import { UsersService } from '../../users/services/users.service';
import { JwtService } from '@nestjs/jwt';
import { TokenBlacklistService } from '../services/token-blacklist.service';
import { SessionService } from '../services/session.service';
import { ErrorMessages } from '../../../config/error-messages';
import * as bcrypt from 'bcrypt';

describe('AuthService', () => {
  let service: AuthService;
  let usersService: UsersService;

  const mockUsersService = {
    findOneByEmail: jest.fn(),
  };

  const mockJwtService = {
    sign: jest.fn(),
  };

  const mockTokenBlacklistService = {
    isBlacklisted: jest.fn(),
  };

  const mockSessionService = {
    createSession: jest.fn(),
    deactivateSession: jest.fn(),
    refreshSession: jest.fn(),
    isSessionActive: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: UsersService,
          useValue: mockUsersService,
        },
        {
          provide: JwtService,
          useValue: mockJwtService,
        },
        {
          provide: TokenBlacklistService,
          useValue: mockTokenBlacklistService,
        },
        {
          provide: SessionService,
          useValue: mockSessionService,
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    usersService = module.get<UsersService>(UsersService);

    // Reset all mocks before each test
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('validateUser', () => {
    it('should return user object without password when credentials are valid', async () => {
      const testUser = {
        _id: 'testId',
        email: 'test@example.com',
        password: await bcrypt.hash('password123', 10),
      };

      mockUsersService.findOneByEmail.mockResolvedValue(testUser);

      const result = await service.validateUser('test@example.com', 'password123');

      expect(result).toBeDefined();
      expect(result.password).toBeUndefined();
      expect(result._id).toBe(testUser._id);
      expect(result.email).toBe(testUser.email);
    });

    it('should return null when user is not found', async () => {
      mockUsersService.findOneByEmail.mockResolvedValue(null);

      const result = await service.validateUser('nonexistent@example.com', 'password123');

      expect(result).toBeNull();
    });

    it('should return null when password is invalid', async () => {
      const testUser = {
        _id: 'testId',
        email: 'test@example.com',
        password: await bcrypt.hash('password123', 10),
      };

      mockUsersService.findOneByEmail.mockResolvedValue(testUser);

      const result = await service.validateUser('test@example.com', 'wrongpassword');

      expect(result).toBeNull();
    });

    it('should handle undefined user password correctly', async () => {
      const testUser = {
        _id: 'testId',
        email: 'test@example.com',
      };

      mockUsersService.findOneByEmail.mockResolvedValue(testUser);

      const result = await service.validateUser('test@example.com', 'anypassword');

      expect(result).toBeNull();
    });

    it('should handle empty user password correctly', async () => {
      const testUser = {
        _id: 'testId',
        email: 'test@example.com',
        password: '',
      };

      mockUsersService.findOneByEmail.mockResolvedValue(testUser);

      const result = await service.validateUser('test@example.com', 'anypassword');

      expect(result).toBeNull();
    });

    it('should handle bcrypt compare error', async () => {
      const testUser = {
        _id: 'testId',
        email: 'test@example.com',
        password: 'invalid-hash-format',
      };

      mockUsersService.findOneByEmail.mockResolvedValue(testUser);

      const result = await service.validateUser('test@example.com', 'password123');

      expect(result).toBeNull();
    });

    it('should handle undefined password in request', async () => {
      const testUser = {
        _id: 'testId',
        email: 'test@example.com',
        password: await bcrypt.hash('password123', 10),
      };

      mockUsersService.findOneByEmail.mockResolvedValue(testUser);

      const result = await service.validateUser('test@example.com', undefined);

      expect(result).toBeNull();
    });

    it('should handle database error during user search', async () => {
      mockUsersService.findOneByEmail.mockImplementation(() => Promise.reject(new Error('Database error')));

      const result = await service.validateUser('test@example.com', 'password123');
      expect(result).toBeNull();
    });
  });

  describe('login', () => {
    it('should create a session and return access token with user data', async () => {
      const testUser = {
        _id: 'testId',
        email: 'test@example.com',
      };

      const testToken = 'test-jwt-token';
      mockJwtService.sign.mockReturnValue(testToken);
      mockSessionService.createSession.mockResolvedValue({ id: 'sessionId' });

      const result = await service.login(testUser);

      expect(mockJwtService.sign).toHaveBeenCalledWith({ sub: testUser._id.toString() });
      expect(mockSessionService.createSession).toHaveBeenCalledWith(
        testUser._id.toString(),
        testToken,
      );
      expect(result).toEqual({
        access_token: testToken,
        user: {
          id: testUser._id.toString(),
          email: testUser.email,
        },
      });
    });

    it('should handle user without _id property', async () => {
      const testUser = {
        email: 'test@example.com',
      };

      await expect(service.login(testUser)).rejects.toThrow();
    });

    it('should handle user with non-string _id', async () => {
      const testUser = {
        _id: 123,
        email: 'test@example.com',
      };

      const testToken = 'test-jwt-token';
      mockJwtService.sign.mockReturnValue(testToken);
      mockSessionService.createSession.mockResolvedValue({ id: 'sessionId' });

      const result = await service.login(testUser);

      expect(result.user.id).toBe('123');
    });

    it('should handle session creation error', async () => {
      const testUser = {
        _id: 'testId',
        email: 'test@example.com',
      };

      const testToken = 'test-jwt-token';
      mockJwtService.sign.mockReturnValue(testToken);
      mockSessionService.createSession.mockRejectedValue(new Error('Session creation failed'));

      await expect(service.login(testUser)).rejects.toThrow('Session creation failed');
      expect(mockJwtService.sign).toHaveBeenCalledWith({ sub: testUser._id.toString() });
    });

    it('should verify returned data format', async () => {
      const testUser = {
        _id: 'testId',
        email: 'test@example.com',
        username: 'testuser',
        role: 'user',
      };

      const testToken = 'test-jwt-token';
      mockJwtService.sign.mockReturnValue(testToken);
      mockSessionService.createSession.mockResolvedValue({ id: 'sessionId' });

      const result = await service.login(testUser);

      expect(result).toEqual({
        access_token: testToken,
        user: {
          id: testUser._id.toString(),
          email: testUser.email,
        }
      });
      // Sprawdzamy, czy zbędne pola nie są zwracane
      expect(result.user).not.toHaveProperty('username');
      expect(result.user).not.toHaveProperty('role');
    });

    it('should handle complex user object', async () => {
      const testUser = {
        _id: { value: 'testId', toString: () => 'testId' },
        email: 'test@example.com',
        profile: {
          name: 'Test User',
          avatar: 'avatar.jpg'
        }
      };

      const testToken = 'test-jwt-token';
      mockJwtService.sign.mockReturnValue(testToken);
      mockSessionService.createSession.mockResolvedValue({ id: 'sessionId' });

      const result = await service.login(testUser);

      expect(result).toEqual({
        access_token: testToken,
        user: {
          id: 'testId',
          email: testUser.email,
        }
      });
    });
  });

  describe('logout', () => {
    it('should deactivate the session', async () => {
      const token = 'test-token';
      mockSessionService.deactivateSession.mockResolvedValue(undefined);

      await service.logout(token);

      expect(mockSessionService.deactivateSession).toHaveBeenCalledWith(token);
    });

    it('should handle deactivation error', async () => {
      const token = 'test-token';
      mockSessionService.deactivateSession.mockRejectedValue(new Error('Deactivation failed'));

      await expect(service.logout(token)).rejects.toThrow('Deactivation failed');
      expect(mockSessionService.deactivateSession).toHaveBeenCalledWith(token);
    });

    it('should handle non-existent session', async () => {
      const token = 'non-existent-token';
      mockSessionService.deactivateSession.mockRejectedValue(new Error('Session not found'));

      await expect(service.logout(token)).rejects.toThrow('Session not found');
    });

    it('should handle already logged out session', async () => {
      const token = 'expired-token';
      mockSessionService.deactivateSession.mockRejectedValue(new Error('Session already deactivated'));

      await expect(service.logout(token)).rejects.toThrow('Session already deactivated');
    });

    it('should handle empty token', async () => {
      const token = '';
      mockSessionService.deactivateSession.mockResolvedValue(undefined);
      
      await service.logout(token);

      expect(mockSessionService.deactivateSession).toHaveBeenCalledWith(token);
    });
  });

  describe('refresh', () => {
    it('should throw UnauthorizedException when token is blacklisted', async () => {
      const oldToken = 'old-token';
      const userId = 'user-id';

      mockTokenBlacklistService.isBlacklisted.mockResolvedValue(true);

      await expect(service.refresh(oldToken, userId)).rejects.toThrow(ErrorMessages.TOKEN_BLACKLISTED);
      expect(mockTokenBlacklistService.isBlacklisted).toHaveBeenCalledWith(oldToken);
    });

    it('should refresh session and return new token', async () => {
      const oldToken = 'old-token';
      const userId = 'user-id';
      const newToken = 'new-token';
      const newSession = { id: 'new-session-id' };

      mockTokenBlacklistService.isBlacklisted.mockResolvedValue(false);
      mockSessionService.refreshSession.mockResolvedValue({ token: newToken, session: newSession });

      const result = await service.refresh(oldToken, userId);

      expect(mockTokenBlacklistService.isBlacklisted).toHaveBeenCalledWith(oldToken);
      expect(mockSessionService.refreshSession).toHaveBeenCalledWith(oldToken, userId);
      expect(result).toEqual({
        access_token: newToken,
      });
    });

    it('should handle error from session refresh', async () => {
      const oldToken = 'old-token';
      const userId = 'user-id';

      mockTokenBlacklistService.isBlacklisted.mockResolvedValue(false);
      mockSessionService.refreshSession.mockRejectedValue(new Error('Session refresh failed'));

      await expect(service.refresh(oldToken, userId)).rejects.toThrow('Session refresh failed');
    });

    it('should handle invalid userId', async () => {
      const oldToken = 'old-token';
      const userId = '';

      mockTokenBlacklistService.isBlacklisted.mockResolvedValue(false);
      mockSessionService.refreshSession.mockRejectedValue(new Error('Invalid user ID'));

      await expect(service.refresh(oldToken, userId)).rejects.toThrow('Invalid user ID');
    });

    it('should handle expired session', async () => {
      const oldToken = 'old-token';
      const userId = 'user-id';

      mockTokenBlacklistService.isBlacklisted.mockResolvedValue(false);
      mockSessionService.refreshSession.mockRejectedValue(new Error(ErrorMessages.SESSION_EXPIRED));

      await expect(service.refresh(oldToken, userId)).rejects.toThrow(ErrorMessages.SESSION_EXPIRED);
    });

    it('should verify new token format', async () => {
      const oldToken = 'old-token';
      const userId = 'user-id';
      const newToken = 'new-token';
      const newSession = { id: 'new-session-id' };

      mockTokenBlacklistService.isBlacklisted.mockResolvedValue(false);
      mockSessionService.refreshSession.mockResolvedValue({ token: newToken, session: newSession });

      const result = await service.refresh(oldToken, userId);

      expect(result).toEqual({
        access_token: newToken,
      });
      expect(result).not.toHaveProperty('session');
      expect(result).not.toHaveProperty('user');
    });

    it('should handle empty token', async () => {
      const oldToken = '';
      const userId = 'user-id';

      mockTokenBlacklistService.isBlacklisted.mockResolvedValue(false);
      mockSessionService.refreshSession.mockRejectedValue(new Error('Invalid token'));

      await expect(service.refresh(oldToken, userId)).rejects.toThrow('Invalid token');
    });

    it('should handle blacklist service error', async () => {
      const oldToken = 'old-token';
      const userId = 'user-id';

      mockTokenBlacklistService.isBlacklisted.mockRejectedValue(new Error('Blacklist service unavailable'));

      await expect(service.refresh(oldToken, userId)).rejects.toThrow('Blacklist service unavailable');
      expect(mockSessionService.refreshSession).not.toHaveBeenCalled();
    });
  });

  describe('validateToken', () => {
    it('should throw UnauthorizedException when token is blacklisted', async () => {
      const token = 'test-token';
      mockTokenBlacklistService.isBlacklisted.mockResolvedValue(true);

      await expect(service.validateToken(token)).rejects.toThrow(ErrorMessages.TOKEN_BLACKLISTED);
      expect(mockTokenBlacklistService.isBlacklisted).toHaveBeenCalledWith(token);
    });

    it('should throw UnauthorizedException when session is not active', async () => {
      const token = 'test-token';
      mockTokenBlacklistService.isBlacklisted.mockResolvedValue(false);
      mockSessionService.isSessionActive.mockResolvedValue(false);

      await expect(service.validateToken(token)).rejects.toThrow(ErrorMessages.SESSION_EXPIRED);
      expect(mockTokenBlacklistService.isBlacklisted).toHaveBeenCalledWith(token);
      expect(mockSessionService.isSessionActive).toHaveBeenCalledWith(token);
    });

    it('should return true when token is valid and session is active', async () => {
      const token = 'test-token';
      mockTokenBlacklistService.isBlacklisted.mockResolvedValue(false);
      mockSessionService.isSessionActive.mockResolvedValue(true);

      const result = await service.validateToken(token);

      expect(result).toBe(true);
      expect(mockTokenBlacklistService.isBlacklisted).toHaveBeenCalledWith(token);
      expect(mockSessionService.isSessionActive).toHaveBeenCalledWith(token);
    });

    it('should handle error from isBlacklisted check', async () => {
      const token = 'test-token';
      mockTokenBlacklistService.isBlacklisted.mockRejectedValue(new Error('Database error'));

      await expect(service.validateToken(token)).rejects.toThrow();
    });

    it('should handle empty token', async () => {
      await expect(service.validateToken('')).rejects.toThrow();
    });

    it('should handle session check error', async () => {
      const token = 'test-token';
      mockTokenBlacklistService.isBlacklisted.mockResolvedValue(false);
      mockSessionService.isSessionActive.mockRejectedValue(new Error('Session check failed'));

      await expect(service.validateToken(token)).rejects.toThrow('Session check failed');
    });

    it('should handle invalid token format', async () => {
      const token = 'invalid-format-token';
      mockTokenBlacklistService.isBlacklisted.mockResolvedValue(false);
      mockSessionService.isSessionActive.mockRejectedValue(new Error('Invalid token format'));

      await expect(service.validateToken(token)).rejects.toThrow('Invalid token format');
    });

    it('should handle expired token', async () => {
      const token = 'expired-token';
      mockTokenBlacklistService.isBlacklisted.mockResolvedValue(false);
      mockSessionService.isSessionActive.mockResolvedValue(false);

      await expect(service.validateToken(token)).rejects.toThrow(ErrorMessages.SESSION_EXPIRED);
    });

    it('should handle null token', async () => {
      const token = null;

      await expect(service.validateToken(token)).rejects.toThrow();
    });

    it('should handle undefined token', async () => {
      const token = undefined;

      await expect(service.validateToken(token)).rejects.toThrow();
    });

    it('should handle concurrent service errors', async () => {
      const token = 'test-token';
      mockTokenBlacklistService.isBlacklisted.mockRejectedValue(new Error('Service unavailable'));
      mockSessionService.isSessionActive.mockRejectedValue(new Error('Database error'));

      await expect(service.validateToken(token)).rejects.toThrow('Service unavailable');
      expect(mockSessionService.isSessionActive).not.toHaveBeenCalled();
    });
  });
}); 