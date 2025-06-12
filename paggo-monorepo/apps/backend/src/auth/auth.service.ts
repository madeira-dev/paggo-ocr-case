import { Injectable, ConflictException, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcrypt';
import { CreateUserDto } from './dto/create-user.dto';
import { LoginUserDto } from './dto/login-user.dto';
import { User } from '../../generated/prisma';

@Injectable()
export class AuthService {
    constructor(private prisma: PrismaService) { }

    async signUp(createUserDto: CreateUserDto): Promise<Omit<User, 'password'>> {
        const { email, password, name } = createUserDto;

        const existingUser = await this.prisma.user.findUnique({ where: { email } });
        if (existingUser) {
            throw new ConflictException('Email already in use');
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        try {
            const user = await this.prisma.user.create({
                data: {
                    email,
                    password: hashedPassword,
                    // name: name || email.split('@')[0], // Default name if not provided ----- deixei comentado por enquanto porque nao tem name no schema do prisma por enquanto
                },
            });
            const { password: _, ...result } = user;
            return result;
        } catch (error) {
            console.error("Error during sign up:", error);
            throw new InternalServerErrorException('Could not create user due to an unexpected error.');
        }
    }

    async validateUserCredentials(loginUserDto: LoginUserDto): Promise<Omit<User, 'password'> | null> {
        const { email, password } = loginUserDto;
        const user = await this.prisma.user.findUnique({ where: { email } });

        if (user && (await bcrypt.compare(password, user.password))) {
            const { password: _, ...result } = user;
            return result;
        }
        return null; // Or throw NotFoundException / UnauthorizedException
    }
}