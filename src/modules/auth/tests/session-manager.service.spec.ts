import { Test, TestingModule } from '@nestjs/testing';
import { SessionManagerService } from '../services/session-manager.service';
import { getModelToken } from '@nestjs/mongoose';
import { ConfigService } from '@nestjs/config';
import { Model } from 'mongoose';
import { UserSession, UserSessionDocument } from '../schemas/user-session.schema';
import { ActivityLog, ActivityLogDocument } from '../entities/activity-log.entity';
import { ActivityType } from '../enums/activity-type.enum';

describe('SessionManagerService', () => {
  let service: SessionManagerService;
  let sessionModel: Model<UserSessionDocument>;
  let activityLogModel: Model<ActivityLogDocument>;
  let configService: ConfigService;

  const mockSessionModel = {
    create: jest.fn(),
    findOne: jest.fn(),
    find: jest.fn(),
    findById: jest.fn(),
    exec: jest.fn(),
  };

  const mockActivityLogModel = {
    create: jest.fn(),
    find: jest.fn(),
    countDocuments: jest.fn(),
    exec: jest.fn(),
  };

  const mockConfigService = {
    get: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SessionManagerService,
        {
          provide: getModelToken(UserSession.name),
          useValue: mockSessionModel,
        },
        {
          provide: getModelToken(ActivityLog.name),
          useValue: mockActivityLogModel,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    service = module.get<SessionManagerService>(SessionManagerService);
    sessionModel = module.get<Model<UserSessionDocument>>(getModelToken(UserSession.name));
    activityLogModel = module.get<Model<ActivityLogDocument>>(getModelToken(ActivityLog.name));
    configService = module.get<ConfigService>(ConfigService);

    // Reset all mocks before each test
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createSession', () => {
    it('should create a new session and log activity', async () => {
      const userId = 'testUserId';
      const token = 'testToken';
      const ipAddress = '127.0.0.1';
      const deviceInfo = { browser: 'Chrome' };

      const mockSession = {
        userId,
        token,
        ipAddress,
        deviceInfo,
        lastActivity: expect.any(Date),
        isActive: true,
      };

      const mockActivityLog = {
        userId,
        activityType: ActivityType.LOGIN,
        ipAddress,
        deviceInfo,
      };

      mockSessionModel.create.mockResolvedValue(mockSession);
      mockActivityLogModel.create.mockResolvedValue(mockActivityLog);

      const result = await service.createSession(userId, token, ipAddress, deviceInfo);

      expect(mockSessionModel.create).toHaveBeenCalledWith(mockSession);
      expect(mockActivityLogModel.create).toHaveBeenCalledWith({
        userId,
        activityType: ActivityType.LOGIN,
        ipAddress,
        deviceInfo,
        userAgent: undefined,
        details: undefined,
        status: undefined,
        metadata: { sessionId: undefined },
      });
      expect(result).toEqual(mockSession);
    });

    it('should create session with default device info if not provided', async () => {
      const userId = 'testUserId';
      const token = 'testToken';
      const ipAddress = '127.0.0.1';

      const mockSession = {
        userId,
        token,
        ipAddress,
        deviceInfo: {},
        lastActivity: expect.any(Date),
        isActive: true,
      };

      mockSessionModel.create.mockResolvedValue(mockSession);
      mockActivityLogModel.create.mockResolvedValue({});

      const result = await service.createSession(userId, token, ipAddress);

      expect(mockSessionModel.create).toHaveBeenCalledWith(mockSession);
      expect(result).toEqual(mockSession);
    });

    it('should handle database errors during session creation', async () => {
      const userId = 'testUserId';
      const token = 'testToken';
      const ipAddress = '127.0.0.1';
      const error = new Error('Database connection failed');

      mockSessionModel.create.mockRejectedValue(error);

      await expect(service.createSession(userId, token, ipAddress))
        .rejects.toThrow('Database connection failed');
    });
  });

  describe('findSessionByToken', () => {
    it('should find active session by token', async () => {
      const token = 'testToken';
      const mockSession = {
        token,
        isRevoked: false,
      };

      mockSessionModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockSession),
      });

      const result = await service.findSessionByToken(token);

      expect(mockSessionModel.findOne).toHaveBeenCalledWith({ token, isRevoked: false });
      expect(result).toEqual(mockSession);
    });

    it('should return null when session not found', async () => {
      const token = 'nonExistentToken';

      mockSessionModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      });

      const result = await service.findSessionByToken(token);

      expect(result).toBeNull();
    });

    it('should handle database errors', async () => {
      const token = 'testToken';
      const error = new Error('Database error');

      mockSessionModel.findOne.mockReturnValue({
        exec: jest.fn().mockRejectedValue(error),
      });

      await expect(service.findSessionByToken(token)).rejects.toThrow('Database error');
    });
  });

  describe('revokeSession', () => {
    it('should revoke an active session', async () => {
      const token = 'testToken';
      const mockSession = {
        token,
        isRevoked: false,
        set: jest.fn(),
        save: jest.fn().mockResolvedValue(undefined),
      };

      mockSessionModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockSession),
      });

      await service.revokeSession(token);

      expect(mockSession.set).toHaveBeenCalledWith('logoutAt', expect.any(Date));
      expect(mockSession.set).toHaveBeenCalledWith('isRevoked', true);
      expect(mockSession.save).toHaveBeenCalled();
    });

    it('should handle non-existent session gracefully', async () => {
      const token = 'nonExistentToken';

      mockSessionModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      });

      await service.revokeSession(token);

      // Nie powinno rzucać błędu
      expect(mockSessionModel.findOne).toHaveBeenCalledWith({ token, isRevoked: false });
    });

    it('should handle database errors during session revocation', async () => {
      const token = 'testToken';
      const mockSession = {
        token,
        isRevoked: false,
        set: jest.fn(),
        save: jest.fn().mockRejectedValue(new Error('Database error')),
      };

      mockSessionModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockSession),
      });

      await expect(service.revokeSession(token)).rejects.toThrow('Database error');
    });

    it('should handle empty token', async () => {
      const token = '';

      mockSessionModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      });

      await service.revokeSession(token);

      expect(mockSessionModel.findOne).toHaveBeenCalledWith({ token, isRevoked: false });
    });
  });

  describe('revokeAllUserSessions', () => {
    it('should revoke all active sessions for a user', async () => {
      const userId = 'testUserId';
      const mockSessions = [
        {
          userId,
          isRevoked: false,
          set: jest.fn(),
          save: jest.fn().mockResolvedValue(undefined),
        },
        {
          userId,
          isRevoked: false,
          set: jest.fn(),
          save: jest.fn().mockResolvedValue(undefined),
        },
      ];

      mockSessionModel.find.mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockSessions),
      });

      await service.revokeAllUserSessions(userId);

      mockSessions.forEach(session => {
        expect(session.set).toHaveBeenCalledWith('logoutAt', expect.any(Date));
        expect(session.set).toHaveBeenCalledWith('isRevoked', true);
        expect(session.save).toHaveBeenCalled();
      });
    });

    it('should handle user with no active sessions', async () => {
      const userId = 'testUserId';

      mockSessionModel.find.mockReturnValue({
        exec: jest.fn().mockResolvedValue([]),
      });

      await service.revokeAllUserSessions(userId);

      expect(mockSessionModel.find).toHaveBeenCalledWith({ 
        userId, 
        isRevoked: false 
      });
    });

    it('should handle database errors during session revocation', async () => {
      const userId = 'testUserId';
      const mockSessions = [
        {
          userId,
          isRevoked: false,
          set: jest.fn(),
          save: jest.fn().mockRejectedValue(new Error('Database error')),
        },
      ];

      mockSessionModel.find.mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockSessions),
      });

      await expect(service.revokeAllUserSessions(userId)).rejects.toThrow('Database error');
    });

    it('should handle empty userId', async () => {
      const userId = '';

      mockSessionModel.find.mockReturnValue({
        exec: jest.fn().mockResolvedValue([]),
      });

      await service.revokeAllUserSessions(userId);

      expect(mockSessionModel.find).toHaveBeenCalledWith({ 
        userId, 
        isRevoked: false 
      });
    });
  });

  describe('updateSessionActivity', () => {
    it('should update session activity and log it', async () => {
      const sessionId = 'testSessionId';
      const mockSession = {
        _id: sessionId,
        userId: 'testUserId',
        isActive: true,
        ipAddress: '127.0.0.1',
        userAgent: 'test-agent',
        deviceInfo: { browser: 'Chrome' },
        lastActivity: new Date(),
        save: jest.fn().mockResolvedValue(undefined),
      };

      mockSessionModel.findById.mockResolvedValue(mockSession);
      mockActivityLogModel.create.mockResolvedValue({});

      await service.updateSessionActivity(sessionId);

      expect(mockSessionModel.findById).toHaveBeenCalledWith(sessionId);
      expect(mockSession.lastActivity).toBeInstanceOf(Date);
      expect(mockSession.save).toHaveBeenCalled();
      expect(mockActivityLogModel.create).toHaveBeenCalledWith({
        userId: mockSession.userId,
        activityType: ActivityType.SESSION_ACTIVITY,
        ipAddress: mockSession.ipAddress,
        userAgent: mockSession.userAgent,
        deviceInfo: mockSession.deviceInfo,
        details: undefined,
        status: undefined,
        metadata: {
          sessionId: mockSession._id.toString(),
        },
      });
    });

    it('should throw UnauthorizedException when session is not found', async () => {
      const sessionId = 'nonExistentSessionId';

      mockSessionModel.findById.mockResolvedValue(null);

      await expect(service.updateSessionActivity(sessionId))
        .rejects.toThrow('Sesja jest nieaktywna lub wygasła');
    });

    it('should throw UnauthorizedException when session is inactive', async () => {
      const sessionId = 'testSessionId';
      const mockSession = {
        isActive: false,
      };

      mockSessionModel.findById.mockResolvedValue(mockSession);

      await expect(service.updateSessionActivity(sessionId))
        .rejects.toThrow('Sesja jest nieaktywna lub wygasła');
    });

    it('should handle database errors during session update', async () => {
      const sessionId = 'testSessionId';
      const mockSession = {
        _id: sessionId,
        userId: 'testUserId',
        isActive: true,
        ipAddress: '127.0.0.1',
        lastActivity: new Date(),
        save: jest.fn().mockRejectedValue(new Error('Database error')),
      };

      mockSessionModel.findById.mockResolvedValue(mockSession);

      await expect(service.updateSessionActivity(sessionId))
        .rejects.toThrow('Database error');
    });

    it('should handle empty sessionId', async () => {
      const sessionId = '';

      mockSessionModel.findById.mockResolvedValue(null);

      await expect(service.updateSessionActivity(sessionId))
        .rejects.toThrow('Sesja jest nieaktywna lub wygasła');
    });
  });

  describe('deactivateSession', () => {
    it('should deactivate an active session', async () => {
      const sessionId = 'testSessionId';
      const userId = 'testUserId';
      const mockSession = {
        _id: sessionId,
        userId,
        isActive: true,
        ipAddress: '127.0.0.1',
        userAgent: 'test-agent',
        deviceInfo: { browser: 'Chrome' },
        logoutAt: undefined,
        save: jest.fn().mockResolvedValue(undefined),
        toString: () => sessionId,
      };

      mockSessionModel.findOne.mockResolvedValue(mockSession);
      mockActivityLogModel.create.mockResolvedValue({});

      await service.deactivateSession(sessionId, userId);

      expect(mockSessionModel.findOne).toHaveBeenCalledWith({
        _id: sessionId,
        userId,
        isActive: true,
      });
      expect(mockSession.isActive).toBe(false);
      expect(mockSession.logoutAt).toBeInstanceOf(Date);
      expect(mockSession.save).toHaveBeenCalled();
      expect(mockActivityLogModel.create).toHaveBeenCalledWith({
        userId: mockSession.userId,
        activityType: ActivityType.SESSION_LOGOUT,
        ipAddress: mockSession.ipAddress,
        userAgent: mockSession.userAgent,
        deviceInfo: mockSession.deviceInfo,
        details: 'Manual logout',
        status: undefined,
        metadata: {
          sessionId: sessionId,
        },
      });
    });

    it('should throw NotFoundException when session is not found', async () => {
      const sessionId = 'nonExistentSessionId';
      const userId = 'testUserId';

      mockSessionModel.findOne.mockResolvedValue(null);

      await expect(service.deactivateSession(sessionId, userId))
        .rejects.toThrow('Sesja nie została znaleziona');
    });

    it('should handle database errors during session deactivation', async () => {
      const sessionId = 'testSessionId';
      const userId = 'testUserId';
      const mockSession = {
        _id: sessionId,
        userId,
        isActive: true,
        ipAddress: '127.0.0.1',
        userAgent: 'test-agent',
        deviceInfo: { browser: 'Chrome' },
        save: jest.fn().mockRejectedValue(new Error('Database error')),
      };

      mockSessionModel.findOne.mockResolvedValue(mockSession);

      await expect(service.deactivateSession(sessionId, userId))
        .rejects.toThrow('Database error');
    });

    it('should handle empty sessionId', async () => {
      const sessionId = '';
      const userId = 'testUserId';

      mockSessionModel.findOne.mockResolvedValue(null);

      await expect(service.deactivateSession(sessionId, userId))
        .rejects.toThrow('Sesja nie została znaleziona');
    });

    it('should handle empty userId', async () => {
      const sessionId = 'testSessionId';
      const userId = '';

      mockSessionModel.findOne.mockResolvedValue(null);

      await expect(service.deactivateSession(sessionId, userId))
        .rejects.toThrow('Sesja nie została znaleziona');
    });
  });

  describe('deactivateAllUserSessions', () => {
    it('should deactivate all active sessions for a user', async () => {
      const userId = 'testUserId';
      const mockSessions = [
        {
          _id: 'session1',
          userId,
          isActive: true,
          ipAddress: '127.0.0.1',
          userAgent: 'test-agent-1',
          deviceInfo: { browser: 'Chrome' },
          logoutAt: undefined,
          save: jest.fn().mockResolvedValue(undefined),
          toString: () => 'session1',
        },
        {
          _id: 'session2',
          userId,
          isActive: true,
          ipAddress: '127.0.0.2',
          userAgent: 'test-agent-2',
          deviceInfo: { browser: 'Firefox' },
          logoutAt: undefined,
          save: jest.fn().mockResolvedValue(undefined),
          toString: () => 'session2',
        },
      ];

      mockSessionModel.find.mockResolvedValue(mockSessions);
      mockActivityLogModel.create.mockResolvedValue({});

      await service.deactivateAllUserSessions(userId);

      expect(mockSessionModel.find).toHaveBeenCalledWith({
        userId,
        isActive: true,
      });

      mockSessions.forEach(session => {
        expect(session.isActive).toBe(false);
        expect(session.logoutAt).toBeInstanceOf(Date);
        expect(session.save).toHaveBeenCalled();
      });

      expect(mockActivityLogModel.create).toHaveBeenCalledTimes(2);
      mockSessions.forEach(session => {
        expect(mockActivityLogModel.create).toHaveBeenCalledWith({
          userId: session.userId,
          activityType: ActivityType.SESSION_LOGOUT,
          ipAddress: session.ipAddress,
          userAgent: session.userAgent,
          deviceInfo: session.deviceInfo,
          details: 'Manual logout',
          status: undefined,
          metadata: {
            sessionId: session._id,
          },
        });
      });
    });

    it('should exclude specified session when exceptSessionId is provided', async () => {
      const userId = 'testUserId';
      const exceptSessionId = 'session1';
      const mockSessions = [
        {
          _id: 'session2',
          userId,
          isActive: true,
          ipAddress: '127.0.0.2',
          userAgent: 'test-agent-2',
          deviceInfo: { browser: 'Firefox' },
          logoutAt: undefined,
          save: jest.fn().mockResolvedValue(undefined),
          toString: () => 'session2',
        },
      ];

      mockSessionModel.find.mockResolvedValue(mockSessions);
      mockActivityLogModel.create.mockResolvedValue({});

      await service.deactivateAllUserSessions(userId, exceptSessionId);

      expect(mockSessionModel.find).toHaveBeenCalledWith({
        userId,
        isActive: true,
        _id: { $ne: exceptSessionId },
      });

      mockSessions.forEach(session => {
        expect(session.isActive).toBe(false);
        expect(session.logoutAt).toBeInstanceOf(Date);
        expect(session.save).toHaveBeenCalled();
      });
    });

    it('should handle user with no active sessions', async () => {
      const userId = 'testUserId';

      mockSessionModel.find.mockResolvedValue([]);
      
      await service.deactivateAllUserSessions(userId);

      expect(mockSessionModel.find).toHaveBeenCalledWith({
        userId,
        isActive: true,
      });
      expect(mockActivityLogModel.create).not.toHaveBeenCalled();
    });

    it('should handle database errors during session deactivation', async () => {
      const userId = 'testUserId';
      const mockSessions = [
        {
          _id: 'session1',
          userId,
          isActive: true,
          ipAddress: '127.0.0.1',
          userAgent: 'test-agent',
          deviceInfo: { browser: 'Chrome' },
          save: jest.fn().mockRejectedValue(new Error('Database error')),
        },
      ];

      mockSessionModel.find.mockResolvedValue(mockSessions);

      await expect(service.deactivateAllUserSessions(userId))
        .rejects.toThrow('Database error');
    });

    it('should handle empty userId', async () => {
      const userId = '';

      mockSessionModel.find.mockResolvedValue([]);

      await service.deactivateAllUserSessions(userId);

      expect(mockSessionModel.find).toHaveBeenCalledWith({
        userId,
        isActive: true,
      });
    });

    it('should handle database error during find operation', async () => {
      const userId = 'testUserId';

      mockSessionModel.find.mockRejectedValue(new Error('Database error'));

      await expect(service.deactivateAllUserSessions(userId))
        .rejects.toThrow('Database error');
    });
  });

  describe('getUserActiveSessions', () => {
    it('should return all active sessions for a user', async () => {
      const userId = 'testUserId';
      const currentDate = new Date();
      const mockSessions = [
        {
          _id: 'session1',
          userId,
          isActive: true,
          ipAddress: '127.0.0.1',
          userAgent: 'test-agent-1',
          deviceInfo: { browser: 'Chrome' },
          lastActivity: new Date(currentDate.getTime() + 3600000), // +1 hour
        },
        {
          _id: 'session2',
          userId,
          isActive: true,
          ipAddress: '127.0.0.2',
          userAgent: 'test-agent-2',
          deviceInfo: { browser: 'Firefox' },
          lastActivity: new Date(currentDate.getTime() + 7200000), // +2 hours
        },
      ];

      mockSessionModel.find.mockResolvedValue(mockSessions);

      const result = await service.getUserActiveSessions(userId);

      expect(mockSessionModel.find).toHaveBeenCalledWith({
        userId,
        isActive: true,
        expiresAt: { $gt: expect.any(Date) },
      });
      expect(result).toEqual(mockSessions);
    });

    it('should return empty array when user has no active sessions', async () => {
      const userId = 'testUserId';

      mockSessionModel.find.mockResolvedValue([]);

      const result = await service.getUserActiveSessions(userId);

      expect(mockSessionModel.find).toHaveBeenCalledWith({
        userId,
        isActive: true,
        expiresAt: { $gt: expect.any(Date) },
      });
      expect(result).toEqual([]);
    });

    it('should handle database errors', async () => {
      const userId = 'testUserId';
      const error = new Error('Database error');

      mockSessionModel.find.mockRejectedValue(error);

      await expect(service.getUserActiveSessions(userId))
        .rejects.toThrow('Database error');
    });

    it('should handle empty userId', async () => {
      const userId = '';

      mockSessionModel.find.mockResolvedValue([]);

      const result = await service.getUserActiveSessions(userId);

      expect(mockSessionModel.find).toHaveBeenCalledWith({
        userId,
        isActive: true,
        expiresAt: { $gt: expect.any(Date) },
      });
      expect(result).toEqual([]);
    });

    it('should only return active sessions', async () => {
      const userId = 'testUserId';
      const currentDate = new Date();
      const mockSessions = [
        {
          _id: 'session1',
          userId,
          isActive: true,
          ipAddress: '127.0.0.1',
          userAgent: 'test-agent-1',
          deviceInfo: { browser: 'Chrome' },
          lastActivity: new Date(currentDate.getTime() + 3600000), // +1 hour
        },
        {
          _id: 'session2',
          userId,
          isActive: false, // nieaktywna sesja
          ipAddress: '127.0.0.2',
          userAgent: 'test-agent-2',
          deviceInfo: { browser: 'Firefox' },
          lastActivity: new Date(currentDate.getTime() + 3600000),
        },
      ];

      // Symulujemy, że MongoDB już odfiltrował nieaktywne sesje
      const activeSessions = [mockSessions[0]];
      mockSessionModel.find.mockResolvedValue(activeSessions);

      const result = await service.getUserActiveSessions(userId);

      expect(mockSessionModel.find).toHaveBeenCalledWith({
        userId,
        isActive: true,
        expiresAt: { $gt: expect.any(Date) },
      });
      expect(result).toEqual(activeSessions);
      expect(result.length).toBe(1);
      expect(result[0].isActive).toBe(true);
    });
  });

  describe('cleanupExpiredSessions', () => {
    it('should deactivate all expired sessions and log activity', async () => {
      const currentDate = new Date();
      const mockExpiredSessions = [
        {
          _id: 'session1',
          userId: 'user1',
          isActive: true,
          ipAddress: '127.0.0.1',
          userAgent: 'test-agent-1',
          deviceInfo: { browser: 'Chrome' },
          expiresAt: new Date(currentDate.getTime() - 3600000), // -1 hour
          save: jest.fn().mockResolvedValue(undefined),
          toString: () => 'session1',
        },
        {
          _id: 'session2',
          userId: 'user2',
          isActive: true,
          ipAddress: '127.0.0.2',
          userAgent: 'test-agent-2',
          deviceInfo: { browser: 'Firefox' },
          expiresAt: new Date(currentDate.getTime() - 7200000), // -2 hours
          save: jest.fn().mockResolvedValue(undefined),
          toString: () => 'session2',
        },
      ];

      mockSessionModel.find.mockResolvedValue(mockExpiredSessions);
      mockActivityLogModel.create.mockResolvedValue({});

      await service.cleanupExpiredSessions();

      expect(mockSessionModel.find).toHaveBeenCalledWith({
        isActive: true,
        expiresAt: { $lt: expect.any(Date) },
      });

      mockExpiredSessions.forEach(session => {
        expect(session.isActive).toBe(false);
        expect(session.save).toHaveBeenCalled();
      });

      expect(mockActivityLogModel.create).toHaveBeenCalledTimes(2);
      
      // Sprawdzamy pierwsze wywołanie
      expect(mockActivityLogModel.create).toHaveBeenNthCalledWith(1, {
        userId: mockExpiredSessions[0].userId,
        activityType: ActivityType.SESSION_EXPIRED,
        ipAddress: mockExpiredSessions[0].ipAddress,
        userAgent: mockExpiredSessions[0].userAgent,
        deviceInfo: mockExpiredSessions[0].deviceInfo,
        details: 'Session expired',
        status: undefined,
        metadata: {
          sessionId: mockExpiredSessions[0]._id,
        },
      });

      // Sprawdzamy drugie wywołanie
      expect(mockActivityLogModel.create).toHaveBeenNthCalledWith(2, {
        userId: mockExpiredSessions[1].userId,
        activityType: ActivityType.SESSION_EXPIRED,
        ipAddress: mockExpiredSessions[1].ipAddress,
        userAgent: mockExpiredSessions[1].userAgent,
        deviceInfo: mockExpiredSessions[1].deviceInfo,
        details: 'Session expired',
        status: undefined,
        metadata: {
          sessionId: mockExpiredSessions[1]._id,
        },
      });
    });

    it('should handle no expired sessions', async () => {
      mockSessionModel.find.mockResolvedValue([]);
      
      await service.cleanupExpiredSessions();

      expect(mockSessionModel.find).toHaveBeenCalledWith({
        isActive: true,
        expiresAt: { $lt: expect.any(Date) },
      });
      expect(mockActivityLogModel.create).not.toHaveBeenCalled();
    });

    it('should handle database errors during find operation', async () => {
      const error = new Error('Database error');
      mockSessionModel.find.mockRejectedValue(error);

      await expect(service.cleanupExpiredSessions())
        .rejects.toThrow('Database error');
    });

    it('should handle database errors during session save', async () => {
      const mockExpiredSessions = [
        {
          _id: 'session1',
          userId: 'user1',
          isActive: true,
          ipAddress: '127.0.0.1',
          userAgent: 'test-agent',
          deviceInfo: { browser: 'Chrome' },
          save: jest.fn().mockRejectedValue(new Error('Database error')),
        },
      ];

      mockSessionModel.find.mockResolvedValue(mockExpiredSessions);

      await expect(service.cleanupExpiredSessions())
        .rejects.toThrow('Database error');
    });

    it('should handle database errors during activity logging', async () => {
      const mockExpiredSessions = [
        {
          _id: 'session1',
          userId: 'user1',
          isActive: true,
          ipAddress: '127.0.0.1',
          userAgent: 'test-agent',
          deviceInfo: { browser: 'Chrome' },
          save: jest.fn().mockResolvedValue(undefined),
          toString: () => 'session1',
        },
      ];

      mockSessionModel.find.mockResolvedValue(mockExpiredSessions);
      mockActivityLogModel.create.mockRejectedValue(new Error('Database error'));

      await expect(service.cleanupExpiredSessions())
        .rejects.toThrow('Database error');
    });

    it('should process sessions in batches if there are many', async () => {
      const mockExpiredSessions = Array(100).fill(null).map((_, index) => ({
        _id: `session${index}`,
        userId: `user${index}`,
        isActive: true,
        ipAddress: '127.0.0.1',
        userAgent: 'test-agent',
        deviceInfo: { browser: 'Chrome' },
        save: jest.fn().mockResolvedValue(undefined),
        toString: () => `session${index}`,
      }));

      mockSessionModel.find.mockResolvedValue(mockExpiredSessions);
      mockActivityLogModel.create.mockResolvedValue({});

      await service.cleanupExpiredSessions();

      expect(mockActivityLogModel.create).toHaveBeenCalledTimes(100);
      mockExpiredSessions.forEach(session => {
        expect(session.isActive).toBe(false);
        expect(session.save).toHaveBeenCalled();
      });
    });
  });

  describe('logActivity', () => {
    it('should create activity log with all provided data', async () => {
      const userId = 'testUserId';
      const activityType = ActivityType.LOGIN;
      const details = {
        ipAddress: '127.0.0.1',
        userAgent: 'test-agent',
        deviceInfo: { browser: 'Chrome' },
        reason: 'Test activity',
        status: 'success',
        metadata: { key: 'value' }
      };

      const expectedData = {
        userId,
        activityType,
        ipAddress: details.ipAddress,
        userAgent: details.userAgent,
        deviceInfo: details.deviceInfo,
        details: details.reason,
        status: details.status,
        metadata: {
          ...details.metadata
        }
      };

      mockActivityLogModel.create.mockResolvedValue(expectedData);

      const result = await service.logActivity(userId, activityType, details);

      expect(mockActivityLogModel.create).toHaveBeenCalledWith(expectedData);
      expect(result).toEqual(expectedData);
    });

    it('should create activity log with minimal required data', async () => {
      const userId = 'testUserId';
      const activityType = ActivityType.LOGIN;
      const details = {
        ipAddress: '127.0.0.1'
      };

      const expectedData = {
        userId,
        activityType,
        ipAddress: details.ipAddress,
        userAgent: undefined,
        deviceInfo: undefined,
        details: undefined,
        status: undefined,
        metadata: {}
      };

      mockActivityLogModel.create.mockResolvedValue(expectedData);

      const result = await service.logActivity(userId, activityType, details);

      expect(mockActivityLogModel.create).toHaveBeenCalledWith(expectedData);
      expect(result).toEqual(expectedData);
    });

    it('should handle database errors during activity logging', async () => {
      const userId = 'testUserId';
      const activityType = ActivityType.LOGIN;
      const details = {
        ipAddress: '127.0.0.1'
      };

      mockActivityLogModel.create.mockRejectedValue(new Error('Database error'));

      await expect(service.logActivity(userId, activityType, details))
        .rejects.toThrow('Database error');
    });

    it('should handle empty userId', async () => {
      const userId = '';
      const activityType = ActivityType.LOGIN;
      const details = {
        ipAddress: '127.0.0.1'
      };

      await expect(service.logActivity(userId, activityType, details))
        .rejects.toThrow('UserId is required');
    });

    it('should handle invalid activity type', async () => {
      const userId = 'testUserId';
      const activityType = 'INVALID_TYPE' as ActivityType;
      const details = {
        ipAddress: '127.0.0.1'
      };

      await expect(service.logActivity(userId, activityType, details))
        .rejects.toThrow('Invalid activity type');
    });

    it('should handle large metadata objects', async () => {
      const userId = 'testUserId';
      const activityType = ActivityType.LOGIN;
      const largeMetadata = {};
      for (let i = 0; i < 1000; i++) {
        largeMetadata[`key${i}`] = `value${i}`;
      }

      const details = {
        ipAddress: '127.0.0.1',
        metadata: largeMetadata
      };

      const expectedData = {
        userId,
        activityType,
        ipAddress: details.ipAddress,
        userAgent: undefined,
        deviceInfo: undefined,
        details: undefined,
        status: undefined,
        metadata: largeMetadata
      };

      mockActivityLogModel.create.mockResolvedValue(expectedData);

      const result = await service.logActivity(userId, activityType, details);

      expect(mockActivityLogModel.create).toHaveBeenCalledWith(expectedData);
      expect(result.metadata).toEqual(largeMetadata);
    });
  });

  describe('getActivityHistory', () => {
    it('should return activity history with default options', async () => {
      const userId = 'testUserId';
      const mockActivities = [
        { _id: 'activity1', userId, activityType: ActivityType.LOGIN },
        { _id: 'activity2', userId, activityType: ActivityType.SESSION_ACTIVITY }
      ];
      const mockTotal = 2;

      mockActivityLogModel.find.mockReturnValue({
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue(mockActivities)
      });
      mockActivityLogModel.countDocuments.mockResolvedValue(mockTotal);

      const result = await service.getActivityHistory(userId);

      expect(mockActivityLogModel.find).toHaveBeenCalledWith({ userId });
      expect(mockActivityLogModel.countDocuments).toHaveBeenCalledWith({ userId });
      expect(result).toEqual({
        activities: mockActivities,
        total: mockTotal,
        hasMore: false
      });
    });

    it('should apply pagination options correctly', async () => {
      const userId = 'testUserId';
      const options = {
        limit: 5,
        skip: 10
      };
      const mockActivities = Array(5).fill(null).map((_, i) => ({
        _id: `activity${i + 11}`,
        userId,
        activityType: ActivityType.LOGIN
      }));
      const mockTotal = 20;

      mockActivityLogModel.find.mockReturnValue({
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue(mockActivities)
      });
      mockActivityLogModel.countDocuments.mockResolvedValue(mockTotal);

      const result = await service.getActivityHistory(userId, options);

      const findQuery = mockActivityLogModel.find.mock.calls[0][0];
      const findInstance = mockActivityLogModel.find.mock.results[0].value;

      expect(findQuery).toEqual({ userId });
      expect(findInstance.skip).toHaveBeenCalledWith(options.skip);
      expect(findInstance.limit).toHaveBeenCalledWith(options.limit);
      expect(result).toEqual({
        activities: mockActivities,
        total: mockTotal,
        hasMore: true
      });
    });

    it('should filter by activity type', async () => {
      const userId = 'testUserId';
      const options = {
        activityType: ActivityType.LOGIN
      };
      const mockActivities = [
        { _id: 'activity1', userId, activityType: ActivityType.LOGIN }
      ];
      const mockTotal = 1;

      mockActivityLogModel.find.mockReturnValue({
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue(mockActivities)
      });
      mockActivityLogModel.countDocuments.mockResolvedValue(mockTotal);

      const result = await service.getActivityHistory(userId, options);

      expect(mockActivityLogModel.find).toHaveBeenCalledWith({
        userId,
        activityType: ActivityType.LOGIN
      });
      expect(result.activities).toEqual(mockActivities);
    });

    it('should filter by date range', async () => {
      const userId = 'testUserId';
      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-01-02');
      const options = { startDate, endDate };
      const mockActivities = [
        { _id: 'activity1', userId, createdAt: new Date('2024-01-01T12:00:00') }
      ];
      const mockTotal = 1;

      mockActivityLogModel.find.mockReturnValue({
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue(mockActivities)
      });
      mockActivityLogModel.countDocuments.mockResolvedValue(mockTotal);

      const result = await service.getActivityHistory(userId, options);

      expect(mockActivityLogModel.find).toHaveBeenCalledWith({
        userId,
        createdAt: {
          $gte: startDate,
          $lte: endDate
        }
      });
      expect(result.activities).toEqual(mockActivities);
    });

    it('should handle empty results', async () => {
      const userId = 'testUserId';
      const mockActivities = [];
      const mockTotal = 0;

      mockActivityLogModel.find.mockReturnValue({
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue(mockActivities)
      });
      mockActivityLogModel.countDocuments.mockResolvedValue(mockTotal);

      const result = await service.getActivityHistory(userId);

      expect(result).toEqual({
        activities: [],
        total: 0,
        hasMore: false
      });
    });

    it('should handle database errors', async () => {
      const userId = 'testUserId';
      const error = new Error('Database error');

      mockActivityLogModel.find.mockReturnValue({
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        exec: jest.fn().mockRejectedValue(error)
      });

      await expect(service.getActivityHistory(userId))
        .rejects.toThrow('Database error');
    });

    it('should handle partial date range (only startDate)', async () => {
      const userId = 'testUserId';
      const startDate = new Date('2024-01-01');
      const options = { startDate };
      const mockActivities = [
        { _id: 'activity1', userId, createdAt: new Date('2024-01-01T12:00:00') }
      ];
      const mockTotal = 1;

      mockActivityLogModel.find.mockReturnValue({
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue(mockActivities)
      });
      mockActivityLogModel.countDocuments.mockResolvedValue(mockTotal);

      const result = await service.getActivityHistory(userId, options);

      expect(mockActivityLogModel.find).toHaveBeenCalledWith({
        userId,
        createdAt: {
          $gte: startDate
        }
      });
      expect(result.activities).toEqual(mockActivities);
    });

    it('should handle partial date range (only endDate)', async () => {
      const userId = 'testUserId';
      const endDate = new Date('2024-01-02');
      const options = { endDate };
      const mockActivities = [
        { _id: 'activity1', userId, createdAt: new Date('2024-01-01T12:00:00') }
      ];
      const mockTotal = 1;

      mockActivityLogModel.find.mockReturnValue({
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue(mockActivities)
      });
      mockActivityLogModel.countDocuments.mockResolvedValue(mockTotal);

      const result = await service.getActivityHistory(userId, options);

      expect(mockActivityLogModel.find).toHaveBeenCalledWith({
        userId,
        createdAt: {
          $lte: endDate
        }
      });
      expect(result.activities).toEqual(mockActivities);
    });
  });

  describe('detectSuspiciousActivity', () => {
    it('should detect new device and log security alert', async () => {
      const userId = 'testUserId';
      const ipAddress = '192.168.1.1';
      const userAgent = 'new-device-agent';
      const mockRecentSessions = [
        {
          userId,
          ipAddress: '127.0.0.1',
          userAgent: 'existing-device-agent',
          isActive: true,
        }
      ];

      mockSessionModel.find.mockResolvedValue(mockRecentSessions);
      mockActivityLogModel.create.mockResolvedValue({});

      const result = await service.detectSuspiciousActivity(userId, ipAddress, userAgent);

      expect(mockSessionModel.find).toHaveBeenCalledWith({
        userId,
        isActive: true,
        createdAt: { $gte: expect.any(Date) }
      });
      expect(result).toBe(true);
      expect(mockActivityLogModel.create).toHaveBeenCalledWith({
        userId,
        activityType: ActivityType.SECURITY_ALERT,
        ipAddress,
        userAgent,
        status: 'Wykryto logowanie z nowego urządzenia',
        metadata: {
          existingSessions: mockRecentSessions.length
        }
      });
    });

    it('should not detect suspicious activity for known device', async () => {
      const userId = 'testUserId';
      const ipAddress = '127.0.0.1';
      const userAgent = 'existing-device-agent';
      const mockRecentSessions = [
        {
          userId,
          ipAddress,
          userAgent,
          isActive: true,
        }
      ];

      mockSessionModel.find.mockResolvedValue(mockRecentSessions);

      const result = await service.detectSuspiciousActivity(userId, ipAddress, userAgent);

      expect(result).toBe(false);
      expect(mockActivityLogModel.create).not.toHaveBeenCalled();
    });

    it('should handle user with no recent sessions', async () => {
      const userId = 'testUserId';
      const ipAddress = '192.168.1.1';
      const userAgent = 'new-device-agent';

      mockSessionModel.find.mockResolvedValue([]);
      mockActivityLogModel.create.mockResolvedValue({});

      const result = await service.detectSuspiciousActivity(userId, ipAddress, userAgent);

      expect(result).toBe(true);
      expect(mockActivityLogModel.create).toHaveBeenCalledWith({
        userId,
        activityType: ActivityType.SECURITY_ALERT,
        ipAddress,
        userAgent,
        status: 'Wykryto logowanie z nowego urządzenia',
        metadata: {
          existingSessions: 0
        }
      });
    });

    it('should handle database errors during session search', async () => {
      const userId = 'testUserId';
      const ipAddress = '192.168.1.1';
      const userAgent = 'new-device-agent';

      mockSessionModel.find.mockRejectedValue(new Error('Database error'));

      await expect(service.detectSuspiciousActivity(userId, ipAddress, userAgent))
        .rejects.toThrow('Database error');
    });

    it('should handle database errors during activity logging', async () => {
      const userId = 'testUserId';
      const ipAddress = '192.168.1.1';
      const userAgent = 'new-device-agent';

      mockSessionModel.find.mockResolvedValue([]);
      mockActivityLogModel.create.mockRejectedValue(new Error('Database error'));

      await expect(service.detectSuspiciousActivity(userId, ipAddress, userAgent))
        .rejects.toThrow('Database error');
    });

    it('should handle multiple existing sessions', async () => {
      const userId = 'testUserId';
      const ipAddress = '192.168.1.1';
      const userAgent = 'new-device-agent';
      const mockRecentSessions = [
        {
          userId,
          ipAddress: '127.0.0.1',
          userAgent: 'device-1',
          isActive: true,
        },
        {
          userId,
          ipAddress: '127.0.0.2',
          userAgent: 'device-2',
          isActive: true,
        }
      ];

      mockSessionModel.find.mockResolvedValue(mockRecentSessions);
      mockActivityLogModel.create.mockResolvedValue({});

      const result = await service.detectSuspiciousActivity(userId, ipAddress, userAgent);

      expect(result).toBe(true);
      expect(mockActivityLogModel.create).toHaveBeenCalledWith({
        userId,
        activityType: ActivityType.SECURITY_ALERT,
        ipAddress,
        userAgent,
        status: 'Wykryto logowanie z nowego urządzenia',
        metadata: {
          existingSessions: mockRecentSessions.length
        }
      });
    });

    it('should match device by both IP and user agent', async () => {
      const userId = 'testUserId';
      const ipAddress = '127.0.0.1';
      const userAgent = 'existing-device-agent';
      const mockRecentSessions = [
        // Sesja z tym samym IP, ale innym user agent
        {
          userId,
          ipAddress,
          userAgent: 'different-agent',
          isActive: true,
        },
        // Sesja z tym samym user agent, ale innym IP
        {
          userId,
          ipAddress: '192.168.1.1',
          userAgent,
          isActive: true,
        }
      ];

      mockSessionModel.find.mockResolvedValue(mockRecentSessions);
      mockActivityLogModel.create.mockResolvedValue({});

      const result = await service.detectSuspiciousActivity(userId, ipAddress, userAgent);

      expect(result).toBe(true);
      expect(mockActivityLogModel.create).toHaveBeenCalled();
    });
  });
}); 