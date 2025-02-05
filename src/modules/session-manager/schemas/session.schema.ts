import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type SessionDocument = Session & Document;

@Schema({ timestamps: true })
export class Session {
  @Prop({ type: Types.ObjectId, required: true })
  userId: string;

  @Prop({ required: true })
  token: string;

  @Prop({ default: true })
  isActive: boolean;

  @Prop()
  endedAt?: Date;

  @Prop()
  ipAddress?: string;

  @Prop()
  userAgent?: string;

  @Prop()
  location?: string;

  @Prop()
  deviceInfo?: string;

  @Prop({ type: Object })
  metadata?: Record<string, any>;
}

export const SessionSchema = SchemaFactory.createForClass(Session); 