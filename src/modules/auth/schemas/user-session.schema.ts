import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type UserSessionDocument = UserSession & Document;

@Schema({ timestamps: true })
export class UserSession {
  @Prop({ required: true })
  userId: string;

  @Prop({ required: true })
  token: string;

  @Prop({ required: true })
  ipAddress: string;

  @Prop({ required: true })
  userAgent: string;

  @Prop({ type: Object })
  deviceInfo: Record<string, any>;

  @Prop()
  logoutAt?: Date;

  @Prop({ default: false })
  isRevoked: boolean;

  @Prop({ default: true })
  isActive: boolean;

  @Prop({ type: Date, default: Date.now })
  lastActivity: Date;
}

export const UserSessionSchema = SchemaFactory.createForClass(UserSession); 