import { Controller, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { PasswordResetService } from '../services/password-reset.service';
import { RequestPasswordResetDto } from '../dto/request-password-reset.dto';
import { ResetPasswordDto } from '../dto/reset-password.dto';
import { Throttle } from '@nestjs/throttler';
import { Logger } from '@nestjs/common';

@ApiTags('auth')
@Controller('auth/password-reset')
export class PasswordResetController {
  private readonly logger = new Logger(PasswordResetController.name);

  constructor(
    private readonly passwordResetService: PasswordResetService,
  ) {}

  @Throttle({ default: { limit: 3, ttl: 300000 } })
  @Post('request')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Żądanie resetu hasła' })
  @ApiResponse({ status: 200, description: 'Email z linkiem do resetu hasła został wysłany' })
  @ApiResponse({ status: 404, description: 'Użytkownik nie został znaleziony' })
  @ApiResponse({ status: 429, description: 'Too Many Requests - przekroczono limit prób resetowania hasła' })
  async requestPasswordReset(@Body() requestPasswordResetDto: RequestPasswordResetDto) {
    try {
      const token = await this.passwordResetService.createPasswordResetToken(
        requestPasswordResetDto.email,
      );
      
      this.logger.log(`Wysłano token resetu hasła dla: ${requestPasswordResetDto.email}`);
      return { message: 'Jeśli konto istnieje, email z instrukcjami został wysłany' };
    } catch (error) {
      this.logger.warn(
        `Nieudana próba resetu hasła dla: ${requestPasswordResetDto.email}, powód: ${error.message}`,
      );
      // Zawsze zwracamy tę samą wiadomość dla bezpieczeństwa
      return { message: 'Jeśli konto istnieje, email z instrukcjami został wysłany' };
    }
  }

  @Throttle({ default: { limit: 3, ttl: 300000 } })
  @Post('reset')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reset hasła' })
  @ApiResponse({ status: 200, description: 'Hasło zostało zresetowane' })
  @ApiResponse({ status: 400, description: 'Nieprawidłowy lub wygasły token' })
  @ApiResponse({ status: 429, description: 'Too Many Requests - przekroczono limit prób resetowania hasła' })
  async resetPassword(@Body() resetPasswordDto: ResetPasswordDto) {
    try {
      await this.passwordResetService.resetPassword(
        resetPasswordDto.token,
        resetPasswordDto.password,
      );
      
      this.logger.log(`Pomyślnie zresetowano hasło dla tokenu: ${resetPasswordDto.token}`);
      return { message: 'Hasło zostało pomyślnie zresetowane' };
    } catch (error) {
      this.logger.warn(
        `Nieudana próba zresetowania hasła dla tokenu: ${resetPasswordDto.token}, powód: ${error.message}`,
      );
      throw error;
    }
  }
} 