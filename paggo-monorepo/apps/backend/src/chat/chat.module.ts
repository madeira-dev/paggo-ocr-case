import { Module } from '@nestjs/common';
import { ChatController } from './chat.controller';
import { OpenaiModule } from '../openai/openai.module'; // Assuming OpenaiService is exported here
import { ChatService } from './chat.service'; // Import ChatService
// PrismaModule is global

@Module({
    imports: [OpenaiModule], // OpenaiService will be used by ChatController/Service
    controllers: [ChatController],
    providers: [ChatService], // Add ChatService here
})
export class ChatModule { }