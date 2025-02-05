import { IsEmail, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RequestPasswordResetDto {
  @ApiProperty({
    example: 'user@example.com',
    description: 'Email użytkownika do zresetowania hasła',
  })
  @IsEmail()
  @IsNotEmpty()
  email: string;
} 