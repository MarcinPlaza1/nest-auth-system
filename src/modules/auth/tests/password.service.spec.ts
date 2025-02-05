import { Test, TestingModule } from '@nestjs/testing';
import { PasswordService } from '../services/password.service';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';

describe('PasswordService', () => {
  let service: PasswordService;
  let configService: ConfigService;

  const mockConfigService = {
    get: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PasswordService,
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    service = module.get<PasswordService>(PasswordService);
    configService = module.get<ConfigService>(ConfigService);

    // Reset all mocks before each test
    jest.clearAllMocks();
    
    // Domyślna konfiguracja
    mockConfigService.get.mockImplementation((key: string) => {
      switch (key) {
        case 'password.saltRounds':
          return 10;
        case 'password.minLength':
          return 8;
        case 'password.requireUppercase':
          return true;
        case 'password.requireLowercase':
          return true;
        case 'password.requireNumbers':
          return true;
        case 'password.requireSpecialChars':
          return true;
        default:
          return undefined;
      }
    });
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('hashPassword', () => {
    it('should hash password correctly', async () => {
      const password = 'TestPassword123!';
      const hashedPassword = await service.hashPassword(password);

      expect(hashedPassword).toBeDefined();
      expect(hashedPassword).not.toBe(password);
      expect(await bcrypt.compare(password, hashedPassword)).toBe(true);
    });

    it('should use correct salt rounds from config', async () => {
      const password = 'TestPassword123!';
      const bcryptSpy = jest.spyOn(bcrypt, 'hash');

      await service.hashPassword(password);

      expect(bcryptSpy).toHaveBeenCalledWith(password, 10);
    });

    it('should handle empty password', async () => {
      await expect(service.hashPassword('')).rejects.toThrow();
    });

    it('should handle undefined password', async () => {
      await expect(service.hashPassword(undefined)).rejects.toThrow();
    });
  });

  describe('validatePassword', () => {
    it('should validate correct password', async () => {
      const password = 'TestPassword123!';
      const hashedPassword = await bcrypt.hash(password, 10);

      const isValid = await service.validatePassword(password, hashedPassword);
      expect(isValid).toBe(true);
    });

    it('should reject incorrect password', async () => {
      const password = 'TestPassword123!';
      const wrongPassword = 'WrongPassword123!';
      const hashedPassword = await bcrypt.hash(password, 10);

      const isValid = await service.validatePassword(wrongPassword, hashedPassword);
      expect(isValid).toBe(false);
    });

    it('should handle empty password', async () => {
      const hashedPassword = await bcrypt.hash('somepassword', 10);
      const isValid = await service.validatePassword('', hashedPassword);
      expect(isValid).toBe(false);
    });

    it('should handle empty hash', async () => {
      const isValid = await service.validatePassword('password', '');
      expect(isValid).toBe(false);
    });

    it('should handle invalid hash format', async () => {
      const isValid = await service.validatePassword('password', 'invalid-hash');
      expect(isValid).toBe(false);
    });
  });

  describe('validatePasswordStrength', () => {
    it('should accept strong password', () => {
      const password = 'TestPassword123!';
      const result = service.validatePasswordStrength(password);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject password that is too short', () => {
      const password = 'Test1!';
      const result = service.validatePasswordStrength(password);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Password must be at least 8 characters long');
    });

    it('should reject password without uppercase letters', () => {
      const password = 'testpassword123!';
      const result = service.validatePasswordStrength(password);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Password must contain at least one uppercase letter');
    });

    it('should reject password without lowercase letters', () => {
      const password = 'TESTPASSWORD123!';
      const result = service.validatePasswordStrength(password);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Password must contain at least one lowercase letter');
    });

    it('should reject password without numbers', () => {
      const password = 'TestPassword!';
      const result = service.validatePasswordStrength(password);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Password must contain at least one number');
    });

    it('should reject password without special characters', () => {
      const password = 'TestPassword123';
      const result = service.validatePasswordStrength(password);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Password must contain at least one special character');
    });

    it('should handle empty password', () => {
      const result = service.validatePasswordStrength('');
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Password must be at least 8 characters long');
    });

    it('should handle undefined password', () => {
      const result = service.validatePasswordStrength(undefined);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Password is required');
    });

    it('should respect config settings', () => {
      mockConfigService.get.mockImplementation((key: string) => {
        switch (key) {
          case 'password.minLength':
            return 6;
          case 'password.requireUppercase':
            return false;
          case 'password.requireLowercase':
            return false;
          case 'password.requireNumbers':
            return false;
          case 'password.requireSpecialChars':
            return false;
          default:
            return undefined;
        }
      });

      const password = 'simple';
      const result = service.validatePasswordStrength(password);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });

  describe('generateTemporaryPassword', () => {
    it('should generate valid temporary password', () => {
      const tempPassword = service.generateTemporaryPassword();
      const validation = service.validatePasswordStrength(tempPassword);
      
      expect(validation.isValid).toBe(true);
      expect(tempPassword).toMatch(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^\da-zA-Z]).{8,}$/);
    });

    it('should generate unique passwords', () => {
      const passwords = new Set();
      for (let i = 0; i < 100; i++) {
        passwords.add(service.generateTemporaryPassword());
      }
      expect(passwords.size).toBe(100);
    });

    it('should generate password with correct length', () => {
      const tempPassword = service.generateTemporaryPassword();
      expect(tempPassword.length).toBeGreaterThanOrEqual(8);
    });
  });
}); 