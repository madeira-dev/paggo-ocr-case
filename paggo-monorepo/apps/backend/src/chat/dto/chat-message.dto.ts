import { IsString, IsOptional } from 'class-validator';

export class ChatMessageDto {
    @IsString()
    message: string; // user's message

    @IsOptional()
    @IsString()
    extractedOcrText?: string; // extracted text with OCR

    @IsOptional()
    @IsString()
    fileName?: string; // file name
}