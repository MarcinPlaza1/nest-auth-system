import { Controller, Post, Body, Req, UseGuards, Logger, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { AuthService } from '../services/auth.service';
import { LocalAuthGuard } from '../guards/local-auth.guard';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { LoginDto } from '../dto/login.dto';
import { Throttle, SkipThrottle } from '@nestjs/throttler';
import { ErrorMessages } from '../../../config/error-messages.config';
import { AuthenticatedRequest } from '../interfaces/authenticated-request.interface';
import { SessionManagerService } from '../services/session-manager.service';
import { ActivityType } from '../enums/activity-type.enum';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  private readonly logger = new Logger(AuthController.name);

  constructor(
    private readonly authService: AuthService,
    private readonly sessionManagerService: SessionManagerService
  ) {}

  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @UseGuards(LocalAuthGuard)
  @Post('login')
  @ApiOperation({ summary: 'Logowanie użytkownika' })
  @ApiResponse({ status: 200, description: 'Zalogowano pomyślnie' })
  @ApiResponse({ status: 401, description: 'Nieprawidłowy email lub hasło' })
  @ApiResponse({ status: 429, description: 'Przekroczono limit prób logowania' })
  async login(@Body() loginDto: LoginDto, @Req() req) {
    try {
      this.logger.log(`Próba logowania dla użytkownika: ${loginDto.email}`);
      return await this.authService.login(req.user);
    } catch (error) {
      this.logger.error(`Błąd logowania dla użytkownika ${loginDto.email}: ${error.message}`);
      throw new UnauthorizedException(ErrorMessages.INVALID_CREDENTIALS);
    }
  }

  @SkipThrottle()
  @UseGuards(JwtAuthGuard)
  @Post('refresh')
  @ApiOperation({ summary: 'Odświeżenie tokenu JWT' })
  @ApiResponse({ status: 200, description: 'Token został odświeżony' })
  @ApiResponse({ status: 401, description: 'Nieprawidłowy token' })
  async refresh(@Req() req) {
    try {
      this.logger.log(`Odświeżanie tokenu dla użytkownika: ${req.user.email}`);
      return await this.authService.login(req.user);
    } catch (error) {
      this.logger.error(`Błąd odświeżania tokenu: ${error.message}`);
      throw new UnauthorizedException(ErrorMessages.TOKEN_INVALID);
    }
  }

  @Post('logout')
  @UseGuards(JwtAuthGuard)
  async logout(@Req() req: AuthenticatedRequest): Promise<void> {
    try {
      const token = req.headers.authorization?.split(' ')[1];
      if (!token) {
        throw new UnauthorizedException('Brak tokenu autoryzacji');
      }

      await this.sessionManagerService.deactivateSession(token, req.user._id.toString());
      await this.sessionManagerService.logActivity(
        req.user._id.toString(), 
        ActivityType.LOGOUT,
        { ipAddress: req.ip }
      );
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      throw new UnauthorizedException('Nieprawidłowy format tokenu');
    }
  }
}
