import { Test, TestingModule } from '@nestjs/testing';
import { TokenBlacklistService } from '../services/token-blacklist.service';
import { getModelToken } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { BlacklistedToken, BlacklistedTokenDocument } from '../entities/blacklisted-token.entity';
import { JwtService } from '@nestjs/jwt';
import { BadRequestException } from '@nestjs/common';

describe('TokenBlacklistService', () => {
  let service: TokenBlacklistService;
  let blacklistedTokenModel: Model<BlacklistedTokenDocument>;
  let jwtService: JwtService;

  const mockBlacklistedTokenModel = {
    create: jest.fn(),
    findOne: jest.fn(),
    deleteMany: jest.fn(),
    exec: jest.fn(),
  };

  const mockJwtService = {
    decode: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TokenBlacklistService,
        {
          provide: getModelToken(BlacklistedToken.name),
          useValue: mockBlacklistedTokenModel,
        },
        {
          provide: JwtService,
          useValue: mockJwtService,
        },
      ],
    }).compile();

    service = module.get<TokenBlacklistService>(TokenBlacklistService);
    blacklistedTokenModel = module.get<Model<BlacklistedTokenDocument>>(
      getModelToken(BlacklistedToken.name),
    );
    jwtService = module.get<JwtService>(JwtService);

    // Reset all mocks before each test
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('blacklistToken', () => {
    it('should add valid token to blacklist', async () => {
      const token = 'valid-token';
      const decodedToken = {
        exp: Math.floor(Date.now() / 1000) + 3600, // token wygasa za godzinę
      };

      mockJwtService.decode.mockReturnValue(decodedToken);
      mockBlacklistedTokenModel.create.mockResolvedValue({ token });

      await service.blacklistToken(token);

      expect(mockJwtService.decode).toHaveBeenCalledWith(token);
      expect(mockBlacklistedTokenModel.create).toHaveBeenCalledWith({
        token,
        expiresAt: expect.any(Date),
      });
    });

    it('should throw BadRequestException for invalid JWT format', async () => {
      const token = 'invalid-token';
      mockJwtService.decode.mockReturnValue(null);

      await expect(service.blacklistToken(token)).rejects.toThrow(
        BadRequestException,
      );
      expect(mockJwtService.decode).toHaveBeenCalledWith(token);
      expect(mockBlacklistedTokenModel.create).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException for token without expiration', async () => {
      const token = 'token-without-exp';
      const decodedToken = { sub: 'user123' };

      mockJwtService.decode.mockReturnValue(decodedToken);

      await expect(service.blacklistToken(token)).rejects.toThrow(
        BadRequestException,
      );
      expect(mockBlacklistedTokenModel.create).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException for expired token', async () => {
      const token = 'expired-token';
      const decodedToken = {
        exp: Math.floor(Date.now() / 1000) - 3600, // token wygasł godzinę temu
      };

      mockJwtService.decode.mockReturnValue(decodedToken);

      await expect(service.blacklistToken(token)).rejects.toThrow(
        BadRequestException,
      );
      expect(mockBlacklistedTokenModel.create).not.toHaveBeenCalled();
    });

    it('should handle duplicate token gracefully', async () => {
      const token = 'duplicate-token';
      const decodedToken = {
        exp: Math.floor(Date.now() / 1000) + 3600,
      };

      mockJwtService.decode.mockReturnValue(decodedToken);
      mockBlacklistedTokenModel.create.mockRejectedValue({ code: 11000 }); // MongoDB duplicate key error

      await service.blacklistToken(token);

      expect(mockBlacklistedTokenModel.create).toHaveBeenCalled();
    });

    it('should throw error for database failures', async () => {
      const token = 'valid-token';
      const decodedToken = {
        exp: Math.floor(Date.now() / 1000) + 3600,
      };

      mockJwtService.decode.mockReturnValue(decodedToken);
      mockBlacklistedTokenModel.create.mockRejectedValue(new Error('Database error'));

      await expect(service.blacklistToken(token)).rejects.toThrow('Database error');
    });
  });

  describe('isBlacklisted', () => {
    it('should return true for blacklisted token', async () => {
      const token = 'blacklisted-token';
      mockBlacklistedTokenModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue({ token }),
      });

      const result = await service.isBlacklisted(token);

      expect(result).toBe(true);
      expect(mockBlacklistedTokenModel.findOne).toHaveBeenCalledWith({ token });
    });

    it('should return false for non-blacklisted token', async () => {
      const token = 'non-blacklisted-token';
      mockBlacklistedTokenModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      });

      const result = await service.isBlacklisted(token);

      expect(result).toBe(false);
      expect(mockBlacklistedTokenModel.findOne).toHaveBeenCalledWith({ token });
    });

    it('should handle database errors', async () => {
      const token = 'test-token';
      mockBlacklistedTokenModel.findOne.mockReturnValue({
        exec: jest.fn().mockRejectedValue(new Error('Database error')),
      });

      await expect(service.isBlacklisted(token)).rejects.toThrow('Database error');
    });

    it('should handle empty token', async () => {
      const token = '';
      mockBlacklistedTokenModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      });

      const result = await service.isBlacklisted(token);

      expect(result).toBe(false);
      expect(mockBlacklistedTokenModel.findOne).toHaveBeenCalledWith({ token });
    });
  });

  describe('cleanupExpiredTokens', () => {
    it('should remove expired tokens', async () => {
      mockBlacklistedTokenModel.deleteMany.mockReturnValue({
        exec: jest.fn().mockResolvedValue({ deletedCount: 5 }),
      });

      await service.cleanupExpiredTokens();

      expect(mockBlacklistedTokenModel.deleteMany).toHaveBeenCalledWith({
        expiresAt: { $lt: expect.any(Date) },
      });
    });

    it('should handle database errors during cleanup', async () => {
      mockBlacklistedTokenModel.deleteMany.mockReturnValue({
        exec: jest.fn().mockRejectedValue(new Error('Database error')),
      });

      await expect(service.cleanupExpiredTokens()).rejects.toThrow('Database error');
    });

    it('should handle empty result', async () => {
      mockBlacklistedTokenModel.deleteMany.mockReturnValue({
        exec: jest.fn().mockResolvedValue({ deletedCount: 0 }),
      });

      await service.cleanupExpiredTokens();

      expect(mockBlacklistedTokenModel.deleteMany).toHaveBeenCalled();
    });
  });
}); 