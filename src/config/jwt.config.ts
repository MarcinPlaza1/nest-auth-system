import { JwtModuleOptions } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';

export const jwtConfig = async (configService: ConfigService): Promise<JwtModuleOptions> => ({
  secret: configService.get<string>('JWT_SECRET'),
  signOptions: {
    expiresIn: configService.get<string>('JWT_EXPIRATION_TIME') || '30s',
    algorithm: 'HS256',  // Specify JWT algorithm
  },
});
