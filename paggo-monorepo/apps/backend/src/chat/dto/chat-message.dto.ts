import { IsString, IsOptional, IsUrl } from 'class-validator';

export class ChatMessageDto {
    @IsString()
    message: string;

    @IsOptional()
    @IsUrl({}, { message: 'imageUrl must be a valid URL' })
    imageUrl?: string;
}