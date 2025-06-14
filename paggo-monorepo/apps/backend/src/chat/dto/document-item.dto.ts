import { ApiProperty } from '@nestjs/swagger'; // Optional: for Swagger documentation

export class DocumentItemDto {
    @ApiProperty()
    documentId: string; // This will be the Message ID

    @ApiProperty()
    chatId: string;

    @ApiProperty()
    fileName: string;

    @ApiProperty()
    uploadDate: Date;

    @ApiProperty({ nullable: true })
    chatTitle: string | null;
}