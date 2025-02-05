import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

@Injectable()
export class MailService {
  private transporter: nodemailer.Transporter;

  constructor(private configService: ConfigService) {
    this.transporter = nodemailer.createTransport({
      host: this.configService.get<string>('SMTP_HOST'),
      port: this.configService.get<number>('SMTP_PORT'),
      secure: this.configService.get<boolean>('SMTP_SECURE'),
      auth: {
        user: this.configService.get<string>('SMTP_USER'),
        pass: this.configService.get<string>('SMTP_PASSWORD'),
      },
    });
  }

  async sendPasswordResetEmail(email: string, resetToken: string): Promise<void> {
    const resetLink = `${this.configService.get<string>('FRONTEND_URL')}/reset-password?token=${resetToken}`;

    await this.transporter.sendMail({
      from: this.configService.get<string>('SMTP_FROM'),
      to: email,
      subject: 'Reset hasła',
      html: `
        <h1>Reset hasła</h1>
        <p>Otrzymaliśmy prośbę o reset hasła dla Twojego konta.</p>
        <p>Aby zresetować hasło, kliknij w poniższy link:</p>
        <a href="${resetLink}">Resetuj hasło</a>
        <p>Link jest ważny przez 1 godzinę.</p>
        <p>Jeśli nie prosiłeś o reset hasła, zignoruj tę wiadomość.</p>
      `,
    });
  }
} 