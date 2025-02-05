import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { Role } from '../enums/role.enum';
import { Permission } from '../enums/permission.enum';

export type PermissionAuditDocument = PermissionAudit & Document;

export enum AuditAction {
  ROLE_ASSIGNED = 'role_assigned',
  ROLE_REMOVED = 'role_removed',
  PERMISSION_GRANTED = 'permission_granted',
  PERMISSION_REVOKED = 'permission_revoked',
}

@Schema({ timestamps: true })
export class PermissionAudit {
  @Prop({ required: true })
  userId: string;

  @Prop({ required: true })
  performedBy: string;

  @Prop({ required: true, enum: AuditAction })
  action: AuditAction;

  @Prop({ type: String, enum: Role })
  role?: Role;

  @Prop({ type: String, enum: Permission })
  permission?: Permission;

  @Prop()
  reason?: string;

  @Prop({ default: Date.now })
  createdAt: Date;
}

export const PermissionAuditSchema = SchemaFactory.createForClass(PermissionAudit); 