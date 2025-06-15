import { Module } from '@nestjs/common';
import { ChatController } from './chat.controller';
import { ChatService } from './chat.service';
import { PrismaModule } from '../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';
import { OpenaiModule } from '../openai/openai.module';
import { OcrModule } from '../ocr/ocr.module';
import { PdfModule } from '../pdf/pdf.module';

@Module({
    imports: [
        PrismaModule,
        AuthModule,
        OpenaiModule,
        OcrModule,
        PdfModule,
    ],
    controllers: [ChatController],
    providers: [ChatService],
    exports: [ChatService],
})
export class ChatModule { }