import { Module } from '@nestjs/common';
import { ChatController } from './chat.controller';
import { ChatService } from './chat.service';
import { PrismaModule } from '../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';
import { OpenaiModule } from '../openai/openai.module'; // Assuming this is your LLM service module
// import { UsersModule } from '../users/users.module';
import { OcrModule } from '../ocr/ocr.module';
import { PdfModule } from '../pdf/pdf.module'; // ADDED

@Module({
    imports: [
        PrismaModule,
        AuthModule,
        OpenaiModule,
        // UsersModule,
        OcrModule,
        PdfModule, // ADDED
    ],
    controllers: [ChatController],
    providers: [ChatService],
    exports: [ChatService],
})
export class ChatModule { }