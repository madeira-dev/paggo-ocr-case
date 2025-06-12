import { Controller, Post, Body, HttpCode, HttpStatus, UnauthorizedException } from '@nestjs/common';
import { AuthService } from './auth.service';
import { CreateUserDto } from './dto/create-user.dto';
import { LoginUserDto } from './dto/login-user.dto';

@Controller('auth')
export class AuthController {
    constructor(private readonly authService: AuthService) { }

    @Post('signup')
    @HttpCode(HttpStatus.CREATED)
    async signUp(@Body() createUserDto: CreateUserDto) {
        return this.authService.signUp(createUserDto);
    }

    @Post('validate-credentials')
    @HttpCode(HttpStatus.OK)
    async validateCredentials(@Body() loginUserDto: LoginUserDto) {
        const user = await this.authService.validateUserCredentials(loginUserDto);
        if (!user) {
            // This helps NextAuth.js display a generic "Invalid credentials"
            throw new UnauthorizedException('Invalid credentials');
        }
        return user;
    }
}