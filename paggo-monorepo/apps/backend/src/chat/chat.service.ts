import { Injectable, Logger, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateChatDto } from './dto/create-chat.dto';
import { MessageSender, Prisma } from '../../generated/prisma';

@Injectable()
export class ChatService {
    private readonly logger = new Logger(ChatService.name);

    constructor(private prisma: PrismaService) { }

    async createChat(userId: string, dto: CreateChatDto, initialMessages?: { userMessageContent: string, botResponseContent: string, extractedOcrText?: string, fileName?: string }) {
        this.logger.log(`Creating new chat for user ${userId} with title: ${dto.title}`);
        let chatTitle = dto.title;

        if (!chatTitle && dto.initialUserMessage) {
            chatTitle = this.generateChatTitle(dto.initialUserMessage);
        } else if (!chatTitle) {
            chatTitle = "New Chat";
        }


        const chatData: Prisma.ChatCreateInput = {
            user: { connect: { id: userId } },
            title: chatTitle,
        };

        if (initialMessages) {
            chatData.messages = {
                createMany: {
                    data: [
                        {
                            content: initialMessages.userMessageContent,
                            sender: MessageSender.USER,
                            extractedOcrText: initialMessages.extractedOcrText,
                            fileName: initialMessages.fileName,
                        },
                        {
                            content: initialMessages.botResponseContent,
                            sender: MessageSender.BOT,
                        }
                    ]
                }
            }
        }


        const chat = await this.prisma.chat.create({
            data: chatData,
            include: { // Optionally include messages if needed immediately
                messages: {
                    orderBy: { createdAt: 'asc' }
                }
            }
        });
        this.logger.log(`Chat created with ID: ${chat.id} for user ${userId}`);
        return chat;
    }

    async addMessageToChat(
        userId: string, // For authorization
        chatId: string,
        content: string,
        sender: MessageSender,
        extractedOcrText?: string,
        fileName?: string,
    ) {
        this.logger.log(`Adding message to chat ${chatId} by sender ${sender}`);
        const chat = await this.prisma.chat.findUnique({ where: { id: chatId } });
        if (!chat) {
            throw new NotFoundException(`Chat with ID ${chatId} not found.`);
        }
        if (chat.userId !== userId) {
            throw new ForbiddenException(`User does not have access to chat ${chatId}.`);
        }

        return this.prisma.message.create({
            data: {
                chat: { connect: { id: chatId } },
                content,
                sender,
                extractedOcrText,
                fileName,
            },
        });
    }

    async getUserChats(userId: string) {
        this.logger.log(`Fetching chats for user ${userId}`);
        return this.prisma.chat.findMany({
            where: { userId },
            orderBy: { updatedAt: 'desc' }, // Show most recent chats first
            select: { // Select only necessary fields for the list
                id: true,
                title: true,
                createdAt: true,
                updatedAt: true,
            }
        });
    }

    async getChatMessages(userId: string, chatId: string) {
        this.logger.log(`Fetching messages for chat ${chatId} for user ${userId}`);
        const chat = await this.prisma.chat.findUnique({
            where: { id: chatId },
            include: {
                messages: {
                    orderBy: { createdAt: 'asc' },
                },
            },
        });

        if (!chat) {
            throw new NotFoundException(`Chat with ID ${chatId} not found.`);
        }
        if (chat.userId !== userId) {
            throw new ForbiddenException(`User does not have access to chat ${chatId}.`);
        }
        return chat.messages; // Or return the whole chat object if preferred
    }

    async getFullChatForContext(userId: string, chatId: string) {
        this.logger.log(`Fetching full chat for context: chat ${chatId}, user ${userId}`);
        const chat = await this.prisma.chat.findUnique({
            where: { id: chatId },
            include: {
                messages: {
                    orderBy: { createdAt: 'asc' },
                    select: { content: true, sender: true } // Only content and sender needed for AI context
                }
            }
        });
        if (!chat) throw new NotFoundException(`Chat ${chatId} not found.`);
        if (chat.userId !== userId) throw new ForbiddenException(`User not authorized for chat ${chatId}.`);
        return chat;
    }


    private generateChatTitle(firstMessageContent: string): string {
        const words = firstMessageContent.split(' ');
        // Take first 5 words or less, and ensure it's not too long
        return words.slice(0, 5).join(' ').substring(0, 50) + (words.length > 5 || firstMessageContent.length > 50 ? '...' : '');
    }
}