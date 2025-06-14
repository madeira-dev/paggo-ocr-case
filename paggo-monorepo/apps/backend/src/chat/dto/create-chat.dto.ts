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
    initialExtractedOcrText?: string;

    @IsOptional()
    @IsString()
    initialFileName?: string;
}

