import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type PermissionAuditDocument = PermissionAudit & Document;

@Schema({ timestamps: true })
export class PermissionAudit {
  @Prop({ required: true })
  userId: string;

  @Prop({ required: true })
  action: string;

  @Prop({ required: true })
  resource: string;

  @Prop({ type: Object })
  changes: Record<string, any>;

  @Prop({ required: true })
  performedBy: string;

  @Prop()
  reason?: string;
}

export const PermissionAuditSchema = SchemaFactory.createForClass(PermissionAudit); 