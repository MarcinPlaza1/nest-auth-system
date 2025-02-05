import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { PasswordResetToken, PasswordResetTokenDocument } from '../entities/password-reset-token.entity';
import { UsersService } from '../../users/services/users.service';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { ConfigService } from '@nestjs/config';
import { SessionManagerService } from '../services/session-manager.service';
import { ActivityType } from '../enums/activity-type.enum';

@Injectable()
export class PasswordResetService {
  constructor(
    @InjectModel(PasswordResetToken.name)
    private passwordResetTokenModel: Model<PasswordResetTokenDocument>,
    private usersService: UsersService,
    private jwtService: JwtService,
    private configService: ConfigService,
    private sessionManagerService: SessionManagerService,
  ) {}

  async createPasswordResetToken(email: string): Promise<string> {
    const user = await this.usersService.findOneByEmail(email);
    if (!user) {
      throw new NotFoundException('Użytkownik o podanym adresie email nie istnieje');
    }

    // Generuj unikalny token
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 1); // Token ważny przez 1 godzinę

    // Zapisz token w bazie
    await this.passwordResetTokenModel.create({
      email,
      token,
      expiresAt,
      used: false,
    });

    return token;
  }

  async resetPassword(token: string, newPassword: string): Promise<void> {
    const resetToken = await this.passwordResetTokenModel.findOne({ token, used: false }).exec();
    if (!resetToken) {
      throw new BadRequestException('Token resetu hasła jest nieprawidłowy lub został już wykorzystany');
    }

    if (resetToken.expiresAt < new Date()) {
      throw new BadRequestException('Token resetu hasła wygasł');
    }

    const user = await this.usersService.findOneByEmail(resetToken.email);
    if (!user) {
      throw new BadRequestException('Nie znaleziono użytkownika powiązanego z tym tokenem');
    }

    // Zahashuj nowe hasło
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await this.usersService.updatePassword((user as any)._id.toString(), hashedPassword);

    // Oznacz token jako wykorzystany
    resetToken.used = true;
    await resetToken.save();

    // Wyloguj użytkownika ze wszystkich sesji
    await this.sessionManagerService.deactivateAllUserSessions((user as any)._id.toString());
    await this.sessionManagerService.logActivity(
      (user as any)._id.toString(),
      ActivityType.PASSWORD_RESET,
      { ipAddress: 'system' }
    );
  }

  async cleanupExpiredTokens(): Promise<void> {
    await this.passwordResetTokenModel.deleteMany({
      $or: [
        { expiresAt: { $lt: new Date() } },
        { used: true },
      ],
    });
  }
} 