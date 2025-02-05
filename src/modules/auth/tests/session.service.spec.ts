import { Test, TestingModule } from '@nestjs/testing';
import { SessionService } from '../services/session.service';
import { SessionManagerService } from '../services/session-manager.service';
import { ErrorMessages } from '../../../config/error-messages';

describe('SessionService', () => {
  let service: SessionService;
  let sessionManagerService: SessionManagerService;

  const mockSessionManagerService = {
    createSession: jest.fn(),
    revokeSession: jest.fn(),
    findSessionByToken: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SessionService,
        {
          provide: SessionManagerService,
          useValue: mockSessionManagerService,
        },
      ],
    }).compile();

    service = module.get<SessionService>(SessionService);
    sessionManagerService = module.get<SessionManagerService>(SessionManagerService);

    // Reset all mocks before each test
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createSession', () => {
    it('should create a new session with default IP address', async () => {
      const userId = 'testUserId';
      const token = 'testToken';
      const mockSession = { id: 'sessionId', userId, token };

      mockSessionManagerService.createSession.mockResolvedValue(mockSession);

      const result = await service.createSession(userId, token);

      expect(mockSessionManagerService.createSession).toHaveBeenCalledWith(
        userId,
        token,
        '127.0.0.1',
      );
      expect(result).toEqual(mockSession);
    });

    it('should create a new session with provided IP address', async () => {
      const userId = 'testUserId';
      const token = 'testToken';
      const ipAddress = '192.168.1.1';
      const mockSession = { id: 'sessionId', userId, token, ipAddress };

      mockSessionManagerService.createSession.mockResolvedValue(mockSession);

      const result = await service.createSession(userId, token, ipAddress);

      expect(mockSessionManagerService.createSession).toHaveBeenCalledWith(
        userId,
        token,
        ipAddress,
      );
      expect(result).toEqual(mockSession);
    });

    it('should handle errors from session manager', async () => {
      const userId = 'testUserId';
      const token = 'testToken';
      const error = new Error('Database connection failed');

      mockSessionManagerService.createSession.mockRejectedValue(error);

      await expect(service.createSession(userId, token)).rejects.toThrow(error);
    });
  });

  describe('deactivateSession', () => {
    it('should revoke the session', async () => {
      const token = 'testToken';
      mockSessionManagerService.revokeSession.mockResolvedValue(undefined);

      await service.deactivateSession(token);

      expect(mockSessionManagerService.revokeSession).toHaveBeenCalledWith(token);
    });

    it('should handle errors from session manager', async () => {
      const token = 'testToken';
      const error = new Error(ErrorMessages.SESSION_NOT_FOUND);

      mockSessionManagerService.revokeSession.mockRejectedValue(error);

      await expect(service.deactivateSession(token)).rejects.toThrow(ErrorMessages.SESSION_NOT_FOUND);
    });

    it('should handle empty token', async () => {
      const token = '';
      const error = new Error(ErrorMessages.SESSION_NOT_FOUND);

      mockSessionManagerService.revokeSession.mockRejectedValue(error);

      await expect(service.deactivateSession(token)).rejects.toThrow(ErrorMessages.SESSION_NOT_FOUND);
      expect(mockSessionManagerService.revokeSession).toHaveBeenCalledWith(token);
    });
  });

  describe('refreshSession', () => {
    it('should refresh session and return new token with session', async () => {
      const oldToken = 'oldToken';
      const userId = 'testUserId';
      const mockSession = { id: 'newSessionId', userId };

      mockSessionManagerService.revokeSession.mockResolvedValue(undefined);
      mockSessionManagerService.createSession.mockResolvedValue(mockSession);

      const result = await service.refreshSession(oldToken, userId);

      expect(mockSessionManagerService.revokeSession).toHaveBeenCalledWith(oldToken);
      expect(mockSessionManagerService.createSession).toHaveBeenCalledWith(
        userId,
        expect.any(String),
        '127.0.0.1',
      );
      expect(result).toEqual({
        token: expect.any(String),
        session: mockSession,
      });
    });

    it('should handle error when revoking old session', async () => {
      const oldToken = 'oldToken';
      const userId = 'testUserId';
      const error = new Error(ErrorMessages.SESSION_NOT_FOUND);

      mockSessionManagerService.revokeSession.mockRejectedValue(error);

      await expect(service.refreshSession(oldToken, userId)).rejects.toThrow(ErrorMessages.SESSION_NOT_FOUND);
      expect(mockSessionManagerService.createSession).not.toHaveBeenCalled();
    });

    it('should handle error when creating new session', async () => {
      const oldToken = 'oldToken';
      const userId = 'testUserId';
      const error = new Error('Database error');

      mockSessionManagerService.revokeSession.mockResolvedValue(undefined);
      mockSessionManagerService.createSession.mockRejectedValue(error);

      await expect(service.refreshSession(oldToken, userId)).rejects.toThrow('Database error');
    });
  });

  describe('isSessionActive', () => {
    it('should return true for active session', async () => {
      const token = 'testToken';
      const mockSession = { id: 'sessionId', isRevoked: false };

      mockSessionManagerService.findSessionByToken.mockResolvedValue(mockSession);

      const result = await service.isSessionActive(token);

      expect(result).toBe(true);
      expect(mockSessionManagerService.findSessionByToken).toHaveBeenCalledWith(token);
    });

    it('should return false for revoked session', async () => {
      const token = 'testToken';
      const mockSession = { id: 'sessionId', isRevoked: true };

      mockSessionManagerService.findSessionByToken.mockResolvedValue(mockSession);

      const result = await service.isSessionActive(token);

      expect(result).toBe(false);
      expect(mockSessionManagerService.findSessionByToken).toHaveBeenCalledWith(token);
    });

    it('should return false when session not found', async () => {
      const token = 'testToken';

      mockSessionManagerService.findSessionByToken.mockResolvedValue(null);

      const result = await service.isSessionActive(token);

      expect(result).toBe(false);
      expect(mockSessionManagerService.findSessionByToken).toHaveBeenCalledWith(token);
    });

    it('should handle database errors', async () => {
      const token = 'testToken';
      const error = new Error('Database connection failed');

      mockSessionManagerService.findSessionByToken.mockRejectedValue(error);

      await expect(service.isSessionActive(token)).rejects.toThrow(error);
    });

    it('should handle empty token', async () => {
      const token = '';

      mockSessionManagerService.findSessionByToken.mockResolvedValue(null);

      const result = await service.isSessionActive(token);

      expect(result).toBe(false);
      expect(mockSessionManagerService.findSessionByToken).toHaveBeenCalledWith(token);
    });
  });
}); 