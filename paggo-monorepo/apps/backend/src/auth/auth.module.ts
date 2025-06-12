import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
// PrismaModule is global

@Module({
    controllers: [AuthController],
    providers: [AuthService],
})
export class AuthModule { }