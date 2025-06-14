import { Controller, Post, Body, HttpCode, HttpStatus, UnauthorizedException, Req, Res, Get } from '@nestjs/common';
import { AuthService } from './auth.service';
import { CreateUserDto } from './dto/create-user.dto';
import { LoginUserDto } from './dto/login-user.dto';
import { Response, Request } from 'express';

@Controller('auth')
export class AuthController {
    constructor(private readonly authService: AuthService) { }

    @Post('signup')
    @HttpCode(HttpStatus.CREATED)
    async signUp(@Body() createUserDto: CreateUserDto) {
        return this.authService.signUp(createUserDto);
    }

    // This endpoint will be called by NextAuth.js's authorize function.
    // It needs to validate credentials AND establish a session via req.login().
    @Post('login') // Renaming for clarity, update in NextAuth.js authorize too
    @HttpCode(HttpStatus.OK)
    async login(@Body() loginUserDto: LoginUserDto, @Req() req: Request, @Res({ passthrough: true }) response: Response) {
        console.log('[Backend /auth/login] Attempting login for:', loginUserDto.email);
        // Assuming this.authService.validateUserCredentials returns a user object
        // that already has the 'password' field omitted.
        const user = await this.authService.validateUserCredentials(loginUserDto);
        if (!user) {
            console.warn('[Backend /auth/login] Invalid credentials for:', loginUserDto.email);
            throw new UnauthorizedException('Invalid credentials for backend login');
        }

        // The type of 'user' here is already Omit<OriginalUserType, 'password'>.
        // The Promise generic Omit<typeof user, 'password'> correctly resolves to this type
        // because 'password' is not a direct key of 'typeof user' (it's already omitted from its base).
        return new Promise<Omit<typeof user, 'password'>>((resolve, reject) => {
            req.login(user, (err) => { // 'user' (which is Omit<OriginalUserType, 'password'>) is passed to req.login
                if (err) {
                    console.error('[Backend /auth/login] req.login error:', err);
                    return reject(new UnauthorizedException('Backend session login failed'));
                }
                // If req.login is successful, express-session middleware will handle
                // sending the Set-Cookie header for connect.sid.
                console.log(`[Backend /auth/login] User ${user.email} successfully logged in via req.login(). Session created/updated.`);
                // Since the 'user' object (as returned by validateUserCredentials)
                // already lacks the 'password' property, we don't need to destructure it out.
                // 'userInfo' is simply the 'user' object itself.
                const userInfo = user;
                return resolve(userInfo);
            });
        });
    }

    @Get('test-cookie')
    testCookie(@Req() req: Request, @Res({ passthrough: true }) response: Response) {
        // Setting any data on req.session will trigger express-session
        // to save the session and send the Set-Cookie header.
        req.session.testData = `hello world at ${new Date().toISOString()}`;
        this.authService.logger.log(`[Backend /auth/test-cookie] Test data set in session for request. Session ID: ${req.sessionID}. Cookie should be set.`);
        response.status(HttpStatus.OK).send({ message: 'Session data set, check your browser cookies for connect.sid on localhost:3000' });
    }
}