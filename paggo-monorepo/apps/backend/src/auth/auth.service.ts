import { Injectable, Logger, UnauthorizedException, ConflictException } from '@nestjs/common'; // Add Logger
import { PrismaService } from '../prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import { LoginUserDto } from './dto/login-user.dto';
import * as bcrypt from 'bcrypt';
import { User } from '../../generated/prisma'; // Assuming this is your Prisma User type

@Injectable()
export class AuthService {
    // Declare and initialize the logger
    public readonly logger = new Logger(AuthService.name); // Make it public or provide a public log method

    constructor(private readonly prisma: PrismaService) { }

    async signUp(createUserDto: CreateUserDto): Promise<Omit<User, 'password'>> {
        this.logger.log(`Attempting to sign up user: ${createUserDto.email}`);
        const existingUser = await this.prisma.user.findUnique({
            where: { email: createUserDto.email },
        });

        if (existingUser) {
            this.logger.warn(`Signup attempt for existing email: ${createUserDto.email}`);
            throw new ConflictException('User with this email already exists');
        }

        const hashedPassword = await bcrypt.hash(createUserDto.password, 10);
        const newUser = await this.prisma.user.create({
            data: {
                ...createUserDto,
                password: hashedPassword,
            },
        });
        this.logger.log(`User ${newUser.email} signed up successfully.`);
        const { password, ...result } = newUser;
        return result;
    }

    async validateUserCredentials(loginUserDto: LoginUserDto): Promise<Omit<User, 'password'> | null> {
        this.logger.log(`Attempting to validate credentials for: ${loginUserDto.email}`);
        const user = await this.prisma.user.findUnique({
            where: { email: loginUserDto.email },
        });

        if (user && (await bcrypt.compare(loginUserDto.password, user.password))) {
            this.logger.log(`Credentials validated successfully for: ${loginUserDto.email}`);
            const { password, ...result } = user;
            return result;
        }
        this.logger.warn(`Invalid credentials attempt for: ${loginUserDto.email}`);
        return null;
    }

    // ... any other methods
}