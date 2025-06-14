import {
    Controller,
    Post,
    Body,
    Logger,
    UsePipes,
    ValidationPipe,
    Get,
    Param,
    UseGuards, // For authentication
    Req,      // To access request object for user
    UnauthorizedException, // For explicit error handling if needed
} from '@nestjs/common';
import { OpenaiService } from '../openai/openai.service';
import { ChatMessageDto } from './dto/chat-message.dto';
import { ChatService } from './chat.service';
import { CreateChatDto } from './dto/create-chat.dto';
import { MessageSender } from '../../generated/prisma';
import { AuthenticatedGuard } from '../auth/authenticated.guard'; // Import the new guard

interface ChatHistoryMessage { // Define an interface for clarity
    role: 'user' | 'assistant';
    content: string;
}

@Controller('chat')
export class ChatController {
    private readonly logger = new Logger(ChatController.name);

    constructor(
        private readonly openaiService: OpenaiService,
        private readonly chatService: ChatService,
    ) { }

    private getUserIdFromRequest(req: any): string {
        if (!req.user || !req.user.id) {
            // This should ideally be caught by AuthenticatedGuard, but as a safeguard:
            this.logger.error('User ID not found on request object. Ensure user is authenticated and session is active.');
            throw new UnauthorizedException('User information not available.');
        }
        return req.user.id;
    }

    @UseGuards(AuthenticatedGuard) // Protect this endpoint using session authentication
    @Post('message')
    @UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
    async handleChatMessage(@Body() chatMessageDto: ChatMessageDto, @Req() req: any) {
        const userId = this.getUserIdFromRequest(req);
        this.logger.log(
            `User ${userId} - Received message: "${chatMessageDto.message}" for chat ID: ${chatMessageDto.chatId || 'new'}`,
        );

        let currentChatId = chatMessageDto.chatId;
        // Explicitly type chatHistoryForAI
        let chatHistoryForAI: ChatHistoryMessage[] = [];

        if (!currentChatId) {
            // Create a new chat
            const newChat = await this.chatService.createChat(userId, {
                initialUserMessage: chatMessageDto.message, // Title will be generated
            });
            currentChatId = newChat.id;
            this.logger.log(`User ${userId} - New chat created with ID: ${currentChatId}`);
        } else {
            // Fetch history for existing chat
            const fullChat = await this.chatService.getFullChatForContext(userId, currentChatId);
            chatHistoryForAI = fullChat.messages.map(msg => ({ // This assignment is now type-compatible
                role: msg.sender === MessageSender.USER ? 'user' : 'assistant',
                content: msg.content
            }));
        }

        // Save user's message
        await this.chatService.addMessageToChat(
            userId,
            currentChatId,
            chatMessageDto.message,
            MessageSender.USER,
            chatMessageDto.extractedOcrText,
            chatMessageDto.fileName,
        );

        // Get AI response
        const botResponseText = await this.openaiService.getChatCompletion(
            chatMessageDto.message,
            chatHistoryForAI, // Pass history here
            chatMessageDto.extractedOcrText,
            chatMessageDto.fileName,
        );

        // Save bot's message
        await this.chatService.addMessageToChat(
            userId,
            currentChatId,
            botResponseText,
            MessageSender.BOT,
        );

        return { response: botResponseText, chatId: currentChatId }; // Return chatId for frontend
    }

    @UseGuards(AuthenticatedGuard)
    @Get('list') // Changed from /chats to /chat/list to avoid conflict if you have a /chat/:id
    async getUserChats(@Req() req: any) {
        const userId = this.getUserIdFromRequest(req);
        this.logger.log(`Fetching all chats for user ${userId}`);
        return this.chatService.getUserChats(userId);
    }

    @UseGuards(AuthenticatedGuard)
    @Post('new') // Endpoint to explicitly create a new chat
    @UsePipes(new ValidationPipe({ transform: true, whitelist: true, skipMissingProperties: true }))
    async createNewChat(@Body() createChatDto: CreateChatDto, @Req() req: any) {
        const userId = this.getUserIdFromRequest(req);
        this.logger.log(`User ${userId} - Explicitly creating new chat with title: ${createChatDto.title}`);
        return this.chatService.createChat(userId, createChatDto);
    }


    @UseGuards(AuthenticatedGuard)
    @Get(':chatId/messages')
    async getChatMessages(
        @Param('chatId') chatId: string, // <-- REMOVED ParseUUIDPipe
        @Req() req: any,
    ) {
        const userId = this.getUserIdFromRequest(req);
        this.logger.log(`Fetching messages for chat ${chatId} for user ${userId}`);
        // Ensure chatService.getChatMessages can handle the chatId as a string
        // and that any necessary validation for CUID format (e.g., non-empty)
        // is handled either in the service or by a global ValidationPipe if you
        // were to use a DTO for path parameters. For now, this removes the UUID constraint.
        return this.chatService.getChatMessages(userId, chatId);
    }
}