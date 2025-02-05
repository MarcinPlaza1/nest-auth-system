import { Injectable } from '@nestjs/common';
import { SessionManagerService } from './session-manager.service';

@Injectable()
export class SessionService {
  constructor(private readonly sessionManagerService: SessionManagerService) {}

  async createSession(userId: string, token: string, ipAddress: string = '127.0.0.1') {
    return this.sessionManagerService.createSession(userId, token, ipAddress);
  }

  async deactivateSession(token: string) {
    await this.sessionManagerService.revokeSession(token);
  }

  async refreshSession(oldToken: string, userId: string) {
    await this.sessionManagerService.revokeSession(oldToken);
    const newToken = Math.random().toString(36).substring(2);
    const session = await this.sessionManagerService.createSession(userId, newToken, '127.0.0.1');
    return { token: newToken, session };
  }

  async isSessionActive(token: string): Promise<boolean> {
    const session = await this.sessionManagerService.findSessionByToken(token);
    return !!session && !session.isRevoked;
  }
} 