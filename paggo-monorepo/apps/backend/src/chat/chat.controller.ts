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
    HttpException, // Import HttpException
    HttpStatus,    // Import HttpStatus
} from '@nestjs/common';
import { OpenaiService } from '../openai/openai.service'; // OpenaiService might not be directly needed here anymore
import { ChatMessageDto } from './dto/chat-message.dto';
import { ChatService } from './chat.service';
import { CreateChatDto } from './dto/create-chat.dto';
import { DocumentItemDto } from './dto/document-item.dto';
import { AuthenticatedGuard } from '../auth/authenticated.guard';
import { CompiledDocumentDto } from './dto/compiled-document.dto'; // ADDED: Import CompiledDocumentDto

// This interface might not be needed if history is handled by ChatService
// interface ChatHistoryMessage {
//     role: 'user' | 'assistant';
//     content: string;
// }

@Controller('chat')
export class ChatController {
    private readonly logger = new Logger(ChatController.name);

    constructor(
        // private readonly openaiService: OpenaiService, // May not be needed directly
        private readonly chatService: ChatService,
    ) { }

    private getUserIdFromRequest(req: any): string {
        if (!req.user || !req.user.id) {
            this.logger.error('User ID not found on request object. Ensure user is authenticated and session is active.');
            throw new UnauthorizedException('User information not available.');
        }
        return req.user.id;
    }

    @UseGuards(AuthenticatedGuard)
    @Post('message')
    @UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
    async handleChatMessage(@Body() chatMessageDto: ChatMessageDto, @Req() req: any) {
        const userId = this.getUserIdFromRequest(req);
        this.logger.log(
            `User ${userId} - Processing message via ChatService: "${chatMessageDto.message.substring(0, 30)}..." for chat ID: ${chatMessageDto.chatId || 'new'}`,
        );

        try {
            // Delegate all logic to ChatService.processUserMessage
            const result = await this.chatService.processUserMessage(userId, chatMessageDto);
            return result; // This result should match what the frontend expects
            // { chatId, chatTitle, userMessage, botResponse: { id, content }, isNewChat }
        } catch (error) {
            this.logger.error(
                `Error in ChatController while calling processUserMessage for user ${userId}: ${(error as Error).message}`,
                (error as Error).stack,
            );
            if (error instanceof HttpException) {
                throw error;
            }
            // Fallback for unexpected errors
            throw new HttpException(
                'An unexpected error occurred while processing your message.',
                HttpStatus.INTERNAL_SERVER_ERROR,
            );
        }
    }

    @UseGuards(AuthenticatedGuard)
    @Get('list')
    async getUserChats(@Req() req: any) {
        const userId = this.getUserIdFromRequest(req);
        this.logger.log(`Fetching all chats for user ${userId}`);
        return this.chatService.getUserChats(userId);
    }

    @UseGuards(AuthenticatedGuard)
    @Post('new')
    @UsePipes(new ValidationPipe({ transform: true, whitelist: true, skipMissingProperties: true }))
    async createNewChat(@Body() createChatDto: CreateChatDto, @Req() req: any) {
        const userId = this.getUserIdFromRequest(req);
        this.logger.log(`User ${userId} - Explicitly creating new chat with title: ${createChatDto.title}`);
        // Assuming createChat in service is still relevant for explicit creation without an initial message processing flow
        return this.chatService.createChat(userId, createChatDto);
    }


    @UseGuards(AuthenticatedGuard)
    @Get(':chatId/messages')
    async getChatMessages(
        @Param('chatId') chatId: string,
        @Req() req: any,
    ) {
        const userId = this.getUserIdFromRequest(req);
        this.logger.log(`Fetching messages for chat ${chatId} for user ${userId}`);
        return this.chatService.getChatMessages(userId, chatId);
    }

    @UseGuards(AuthenticatedGuard)
    @Get('compiled-document/:chatId')
    async getCompiledDocument(
        @Param('chatId') chatId: string,
        @Req() req: any,
    ): Promise<CompiledDocumentDto | null> { // Return type is CompiledDocumentDto or null
        const userId = this.getUserIdFromRequest(req);
        this.logger.log(`User ${userId} requesting compiled document for chat ID: ${chatId}`);
        try {
            const compiledDoc = await this.chatService.getCompiledDocumentByChatId(userId, chatId);
            if (!compiledDoc) {
                // This case is handled by NotFoundException in service, but good to be aware
                throw new HttpException('Compiled document not found.', HttpStatus.NOT_FOUND);
            }
            return compiledDoc;
        } catch (error) {
            this.logger.error(
                `Error fetching compiled document for chat ID ${chatId}, user ${userId}: ${(error as Error).message}`,
                (error as Error).stack,
            );
            if (error instanceof HttpException) {
                throw error; // Re-throw if it's already an HttpException (like 403 Forbidden or 404 Not Found from service)
            }
            throw new HttpException(
                'An unexpected error occurred while fetching the compiled document.',
                HttpStatus.INTERNAL_SERVER_ERROR,
            );
        }
    }
}