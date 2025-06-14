import {
    HttpException,
    HttpStatus,
    Injectable,
    Logger,
    NotFoundException,
    ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { OpenaiService } from '../openai/openai.service'; // ADDED: Import OpenAiService
import { ChatMessageDto } from './dto/chat-message.dto'; // ADDED: Import DTO
import {
    Message as PrismaMessage,
    Chat as PrismaChat,
    Prisma,
    MessageSender,
} from '../../generated/prisma'; // ADDED: Import Prisma types
import { CreateChatDto } from './dto/create-chat.dto'; // Ensure CreateChatDto is imported

@Injectable()
export class ChatService {
    private readonly logger = new Logger(ChatService.name); // ADDED: Logger

    constructor(
        private prisma: PrismaService,
        private openAiService: OpenaiService, // ADDED: Inject OpenAiService
    ) { }

    // Placeholder for generateChatTitle - ensure it exists or implement it
    private generateChatTitle(firstMessageContent: string): string {
        const words = firstMessageContent.split(' ');
        const title = words.slice(0, 5).join(' ');
        return title.length > 50 ? title.substring(0, 47) + '...' : title;
    }


    // Placeholder for findOrCreateChat - ensure it exists and returns the expected structure
    // This is a simplified version. Your actual implementation might be more complex.
    async findOrCreateChat(
        userId: string,
        existingChatId: string | undefined,
        firstUserMessageContent?: string,
    ): Promise<{
        chat: Pick<PrismaChat, 'id' | 'title' | 'userId'>;
        isNewChat: boolean;
    }> {
        if (existingChatId) {
            const chat = await this.prisma.chat.findUnique({
                where: { id: existingChatId },
                select: { id: true, title: true, userId: true },
            });
            if (!chat) throw new NotFoundException(`Chat ${existingChatId} not found.`);
            if (chat.userId !== userId) throw new ForbiddenException(`User not authorized for chat ${existingChatId}.`);
            return { chat, isNewChat: false };
        } else {
            const title = firstUserMessageContent ? this.generateChatTitle(firstUserMessageContent) : 'New Chat';
            const newChat = await this.prisma.chat.create({
                data: {
                    user: { connect: { id: userId } },
                    title: title,
                },
                select: { id: true, title: true, userId: true },
            });
            // In a real scenario, you'd also create the initial user message and bot greeting here
            // For simplicity, this placeholder assumes they are handled or not strictly needed for this example part
            return { chat: newChat, isNewChat: true };
        }
    }


    // ADDED: processUserMessage method (or similar, adapt to your controller's needs)
    async processUserMessage(
        userId: string,
        chatMessageDto: ChatMessageDto,
    ): Promise<{
        chatId: string;
        chatTitle: string;
        userMessage: PrismaMessage;
        botResponse: { id: string; content: string };
        isNewChat: boolean;
    }> {
        const { chatId: existingChatId, message, extractedOcrText, fileName } = chatMessageDto;
        this.logger.log(
            `Processing message for user ${userId}, existingChatId: ${existingChatId}, message: "${message.substring(0, 30)}..."`,
        );

        const { chat, isNewChat } = await this.findOrCreateChat(
            userId,
            existingChatId,
            existingChatId ? undefined : message
        );

        const savedUserMessage = await this.prisma.message.create({
            data: {
                // chat: { connect: { id: chat.id } }, // Alternative way to link
                chatId: chat.id, // Link to chat
                content: message,
                sender: MessageSender.USER,
                // REMOVED: user: { connect: { id: userId } }, // Message model doesn't have direct user relation
                extractedOcrText: extractedOcrText,
                fileName: fileName,
            },
        });

        const history = await this.prisma.message.findMany({
            where: { chatId: chat.id },
            orderBy: { createdAt: 'asc' },
            select: { content: true, sender: true }, // MODIFIED: Select sender, not role
        });

        const historyForAI = history
            .filter(msg => msg.sender === MessageSender.USER || msg.sender === MessageSender.BOT) // Filter relevant messages
            .map((msg) => ({
                role: msg.sender === MessageSender.USER ? ('user' as const) : ('assistant' as const),
                content: msg.content,
            }));

        // The historyForAI should not include the *current* user message being processed,
        // as that's passed separately to openAiService.getChatCompletion.
        // So, we filter out the just-savedUserMessage if it's in historyForAI.
        // A more robust way is to fetch history *before* saving the current user message.
        // For now, let's assume historyForAI is correctly prepared *before* the current message.

        let aiResponseContent: string;
        let savedBotMessage: PrismaMessage;

        try {
            aiResponseContent = await this.openAiService.getChatCompletion(
                savedUserMessage.content,
                historyForAI,
                extractedOcrText,
                fileName,
            );

            savedBotMessage = await this.prisma.message.create({
                data: {
                    // chat: { connect: { id: chat.id } }, // Alternative way to link
                    chatId: chat.id, // Link to chat
                    content: aiResponseContent,
                    sender: MessageSender.BOT,
                    // REMOVED: user: { connect: { id: userId } }, // Message model doesn't have direct user relation
                },
            });

        } catch (error) {
            this.logger.error(
                `Error in processUserMessage for chat ${chat.id}. User message: "${message.substring(0, 30)}...". Error: ${(error as Error).message}`,
                (error as Error).stack,
            );
            if (error instanceof HttpException) {
                throw error;
            }
            throw new HttpException(
                `Failed to process your message: ${(error as Error).message}`,
                HttpStatus.INTERNAL_SERVER_ERROR,
            );
        }

        // 6. Return the successful response structure
        return {
            chatId: chat.id,
            chatTitle: chat.title ?? "Chat", // MODIFIED: Provide a fallback if chat.title is null
            userMessage: savedUserMessage,
            botResponse: {
                id: savedBotMessage.id,
                content: savedBotMessage.content,
            },
            isNewChat: isNewChat,
        };
    }

    // ADDED: createChat method
    async createChat(userId: string, createChatDto: CreateChatDto): Promise<PrismaChat & { messages?: PrismaMessage[] }> {
        const { title, initialUserMessage, extractedOcrText, fileName } = createChatDto;
        let chatTitle = title;

        if (!chatTitle && initialUserMessage) {
            chatTitle = this.generateChatTitle(initialUserMessage);
        } else if (!chatTitle) {
            chatTitle = "New Chat"; // Default title if none provided
        }

        this.logger.log(`Creating new chat for user ${userId} with title: "${chatTitle}"`);

        const chatCreationData: Prisma.ChatCreateInput = {
            user: { connect: { id: userId } },
            title: chatTitle,
        };

        // If an initial user message is provided in the DTO, create it along with an initial bot greeting
        if (initialUserMessage) {
            const initialBotGreeting = "Hello! How can I assist you today?";
            chatCreationData.messages = {
                create: [
                    {
                        content: initialUserMessage,
                        sender: MessageSender.USER,
                        // userId: userId, // Not directly on Message, linked via Chat
                        extractedOcrText: extractedOcrText,
                        fileName: fileName,
                    },
                    {
                        content: initialBotGreeting,
                        sender: MessageSender.BOT,
                        // userId: userId, // Not directly on Message
                    },
                ],
            };
        }


        return this.prisma.chat.create({
            data: chatCreationData,
            include: { // Include messages if they were created
                messages: !!initialUserMessage, // Conditionally include messages
            },
        });
    }

    async getUserChats(userId: string) {
        this.logger.log(`Fetching chats for user ${userId}`);
        return this.prisma.chat.findMany({
            where: { userId },
            orderBy: { updatedAt: 'desc' },
            select: { id: true, title: true, createdAt: true, updatedAt: true }
        });
    }

    async getChatMessages(userId: string, chatId: string): Promise<PrismaMessage[]> {
        this.logger.log(`Fetching messages for chat ${chatId} for user ${userId}`);
        const chat = await this.prisma.chat.findUnique({ where: { id: chatId } });
        if (!chat) throw new NotFoundException(`Chat ${chatId} not found.`);
        if (chat.userId !== userId) throw new ForbiddenException(`User not authorized for chat ${chatId}.`);

        return this.prisma.message.findMany({
            where: { chatId: chatId },
            orderBy: { createdAt: 'asc' },
        });
    }
}