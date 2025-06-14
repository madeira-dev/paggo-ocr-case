import { Module } from '@nestjs/common';
import { ChatController } from './chat.controller';
import { OpenaiModule } from '../openai/openai.module';

@Module({
    imports: [OpenaiModule],
    controllers: [ChatController],
})
export class ChatModule { }