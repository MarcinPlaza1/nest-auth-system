import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { ActivityType } from '../../auth/enums/activity-type.enum';

export type ActivityDocument = Activity & Document;

@Schema({ timestamps: true })
export class Activity {
  @Prop({ type: Types.ObjectId, required: true })
  userId: string;

  @Prop({ required: true, enum: ActivityType })
  activityType: ActivityType;

  @Prop({ required: true })
  timestamp: Date;

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

export const ActivitySchema = SchemaFactory.createForClass(Activity); 