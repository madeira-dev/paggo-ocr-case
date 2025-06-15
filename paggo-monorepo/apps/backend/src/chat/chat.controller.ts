import {
    Controller,
    Post,
    Body,
    Logger,
    UsePipes,
    ValidationPipe,
    Get,
    Param,
    UseGuards,
    Req,
    UnauthorizedException,
    HttpException,
    HttpStatus,
    Res,
    StreamableFile,
    NotFoundException,
    InternalServerErrorException,
} from '@nestjs/common';
import { Response } from 'express';
import { ChatMessageDto } from './dto/chat-message.dto';
import { ChatService, CompiledDocumentDownloadData } from './chat.service';
import { CreateChatDto } from './dto/create-chat.dto';
import { AuthenticatedGuard } from '../auth/authenticated.guard';
import { OcrService } from '../ocr/ocr.service';
import { AuthenticatedRequest } from '../auth/types/authenticated-request.interface';
import { PdfGenerationService, CompiledPdfData, ChatHistoryPdfItem } from '../pdf/pdf-generation.service';
import { CompiledDocumentDto } from './dto/compiled-document.dto';

@Controller('chat')
export class ChatController {
    private readonly logger = new Logger(ChatController.name);

    constructor(
        private readonly chatService: ChatService,
        private readonly ocrService: OcrService,
        private readonly pdfGenerationService: PdfGenerationService,
    ) { }

    // Ensure getUserIdFromRequest uses the correct AuthenticatedRequest type
    private getUserIdFromRequest(req: AuthenticatedRequest): string {
        if (!req.user || !req.user.id) {
            this.logger.error('User ID not found on request object. Ensure user is authenticated.');
            throw new UnauthorizedException('User information not available.');
        }
        return req.user.id;
    }

    @UseGuards(AuthenticatedGuard)
    @Post('message')
    @UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
    async handleChatMessage(@Body() chatMessageDto: ChatMessageDto, @Req() req: AuthenticatedRequest) {
        const userId = this.getUserIdFromRequest(req);
        this.logger.log(
            `User ${userId} - Processing message via ChatService: "${chatMessageDto.message.substring(0, 30)}..." for chat ID: ${chatMessageDto.chatId || 'new'}`,
        );

        try {
            const result = await this.chatService.processUserMessage(userId, chatMessageDto);
            return result;
        } catch (error) {
            this.logger.error(
                `Error in ChatController while calling processUserMessage for user ${userId}: ${(error as Error).message}`,
                (error as Error).stack,
            );
            if (error instanceof HttpException) {
                throw error;
            }
            throw new HttpException(
                'An unexpected error occurred while processing your message.',
                HttpStatus.INTERNAL_SERVER_ERROR,
            );
        }
    }

    @UseGuards(AuthenticatedGuard)
    @Get('list')
    async getUserChats(@Req() req: AuthenticatedRequest) {
        const userId = this.getUserIdFromRequest(req);
        this.logger.log(`Fetching all chats for user ${userId}`);
        return this.chatService.getUserChats(userId);
    }

    @UseGuards(AuthenticatedGuard)
    @Post('new')
    @UsePipes(new ValidationPipe({ transform: true, whitelist: true, skipMissingProperties: true }))
    async createNewChat(@Body() createChatDto: CreateChatDto, @Req() req: AuthenticatedRequest) {
        const userId = this.getUserIdFromRequest(req);
        this.logger.log(`User ${userId} - Explicitly creating new chat with title: ${createChatDto.title}`);
        return this.chatService.createChat(userId, createChatDto);
    }


    @UseGuards(AuthenticatedGuard)
    @Get(':chatId/messages')
    async getChatMessages(
        @Param('chatId') chatId: string,
        @Req() req: AuthenticatedRequest,
    ) {
        const userId = this.getUserIdFromRequest(req);
        this.logger.log(`Fetching messages for chat ${chatId} for user ${userId}`);
        return this.chatService.getChatMessages(userId, chatId);
    }

