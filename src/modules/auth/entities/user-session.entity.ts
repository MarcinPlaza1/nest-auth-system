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
  expiresAt: Date;

  @Prop({ required: true, default: true })
  isActive: boolean;

  @Prop()
  endedAt?: Date;

  @Prop({ required: true })
  lastActivity: Date;
}

export const UserSessionSchema = SchemaFactory.createForClass(UserSession); 