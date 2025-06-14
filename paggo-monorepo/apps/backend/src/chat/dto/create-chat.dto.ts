import { IsString, IsOptional, MaxLength } from 'class-validator';

export class CreateChatDto {
    @IsOptional()
    @IsString()
    @MaxLength(255)
    title?: string;

    @IsOptional()
    @IsString()
    initialUserMessage?: string;

    @IsOptional()
    @IsString()
    extractedOcrText?: string; // ADDED: Optional property

    @IsOptional()
    @IsString()
    fileName?: string; // ADDED: Optional property
}

