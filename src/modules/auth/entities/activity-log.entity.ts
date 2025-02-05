import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type ActivityLogDocument = ActivityLog & Document;

export enum ActivityType {
  LOGIN = 'login',
  LOGOUT = 'logout',
  PASSWORD_CHANGE = 'password_change',
  PASSWORD_RESET = 'password_reset',
  PROFILE_UPDATE = 'profile_update',
  ROLE_CHANGE = 'role_change',
  PERMISSION_CHANGE = 'permission_change',
  ACCOUNT_BLOCK = 'account_block',
  ACCOUNT_UNBLOCK = 'account_unblock',
  FAILED_LOGIN = 'failed_login',
  SESSION_EXPIRED = 'session_expired',
  SECURITY_ALERT = 'security_alert'
}

@Schema({ timestamps: true })
export class ActivityLog {
  @Prop({ required: true, index: true })
  userId: string;

  @Prop({ required: true, enum: ActivityType })
  activityType: ActivityType;

  @Prop({ required: true })
  ipAddress: string;

  @Prop({ required: true })
  userAgent: string;

  @Prop()
  deviceInfo?: string;

  @Prop()
  details?: string;

  @Prop()
  status?: string;

  @Prop({ type: Object })
  metadata?: Record<string, any>;

  @Prop({ default: Date.now })
  createdAt: Date;
}

export const ActivityLogSchema = SchemaFactory.createForClass(ActivityLog); 