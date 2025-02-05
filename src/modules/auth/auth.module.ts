import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { AuthService } from './services/auth.service';
import { AuthController } from './controllers/auth.controller';
import { User, UserSchema } from '../users/entities/user.entity';
import { UsersModule } from '../users/users.module';
import { UsersService } from '../users/services/users.service';
import { JwtStrategy } from './strategies/jwt.strategy';
import { LocalStrategy } from './strategies/local.strategy';
import { TokenBlacklistService } from './services/token-blacklist.service';
import { BlacklistedToken, BlacklistedTokenSchema } from './entities/blacklisted-token.entity';
import { PasswordResetService } from './services/password-reset.service';
import { PasswordResetController } from './controllers/password-reset.controller';
import { PasswordResetToken, PasswordResetTokenSchema } from './entities/password-reset-token.entity';
import { MailModule } from '../mail/mail.module';
import { RoleManagerService } from './services/role-manager.service';
import { RoleManagerController } from './controllers/role-manager.controller';
import { RolesGuard } from './guards/roles.guard';
import { PermissionsGuard } from './guards/permissions.guard';
import { SessionManagerService } from './services/session-manager.service';
import { SessionManagerController } from './controllers/session-manager.controller';
import { UserSession, UserSessionSchema } from './entities/user-session.entity';
import { ActivityLog, ActivityLogSchema } from './entities/activity-log.entity';
import { SessionService } from './services/session.service';
import { PermissionAudit, PermissionAuditSchema } from './schemas/permission-audit.schema';

@Module({
  imports: [
    UsersModule,
    PassportModule,
    MailModule,
    ThrottlerModule.forRoot([{
      ttl: 60,
      limit: 5,
    }]),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET'),
        signOptions: {
          expiresIn: configService.get<string>('JWT_EXPIRATION_TIME'),
        },
      }),
      inject: [ConfigService],
    }),
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: BlacklistedToken.name, schema: BlacklistedTokenSchema },
      { name: PasswordResetToken.name, schema: PasswordResetTokenSchema },
      { name: UserSession.name, schema: UserSessionSchema },
      { name: ActivityLog.name, schema: ActivityLogSchema },
      { name: PermissionAudit.name, schema: PermissionAuditSchema },
    ]),
  ],
  controllers: [
    AuthController,
    PasswordResetController,
    RoleManagerController,
    SessionManagerController,
  ],
  providers: [
    AuthService,
    UsersService,
    JwtStrategy,
    LocalStrategy,
    TokenBlacklistService,
    PasswordResetService,
    RoleManagerService,
    SessionManagerService,
    SessionService,
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
    RolesGuard,
    PermissionsGuard,
  ],
  exports: [
    AuthService,
    TokenBlacklistService,
    RoleManagerService,
    SessionManagerService,
    SessionService,
  ],
})
export class AuthModule {}
