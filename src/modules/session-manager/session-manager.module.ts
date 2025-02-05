import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { SessionManagerService } from './services/session-manager.service';
import { Session, SessionSchema } from './schemas/session.schema';
import { Activity, ActivitySchema } from './schemas/activity.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Session.name, schema: SessionSchema },
      { name: Activity.name, schema: ActivitySchema },
    ]),
  ],
  providers: [SessionManagerService],
  exports: [SessionManagerService],
})
export class SessionManagerModule {} 