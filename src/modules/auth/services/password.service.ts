import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';

@Injectable()
export class PasswordService {
  constructor(private configService: ConfigService) {}

  async hashPassword(password: string): Promise<string> {
    if (!password) {
      throw new Error('Password is required');
    }

    const saltRounds = this.configService.get<number>('password.saltRounds', 10);
    return bcrypt.hash(password, saltRounds);
  }

  async validatePassword(password: string, hash: string): Promise<boolean> {
    if (!password || !hash) {
      return false;
    }

    try {
      return await bcrypt.compare(password, hash);
    } catch (error) {
      return false;
    }
  }

  validatePasswordStrength(password: string): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (password === undefined) {
      return {
        isValid: false,
        errors: ['Password is required'],
      };
    }

    const minLength = this.configService.get<number>('password.minLength', 8);
    const requireUppercase = this.configService.get<boolean>('password.requireUppercase', true);
    const requireLowercase = this.configService.get<boolean>('password.requireLowercase', true);
    const requireNumbers = this.configService.get<boolean>('password.requireNumbers', true);
    const requireSpecialChars = this.configService.get<boolean>('password.requireSpecialChars', true);

    if (password.length < minLength) {
      errors.push(`Password must be at least ${minLength} characters long`);
    }

    if (requireUppercase && !/[A-Z]/.test(password)) {
      errors.push('Password must contain at least one uppercase letter');
    }

    if (requireLowercase && !/[a-z]/.test(password)) {
      errors.push('Password must contain at least one lowercase letter');
    }

    if (requireNumbers && !/\d/.test(password)) {
      errors.push('Password must contain at least one number');
    }

    if (requireSpecialChars && !/[^\w\s]/.test(password)) {
      errors.push('Password must contain at least one special character');
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  generateTemporaryPassword(): string {
    const length = 12;
    const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const lowercase = 'abcdefghijklmnopqrstuvwxyz';
    const numbers = '0123456789';
    const special = '!@#$%^&*()_+-=[]{}|;:,.<>?';
    
    let password = '';
    
    // Dodaj po jednym znaku z każdej wymaganej kategorii
    password += uppercase[Math.floor(Math.random() * uppercase.length)];
    password += lowercase[Math.floor(Math.random() * lowercase.length)];
    password += numbers[Math.floor(Math.random() * numbers.length)];
    password += special[Math.floor(Math.random() * special.length)];
    
    // Dodaj pozostałe znaki losowo
    const allChars = uppercase + lowercase + numbers + special;
    for (let i = password.length; i < length; i++) {
      password += allChars[Math.floor(Math.random() * allChars.length)];
    }
    
    // Pomieszaj znaki w haśle
    return password.split('').sort(() => Math.random() - 0.5).join('');
  }
} 