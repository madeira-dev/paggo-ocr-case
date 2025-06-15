import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { MessageSender } from '../../../generated/prisma';

// Define ChatHistoryItem as a class for Swagger documentation
export class ChatHistoryItem {
    @ApiProperty({ enum: ['USER', 'BOT'], example: 'USER' })
    sender: 'USER' | 'BOT';

    @ApiProperty({ example: 'This is a sample message.' })
    content: string;

    @ApiProperty({ example: '2025-06-14T10:30:00.000Z', description: 'ISO Date string' })
    createdAt: string;

    @ApiPropertyOptional({ example: true })
    isSourceDocument?: boolean;

    @ApiPropertyOptional({ example: 'document.pdf' })
    fileName?: string;
}

export interface ChatHistoryItemDto {
    sender: MessageSender; // Or 'USER' | 'BOT' if you prefer string literals
    content: string;
    createdAt: string; // ISO Date string
    isSourceDocument?: boolean;
    fileName?: string; // Original file name for the source document message
}

export class CompiledDocumentDto {
    @ApiProperty()
    id: string;

    @ApiProperty()
    chatId: string;

    @ApiProperty()
    sourceMessageId: string;

    @ApiProperty()
    originalFileName: string; // The original name of the uploaded file

    @ApiProperty()
    sourceFileBlobPathname: string; // ADDED: The Vercel Blob pathname for the source file

    @ApiProperty()
    extractedOcrText: string;

    @ApiProperty({
        type: () => ChatHistoryItem,
        isArray: true,
        nullable: true,
        example: [
            { sender: 'USER', content: 'Hello, this is the first message regarding the document.', createdAt: '2025-06-14T10:30:00.000Z', isSourceDocument: true, fileName: 'invoice.pdf' },
            { sender: 'BOT', content: 'Okay, I have processed invoice.pdf. What would you like to know?', createdAt: '2025-06-14T10:30:05.000Z' }
        ]
    })
    chatHistoryJson: ChatHistoryItemDto[] | null;

    @ApiProperty({ type: String, format: 'date-time', example: '2025-06-14T10:30:00.000Z' }) // MODIFIED: Type to string
    createdAt: string;

    @ApiProperty({ type: String, format: 'date-time', example: '2025-06-14T10:35:00.000Z' }) // MODIFIED: Type to string
    updatedAt: string;
}