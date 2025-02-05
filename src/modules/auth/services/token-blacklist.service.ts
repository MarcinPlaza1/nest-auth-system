import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { BlacklistedToken, BlacklistedTokenDocument } from '../entities/blacklisted-token.entity';
import { JwtService } from '@nestjs/jwt';

interface DecodedToken {
  exp?: number;
  [key: string]: any;
}

@Injectable()
export class TokenBlacklistService {
  constructor(
    @InjectModel(BlacklistedToken.name)
    private blacklistedTokenModel: Model<BlacklistedTokenDocument>,
    private jwtService: JwtService,
  ) {}

  async blacklistToken(token: string): Promise<void> {
    // Dekoduj token
    const decodedToken = this.jwtService.decode(token) as DecodedToken;
    
    // Sprawdź czy token jest poprawny i czy zawiera pole exp
    if (!decodedToken || typeof decodedToken === 'string') {
      throw new BadRequestException('Nieprawidłowy format tokena JWT');
    }

    if (!decodedToken.exp || typeof decodedToken.exp !== 'number') {
      throw new BadRequestException('Token nie zawiera prawidłowej daty wygaśnięcia');
    }

    // Sprawdź czy data wygaśnięcia jest w przyszłości
    const expiresAt = new Date(decodedToken.exp * 1000);
    const now = new Date();
    
    if (expiresAt <= now) {
      throw new BadRequestException('Token już wygasł');
    }

    // Dodaj token do blacklisty
    try {
      await this.blacklistedTokenModel.create({
        token,
        expiresAt,
      });
    } catch (error) {
      if (error.code === 11000) { // MongoDB duplicate key error
        // Token już jest na blackliście, możemy to zignorować
        return;
      }
      throw error;
    }
  }

  async isBlacklisted(token: string): Promise<boolean> {
    const blacklistedToken = await this.blacklistedTokenModel.findOne({ token }).exec();
    return !!blacklistedToken;
  }

  // Usuwanie wygasłych tokenów z blacklisty (można uruchomić jako zadanie cron)
  async cleanupExpiredTokens(): Promise<void> {
    await this.blacklistedTokenModel.deleteMany({
      expiresAt: { $lt: new Date() },
    }).exec();
  }
} 