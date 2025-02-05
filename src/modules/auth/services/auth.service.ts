import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../../users/services/users.service';
import { User } from '../../users/entities/user.entity';
import { TokenBlacklistService } from './token-blacklist.service';
import { SessionService } from './session.service';
import { ErrorMessages } from '../../../config/error-messages';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    private tokenBlacklistService: TokenBlacklistService,
    private sessionService: SessionService,
  ) {}

  async validateUser(email: string, password: string): Promise<any> {
    try {
      const user = await this.usersService.findOneByEmail(email);
      if (!user || !user.password || !password) {
        return null;
      }
      
      try {
        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (isPasswordValid) {
          const { password, ...result } = user;
          return result;
        }
      } catch (error) {
        // Jeśli wystąpi błąd podczas porównywania hasła (np. nieprawidłowy hash)
        return null;
      }
      return null;
    } catch (error) {
      // Jeśli wystąpi błąd podczas wyszukiwania użytkownika
      return null;
    }
  }

  async login(user: any) {
    const payload = { sub: user._id.toString() };
    const token = this.jwtService.sign(payload);
    
    await this.sessionService.createSession(user._id.toString(), token);
    
    return {
      access_token: token,
      user: {
        id: user._id.toString(),
        email: user.email,
      }
    };
  }

  async logout(token: string) {
    await this.sessionService.deactivateSession(token);
  }

  async refresh(oldToken: string, userId: string) {
    // Sprawdź czy token nie jest na czarnej liście
    if (await this.tokenBlacklistService.isBlacklisted(oldToken)) {
      throw new UnauthorizedException(ErrorMessages.TOKEN_BLACKLISTED);
    }

    // Odśwież sesję i uzyskaj nowy token
    const { token, session } = await this.sessionService.refreshSession(oldToken, userId);

    return {
      access_token: token,
    };
  }

  async validateToken(token: string): Promise<boolean> {
    try {
      // Sprawdź czy token nie jest na czarnej liście
      if (await this.tokenBlacklistService.isBlacklisted(token)) {
        throw new UnauthorizedException(ErrorMessages.TOKEN_BLACKLISTED);
      }

      // Sprawdź czy sesja jest aktywna
      if (!await this.sessionService.isSessionActive(token)) {
        throw new UnauthorizedException(ErrorMessages.SESSION_EXPIRED);
      }

      return true;
    } catch (error) {
      throw new UnauthorizedException(error.message);
    }
  }
}
