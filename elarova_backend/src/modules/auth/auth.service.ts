import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User, UserDocument } from '../../database/schemas/user.schema';

@Injectable()
export class AuthService {
  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
  ) {}

  async getOrCreateSession(sessionId: string): Promise<User> {
    let user = await this.userModel.findOne({ sessionId });
    
    if (!user) {
      try {
        user = new this.userModel({ sessionId });
        await user.save();
      } catch (error: any) {
        if (error.code === 11000) {
          user = await this.userModel.findOne({ sessionId });
        } else {
          throw error;
        }
      }
    }
    
    return user;
  }
}
