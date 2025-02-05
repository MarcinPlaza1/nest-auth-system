import { Injectable, ConflictException, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User, UserDocument } from '../entities/user.entity';
import { CreateUserDto } from '../dto/create-user.dto';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UsersService {
  constructor(
    @InjectModel(User.name)
    private userModel: Model<User>,
  ) {}

  async create(createUserDto: CreateUserDto): Promise<User> {
    try {
      // Sprawdź czy użytkownik już istnieje
      const existingUser = await this.findOneByEmail(createUserDto.email);
      if (existingUser) {
        throw new ConflictException('Użytkownik z tym adresem email już istnieje');
      }

      // Zahashuj hasło
      const salt = await bcrypt.genSalt();
      const hashedPassword = await bcrypt.hash(createUserDto.password, salt);

      // Utwórz nowego użytkownika
      const createdUser = await this.userModel.create({
        ...createUserDto,
        password: hashedPassword,
      });

      return createdUser;
    } catch (error) {
      if (error instanceof ConflictException) {
        throw error;
      }
      throw new InternalServerErrorException('Nie udało się utworzyć użytkownika');
    }
  }

  async findOneByEmail(email: string): Promise<User | null> {
    try {
      const user = await this.userModel.findOne({ email }).exec();
      if (!user) {
        throw new NotFoundException(`Nie znaleziono użytkownika o adresie email: ${email}`);
      }
      return user;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new InternalServerErrorException('Wystąpił błąd podczas wyszukiwania użytkownika');
    }
  }

  async findById(id: string): Promise<User> {
    const user = await this.userModel.findById(id).exec();
    if (!user) {
      throw new NotFoundException('Użytkownik nie został znaleziony');
    }
    return user;
  }

  async update(id: string, updateData: Partial<User>): Promise<User> {
    return this.userModel
      .findByIdAndUpdate(id, updateData, { new: true })
      .exec();
  }

  async updatePassword(email: string, hashedPassword: string): Promise<void> {
    try {
      const user = await this.userModel.findOne({ email });
      if (!user) {
        throw new NotFoundException(`Nie znaleziono użytkownika o adresie email: ${email}`);
      }

      user.password = hashedPassword;
      await user.save();
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new InternalServerErrorException('Wystąpił błąd podczas aktualizacji hasła');
    }
  }

  async updateUserRole(userId: string, role: string | null): Promise<User> {
    return this.userModel
      .findByIdAndUpdate(
        userId,
        { $set: { roles: role ? [role] : [] } },
        { new: true }
      )
      .exec();
  }
}
