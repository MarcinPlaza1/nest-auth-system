import { IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { IsStrongPassword } from '../../../common/decorators/password-validation.decorator';

export class ResetPasswordDto {
  @ApiProperty({
    example: 'abc123def456',
    description: 'Token resetu hasła',
  })
  @IsString()
  @IsNotEmpty()
  token: string;

  @ApiProperty({
    example: 'StrongP@ssw0rd',
    description: 'Nowe hasło użytkownika. Musi zawierać minimum 8 znaków, w tym: wielką literę, małą literę, cyfrę i znak specjalny',
  })
  @IsString()
  @IsStrongPassword()
  password: string;
} 