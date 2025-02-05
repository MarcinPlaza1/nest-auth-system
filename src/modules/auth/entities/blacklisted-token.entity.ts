import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type BlacklistedTokenDocument = BlacklistedToken & Document;

@Schema()
export class BlacklistedToken {
  @Prop({ required: true, unique: true })
  token: string;

  @Prop({ required: true })
  expiresAt: Date;

  @Prop({ default: Date.now })
  blacklistedAt: Date;
}

export const BlacklistedTokenSchema = SchemaFactory.createForClass(BlacklistedToken); 