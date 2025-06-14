import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { PassportModule } from '@nestjs/passport'; // Import PassportModule
import { SessionSerializer } from './session.serializer'; // Import SessionSerializer
// PrismaModule is global and AuthService uses it

@Module({
    imports: [
        PassportModule.register({ session: true }), // Ensure session support is enabled
    ],
    controllers: [AuthController],
    providers: [
        AuthService,
        SessionSerializer, // Register the serializer
    ],
})
export class AuthModule { }