    @UseGuards(AuthenticatedGuard) // Using AuthenticatedGuard for consistency
    @Get('compiled-document/:chatId')
    async getCompiledDocument(
        @Param('chatId') chatId: string,
        @Req() req: AuthenticatedRequest,
    ): Promise<CompiledDocumentDto | null> {
        const userId = this.getUserIdFromRequest(req); // Use helper for consistency
        this.logger.log(`User ${userId} requesting compiled document for chat ID: ${chatId}`);
        try {
            const compiledDoc = await this.chatService.getCompiledDocumentByChatId(userId, chatId);
            if (!compiledDoc) {
                throw new HttpException('Compiled document not found.', HttpStatus.NOT_FOUND);
            }
            return compiledDoc;
        } catch (error) {
            this.logger.error(
                `Error fetching compiled document for chat ID ${chatId}, user ${userId}: ${(error as Error).message}`,
                (error as Error).stack,
            );
            if (error instanceof HttpException) {
                throw error;
            }
            throw new InternalServerErrorException('Failed to fetch compiled document.');
        }
    }

    // MODIFIED: Use AuthenticatedGuard instead of JwtAuthGuard
    @UseGuards(AuthenticatedGuard)
    @Get(':chatId/download-compiled')
    async downloadCompiledDocument(
        @Param('chatId') chatId: string,
        @Req() req: AuthenticatedRequest, // AuthenticatedGuard populates req.user
        @Res({ passthrough: true }) res: Response,
    ): Promise<StreamableFile> {
        const userId = this.getUserIdFromRequest(req); // Use helper
        this.logger.log(`User ${userId} requesting PDF download for compiled document of chat ${chatId}`);
        try {
            const docDataFromChatService: CompiledDocumentDownloadData = await this.chatService.prepareDataForCompiledDocumentDownload(chatId, req.user.id);

            let originalFileBuffer: Buffer | undefined;
            let originalFileType: CompiledPdfData['originalFileType'] = 'unsupported';

            if (docDataFromChatService.sourceFileBlobPathname) {
                try {
                    // This line should now work as OcrService has the method
                    originalFileBuffer = await this.ocrService.fetchFileBufferFromBlob(docDataFromChatService.sourceFileBlobPathname, `chat ${chatId} PDF document download`);
                    const extension = docDataFromChatService.originalFileName?.split('.').pop()?.toLowerCase();
                    if (extension === 'pdf') originalFileType = 'pdf';
                    else if (extension === 'png') originalFileType = 'png';
                    else if (extension === 'jpg' || extension === 'jpeg') originalFileType = 'jpeg';
                    else {
                        this.logger.warn(`Original file ${docDataFromChatService.originalFileName} has unsupported extension for direct PDF embedding: ${extension}`);
                    }
                } catch (error) {
                    this.logger.error(`Failed to fetch original file ${docDataFromChatService.sourceFileBlobPathname} for chat ${chatId} PDF download: ${(error as Error).message}`);
                    // Optionally, inform the user in the PDF that the original file couldn't be fetched
                }
            }

            const pdfData: CompiledPdfData = {
                originalFileName: docDataFromChatService.originalFileName || 'Unknown Document',
                extractedOcrText: docDataFromChatService.extractedOcrText,
                chatHistory: docDataFromChatService.chatHistoryJson as ChatHistoryPdfItem[] || [],
                originalFileBuffer,
                originalFileType,
            };

            const pdfBytes = await this.pdfGenerationService.generateCompiledPdf(pdfData);

            const safeOriginalNameBase = (docDataFromChatService.originalFileName || chatId)
                .replace(/\.[^/.]+$/, "")
                .replace(/[^a-z0-9_.-]/gi, '_');
            const downloadPdfFileName = `compiled_doc_${safeOriginalNameBase}.pdf`;

            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', `attachment; filename="${downloadPdfFileName}"`);

            return new StreamableFile(Buffer.from(pdfBytes));

        } catch (error) {
            this.logger.error(`Error during PDF downloadCompiledDocument for chat ${chatId}: ${(error as Error).message}`, (error as Error).stack);
            if (error instanceof NotFoundException) {
                throw error;
            }
            throw new InternalServerErrorException('An error occurred while preparing the document for PDF download.');
        }
    }
}