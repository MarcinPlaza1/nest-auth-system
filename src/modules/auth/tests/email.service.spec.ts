import { Test, TestingModule } from '@nestjs/testing';
import { EmailService } from '../services/email.service';
import { ConfigService } from '@nestjs/config';
import { MailerService } from '@nestjs-modules/mailer';

describe('EmailService', () => {
  let service: EmailService;
  let mailerService: MailerService;
  let configService: ConfigService;

  const mockMailerService = {
    sendMail: jest.fn(),
  };

  const mockConfigService = {
    get: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EmailService,
        {
          provide: MailerService,
          useValue: mockMailerService,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    service = module.get<EmailService>(EmailService);
    mailerService = module.get<MailerService>(MailerService);
    configService = module.get<ConfigService>(ConfigService);

    // Reset all mocks before each test
    jest.clearAllMocks();

    // Domyślna konfiguracja
    mockConfigService.get.mockImplementation((key: string) => {
      switch (key) {
        case 'email.from':
          return 'noreply@example.com';
        case 'email.supportEmail':
          return 'support@example.com';
        case 'app.name':
          return 'Test App';
        case 'app.url':
          return 'http://localhost:3000';
        default:
          return undefined;
      }
    });
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('sendWelcomeEmail', () => {
    it('should send welcome email successfully', async () => {
      const email = 'test@example.com';
      const name = 'Test User';

      mockMailerService.sendMail.mockResolvedValue(true);

      await service.sendWelcomeEmail(email, name);

      expect(mockMailerService.sendMail).toHaveBeenCalledWith({
        to: email,
        subject: 'Witaj w Test App!',
        template: 'welcome',
        context: {
          name,
          appName: 'Test App',
          supportEmail: 'support@example.com',
        },
      });
    });

    it('should handle mailer service error', async () => {
      const email = 'test@example.com';
      const name = 'Test User';

      mockMailerService.sendMail.mockRejectedValue(new Error('Failed to send email'));

      await expect(service.sendWelcomeEmail(email, name))
        .rejects.toThrow('Failed to send email');
    });

    it('should handle empty email address', async () => {
      const email = '';
      const name = 'Test User';

      await expect(service.sendWelcomeEmail(email, name))
        .rejects.toThrow('Email address is required');
    });
  });

  describe('sendPasswordResetEmail', () => {
    it('should send password reset email successfully', async () => {
      const email = 'test@example.com';
      const token = 'reset-token-123';

      mockMailerService.sendMail.mockResolvedValue(true);

      await service.sendPasswordResetEmail(email, token);

      expect(mockMailerService.sendMail).toHaveBeenCalledWith({
        to: email,
        subject: 'Reset hasła',
        template: 'password-reset',
        context: {
          resetLink: 'http://localhost:3000/reset-password?token=' + token,
          appName: 'Test App',
          supportEmail: 'support@example.com',
        },
      });
    });

    it('should handle mailer service error', async () => {
      const email = 'test@example.com';
      const token = 'reset-token-123';

      mockMailerService.sendMail.mockRejectedValue(new Error('Failed to send email'));

      await expect(service.sendPasswordResetEmail(email, token))
        .rejects.toThrow('Failed to send email');
    });

    it('should handle empty token', async () => {
      const email = 'test@example.com';
      const token = '';

      await expect(service.sendPasswordResetEmail(email, token))
        .rejects.toThrow('Reset token is required');
    });
  });

  describe('sendEmailVerification', () => {
    it('should send verification email successfully', async () => {
      const email = 'test@example.com';
      const token = 'verification-token-123';

      mockMailerService.sendMail.mockResolvedValue(true);

      await service.sendEmailVerification(email, token);

      expect(mockMailerService.sendMail).toHaveBeenCalledWith({
        to: email,
        subject: 'Zweryfikuj swój adres email',
        template: 'email-verification',
        context: {
          verificationLink: 'http://localhost:3000/verify-email?token=' + token,
          appName: 'Test App',
          supportEmail: 'support@example.com',
        },
      });
    });

    it('should handle mailer service error', async () => {
      const email = 'test@example.com';
      const token = 'verification-token-123';

      mockMailerService.sendMail.mockRejectedValue(new Error('Failed to send email'));

      await expect(service.sendEmailVerification(email, token))
        .rejects.toThrow('Failed to send email');
    });

    it('should handle invalid email format', async () => {
      const email = 'invalid-email';
      const token = 'verification-token-123';

      await expect(service.sendEmailVerification(email, token))
        .rejects.toThrow('Invalid email format');
    });
  });

  describe('sendSecurityAlert', () => {
    it('should send security alert email successfully', async () => {
      const email = 'test@example.com';
      const alertType = 'new-device-login';
      const details = {
        device: 'Chrome on Windows',
        location: 'Warsaw, Poland',
        ip: '192.168.1.1',
        time: new Date().toISOString(),
      };

      mockMailerService.sendMail.mockResolvedValue(true);

      await service.sendSecurityAlert(email, alertType, details);

      expect(mockMailerService.sendMail).toHaveBeenCalledWith({
        to: email,
        subject: 'Alert bezpieczeństwa',
        template: 'security-alert',
        context: {
          alertType,
          details,
          appName: 'Test App',
          supportEmail: 'support@example.com',
        },
      });
    });

    it('should handle different alert types', async () => {
      const email = 'test@example.com';
      const alertTypes = ['new-device-login', 'password-changed', 'failed-login-attempts'];
      const details = { time: new Date().toISOString() };

      mockMailerService.sendMail.mockResolvedValue(true);

      for (const alertType of alertTypes) {
        await service.sendSecurityAlert(email, alertType, details);

        expect(mockMailerService.sendMail).toHaveBeenCalledWith({
          to: email,
          subject: 'Alert bezpieczeństwa',
          template: 'security-alert',
          context: expect.objectContaining({
            alertType,
            details,
          }),
        });
      }
    });

    it('should handle empty details', async () => {
      const email = 'test@example.com';
      const alertType = 'new-device-login';

      mockMailerService.sendMail.mockResolvedValue(true);

      await service.sendSecurityAlert(email, alertType);

      expect(mockMailerService.sendMail).toHaveBeenCalledWith({
        to: email,
        subject: 'Alert bezpieczeństwa',
        template: 'security-alert',
        context: expect.objectContaining({
          alertType,
          details: {},
        }),
      });
    });
  });
}); 