import { ThrottlerModuleOptions } from '@nestjs/throttler';
import { ConfigService } from '@nestjs/config';

export const throttlerConfig = async (
  configService: ConfigService,
): Promise<ThrottlerModuleOptions> => ({
  throttlers: [
    {
      name: 'login',
      ttl: configService.get<number>('LOGIN_THROTTLE_TTL', 60000), // 1 minuta
      limit: configService.get<number>('LOGIN_THROTTLE_LIMIT', 5), // 5 prób
    },
    {
      name: 'password-reset',
      ttl: configService.get<number>('PASSWORD_RESET_THROTTLE_TTL', 300000), // 5 minut
      limit: configService.get<number>('PASSWORD_RESET_THROTTLE_LIMIT', 3), // 3 próby
    },
  ],
}); 