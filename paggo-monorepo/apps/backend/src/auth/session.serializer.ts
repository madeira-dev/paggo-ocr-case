import { PassportSerializer } from '@nestjs/passport';
import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service'; // Adjust path as needed
import { User } from '../../generated/prisma'; // Adjust path as needed

@Injectable()
export class SessionSerializer extends PassportSerializer {
  private readonly logger = new Logger(SessionSerializer.name);

  constructor(private readonly prisma: PrismaService) {
    super();
  }

  serializeUser(user: Omit<User, 'password'>, done: (err: Error | null, userId?: string) => void): void {
    this.logger.log(`[SessionSerializer] serializeUser: User ID ${user.id}`);
    done(null, user.id);
  }

  async deserializeUser(userId: string, done: (err: Error | null, user?: Omit<User, 'password'> | false) => void): Promise<void> {
    this.logger.log(`[SessionSerializer] deserializeUser: Attempting to find user with ID ${userId}`);
    try {
      const user = await this.prisma.user.findUnique({ where: { id: userId } });
      if (user) {
        const { password, ...userInfo } = user;
        this.logger.log(`[SessionSerializer] deserializeUser: User ${userInfo.email} found and deserialized.`);
        done(null, userInfo);
      } else {
        this.logger.warn(`[SessionSerializer] deserializeUser: User with ID ${userId} not found.`);
        done(null, false); // Important: Passport expects false if user not found
      }
    } catch (error) {
      this.logger.error(`[SessionSerializer] deserializeUser: Error finding user ID ${userId}`, error);
      done(error as Error);
    }
  }
}