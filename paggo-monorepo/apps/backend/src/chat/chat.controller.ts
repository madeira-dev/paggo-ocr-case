import { Controller, Post, Body, Logger, UsePipes, ValidationPipe } from '@nestjs/common';
import { OpenaiService } from '../openai/openai.service';
import { ChatMessageDto } from './dto/chat-message.dto';

@Controller('chat')
export class ChatController {
    private readonly logger = new Logger(ChatController.name);

    constructor(private readonly openaiService: OpenaiService) { }

    @Post('message')
    @UsePipes(new ValidationPipe({ transform: true, whitelist: true })) // enables DTO validation
    async handleChatMessage(@Body() chatMessageDto: ChatMessageDto) {
        this.logger.log(
            `Received message: "${chatMessageDto.message}", imageUrl: "${chatMessageDto.imageUrl}"`,
        );
        try {
            const botResponse = await this.openaiService.getChatCompletion(
                chatMessageDto.message,
                chatMessageDto.imageUrl,
            );
            return { response: botResponse };
        } catch (error) {
            this.logger.error('Error in chat controller:', error);
            return {
                response:
                    'Sorry, there was an issue processing your message with the AI.',
            }; // or throw an HttpException
        }
    }
}