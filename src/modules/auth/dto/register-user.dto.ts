import { IsEmail, IsNotEmpty } from 'class-validator';
import { IsStrongPassword } from '../../../common/decorators/password-validation.decorator';

export class RegisterUserDto {
  @IsNotEmpty()
  username: string;

  @IsEmail()
  email: string;

  @IsNotEmpty()
  @IsStrongPassword()
  password: string;
}
