import { IsString, IsOptional, IsNotEmpty } from 'class-validator';

export class ChatMessageDto {
    @IsOptional() // if not provided, a new chat might be initiated
    @IsString()
    @IsNotEmpty()
    chatId?: string;

    @IsString()
    @IsNotEmpty()
    message: string; // User's typed message

    @IsOptional()
    @IsString()
    extractedOcrText?: string; // Text extracted by OCR

    @IsOptional()
    @IsString()
    fileName?: string; // This should ideally be the Vercel Blob pathname/URL

    @IsOptional()
    @IsString()
    originalUserFileName?: string; // The original name of the file uploaded by the user
}