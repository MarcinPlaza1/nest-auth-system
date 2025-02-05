import { IsEmail, IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { IsStrongPassword } from '../../../common/decorators/password-validation.decorator';

export class RegisterDto {
  @ApiProperty({
    example: 'johndoe',
    description: 'Nazwa użytkownika',
  })
  @IsString()
  @MinLength(3)
  username: string;

  @ApiProperty({
    example: 'john@example.com',
    description: 'Adres email użytkownika',
  })
  @IsEmail()
  email: string;

  @ApiProperty({
    example: 'StrongP@ssw0rd',
    description: 'Hasło użytkownika. Musi zawierać minimum 8 znaków, w tym: wielką literę, małą literę, cyfrę i znak specjalny',
  })
  @IsStrongPassword()
  password: string;
} 