import { IsString, IsOptional, IsUUID, IsNotEmpty } from 'class-validator';

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
    fileName?: string; // Original name of the uploaded file
}