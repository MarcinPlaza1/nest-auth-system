import { Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { UserSession, UserSessionDocument } from '../schemas/user-session.schema';
import { ActivityLog, ActivityLogDocument } from '../entities/activity-log.entity';
import { ConfigService } from '@nestjs/config';
import { ActivityType } from '../enums/activity-type.enum';

@Injectable()
export class SessionManagerService {
  constructor(
    @InjectModel(UserSession.name)
    private sessionModel: Model<UserSessionDocument>,
    @InjectModel(ActivityLog.name)
    private activityLogModel: Model<ActivityLogDocument>,
    private configService: ConfigService,
  ) {}

  async createSession(
    userId: string,
    token: string,
    ipAddress: string,
    deviceInfo?: Record<string, any>,
  ): Promise<UserSessionDocument> {
    const session = await this.sessionModel.create({
      userId,
      token,
      ipAddress,
      deviceInfo: deviceInfo || {},
      lastActivity: new Date(),
      isActive: true,
    });
    
    await this.logActivity(userId, ActivityType.LOGIN, {
      ipAddress,
      deviceInfo: deviceInfo || {},
    });

    return session;
  }

  async findSessionByToken(token: string): Promise<UserSessionDocument | null> {
    return this.sessionModel.findOne({ token, isRevoked: false }).exec();
  }

  async revokeSession(token: string): Promise<void> {
    const session = await this.findSessionByToken(token);
    if (session) {
      session.set('logoutAt', new Date());
      session.set('isRevoked', true);
      await session.save();
    }
  }

  async revokeAllUserSessions(userId: string): Promise<void> {
    const sessions = await this.sessionModel.find({ 
      userId, 
      isRevoked: false 
    }).exec();

    await Promise.all(
      sessions.map(session => {
        session.set('logoutAt', new Date());
        session.set('isRevoked', true);
        return session.save();
      })
    );
  }

  async updateSessionActivity(sessionId: string): Promise<void> {
    const session = await this.sessionModel.findById(sessionId);
    if (!session || !session.isActive) {
      throw new UnauthorizedException('Sesja jest nieaktywna lub wygasła');
    }

    session.lastActivity = new Date();
    await session.save();

    await this.logActivity(session.userId, ActivityType.SESSION_ACTIVITY, {
      ipAddress: session.ipAddress,
      userAgent: session.userAgent,
      deviceInfo: session.deviceInfo,
      sessionId: session._id.toString(),
    });
  }

  async deactivateSession(sessionId: string, userId: string): Promise<void> {
    const session = await this.sessionModel.findOne({
      _id: sessionId,
      userId,
      isActive: true,
    });

    if (!session) {
      throw new NotFoundException('Sesja nie została znaleziona');
    }

    session.isActive = false;
    session.logoutAt = new Date();
    await session.save();

    await this.logActivity(session.userId, ActivityType.SESSION_LOGOUT, {
      ipAddress: session.ipAddress,
      userAgent: session.userAgent,
      deviceInfo: session.deviceInfo,
      sessionId: session._id.toString(),
      reason: 'Manual logout',
    });
  }

  async deactivateAllUserSessions(userId: string, exceptSessionId?: string): Promise<void> {
    const query = {
      userId,
      isActive: true,
      ...(exceptSessionId && { _id: { $ne: exceptSessionId } }),
    };

    const sessions = await this.sessionModel.find(query);
    
    for (const session of sessions) {
      session.isActive = false;
      session.logoutAt = new Date();
      await session.save();

      await this.logActivity(session.userId, ActivityType.SESSION_LOGOUT, {
        ipAddress: session.ipAddress,
        userAgent: session.userAgent,
        deviceInfo: session.deviceInfo,
        sessionId: session._id.toString(),
        reason: 'Manual logout',
      });
    }
  }

  async getUserActiveSessions(userId: string): Promise<UserSessionDocument[]> {
    return this.sessionModel.find({
      userId,
      isActive: true,
      expiresAt: { $gt: new Date() },
    });
  }

  async cleanupExpiredSessions(): Promise<void> {
    const expiredSessions = await this.sessionModel.find({
      isActive: true,
      expiresAt: { $lt: new Date() },
    });

    for (const session of expiredSessions) {
      session.isActive = false;
      await session.save();

      await this.logActivity(session.userId, ActivityType.SESSION_EXPIRED, {
        ipAddress: session.ipAddress,
        userAgent: session.userAgent,
        deviceInfo: session.deviceInfo,
        sessionId: session._id.toString(),
        reason: 'Session expired',
      });
    }
  }

  async logActivity(
    userId: string,
    activityType: ActivityType,
    details: {
      ipAddress?: string;
      userAgent?: string;
      deviceInfo?: Record<string, any>;
      sessionId?: string;
      status?: string;
      reason?: string;
      metadata?: Record<string, any>;
    },
  ): Promise<ActivityLog> {
    if (!userId || userId.trim() === '') {
      throw new Error('UserId is required');
    }

    if (!Object.values(ActivityType).includes(activityType)) {
      throw new Error('Invalid activity type');
    }

    return this.activityLogModel.create({
      userId,
      activityType,
      ipAddress: details.ipAddress,
      userAgent: details.userAgent,
      deviceInfo: details.deviceInfo,
      details: details.reason,
      status: details.status,
      metadata: {
        sessionId: details.sessionId,
        ...details.metadata,
      },
    });
  }

  async getActivityHistory(
    userId: string,
    options: {
      limit?: number;
      skip?: number;
      activityType?: ActivityType;
      startDate?: Date;
      endDate?: Date;
    } = {},
  ) {
    const {
      limit = 10,
      skip = 0,
      activityType,
      startDate,
      endDate,
    } = options;

    const query: any = { userId };

    if (activityType) {
      query.activityType = activityType;
    }

    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = startDate;
      if (endDate) query.createdAt.$lte = endDate;
    }

    const [activities, total] = await Promise.all([
      this.activityLogModel
        .find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .exec(),
      this.activityLogModel.countDocuments(query),
    ]);

    return {
      activities,
      total,
      hasMore: total > skip + limit,
    };
  }

  async detectSuspiciousActivity(
    userId: string,
    ipAddress: string,
    userAgent: string,
  ): Promise<boolean> {
    // Sprawdź ostatnie aktywne sesje użytkownika
    const recentSessions = await this.sessionModel.find({
      userId,
      isActive: true,
      createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }, // ostatnie 24h
    });

    // Sprawdź czy jest to nowe urządzenie/lokalizacja
    const isNewDevice = !recentSessions.some(
      (session) => session.ipAddress === ipAddress && session.userAgent === userAgent,
    );

    if (isNewDevice) {
      await this.logActivity(userId, ActivityType.SECURITY_ALERT, {
        ipAddress,
        userAgent,
        status: 'Wykryto logowanie z nowego urządzenia',
        metadata: {
          existingSessions: recentSessions.length,
        },
      });
      return true;
    }

    return false;
  }
} 