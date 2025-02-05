import { Injectable } from '@nestjs/common';
import { MailerService } from '@nestjs-modules/mailer';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class EmailService {
  constructor(
    private readonly mailerService: MailerService,
    private readonly configService: ConfigService,
  ) {}

  async sendWelcomeEmail(email: string, name: string): Promise<void> {
    if (!email) {
      throw new Error('Email address is required');
    }

    await this.mailerService.sendMail({
      to: email,
      subject: `Witaj w ${this.configService.get('app.name')}!`,
      template: 'welcome',
      context: {
        name,
        appName: this.configService.get('app.name'),
        supportEmail: this.configService.get('email.supportEmail'),
      },
    });
  }

  async sendPasswordResetEmail(email: string, token: string): Promise<void> {
    if (!token) {
      throw new Error('Reset token is required');
    }

    const resetLink = `${this.configService.get('app.url')}/reset-password?token=${token}`;

    await this.mailerService.sendMail({
      to: email,
      subject: 'Reset hasła',
      template: 'password-reset',
      context: {
        resetLink,
        appName: this.configService.get('app.name'),
        supportEmail: this.configService.get('email.supportEmail'),
      },
    });
  }

  async sendEmailVerification(email: string, token: string): Promise<void> {
    if (!this.isValidEmail(email)) {
      throw new Error('Invalid email format');
    }

    const verificationLink = `${this.configService.get('app.url')}/verify-email?token=${token}`;

    await this.mailerService.sendMail({
      to: email,
      subject: 'Zweryfikuj swój adres email',
      template: 'email-verification',
      context: {
        verificationLink,
        appName: this.configService.get('app.name'),
        supportEmail: this.configService.get('email.supportEmail'),
      },
    });
  }

  async sendSecurityAlert(
    email: string,
    alertType: string,
    details: Record<string, any> = {},
  ): Promise<void> {
    await this.mailerService.sendMail({
      to: email,
      subject: 'Alert bezpieczeństwa',
      template: 'security-alert',
      context: {
        alertType,
        details,
        appName: this.configService.get('app.name'),
        supportEmail: this.configService.get('email.supportEmail'),
      },
    });
  }

  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }
} 