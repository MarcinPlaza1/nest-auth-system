import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Session, SessionDocument } from '../schemas/session.schema';
import { Activity, ActivityDocument } from '../schemas/activity.schema';
import { ActivityType } from '../../auth/enums/activity-type.enum';

@Injectable()
export class SessionManagerService {
  constructor(
    @InjectModel(Session.name) private sessionModel: Model<SessionDocument>,
    @InjectModel(Activity.name) private activityModel: Model<ActivityDocument>,
  ) {}

  async deactivateSession(sessionId: string, userId: string): Promise<void> {
    await this.sessionModel.findOneAndUpdate(
      { _id: sessionId, userId },
      { $set: { isActive: false, endedAt: new Date() } }
    );
  }

  async deactivateAllUserSessions(userId: string, excludeSessionId?: string): Promise<void> {
    const query = { userId, isActive: true };
    if (excludeSessionId) {
      Object.assign(query, { _id: { $ne: excludeSessionId } });
    }
    
    await this.sessionModel.updateMany(
      query,
      { $set: { isActive: false, endedAt: new Date() } }
    );
  }

  async logActivity(
    userId: string,
    activityType: ActivityType,
    details: {
      ipAddress?: string;
      userAgent?: string;
      location?: string;
      deviceInfo?: string;
      metadata?: Record<string, any>;
    }
  ): Promise<void> {
    await this.activityModel.create({
      userId,
      activityType,
      timestamp: new Date(),
      ...details
    });
  }

  async getUserActiveSessions(userId: string) {
    return this.sessionModel.find({ userId, isActive: true }).exec();
  }

  async getActivityHistory(userId: string, options: {
    limit?: number;
    skip?: number;
    activityType?: ActivityType;
    startDate?: Date;
    endDate?: Date;
  }) {
    const query: any = { userId };

    if (options.activityType) {
      query.activityType = options.activityType;
    }

    if (options.startDate || options.endDate) {
      query.timestamp = {};
      if (options.startDate) {
        query.timestamp.$gte = options.startDate;
      }
      if (options.endDate) {
        query.timestamp.$lte = options.endDate;
      }
    }

    return this.activityModel
      .find(query)
      .sort({ timestamp: -1 })
      .skip(options.skip || 0)
      .limit(options.limit || 10)
      .exec();
  }
} 