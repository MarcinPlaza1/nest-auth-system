import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User, UserDocument } from '../entities/user.entity';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UsersService {
  constructor(@InjectModel(User.name) private userModel: Model<UserDocument>) {}

  async createUser(username: string, email: string, password: string): Promise<User> {
    const saltRounds = 12;  // Increase bcrypt salt rounds for more security
    const hashedPassword = await bcrypt.hash(password, saltRounds);
    const user = new this.userModel({ username, email, password: hashedPassword });
    return user.save();
  }

  async findOneByEmail(email: string): Promise<User | undefined> {
    return this.userModel.findOne({ email }).exec();
  }
}
