import {
    Controller,
    Post,
    Body,
    Logger,
    BadRequestException,
    InternalServerErrorException,
    HttpException,
} from '@nestjs/common';
import { OcrService } from './ocr.service';

// Define the expected payload structure
interface ExtractTextPayloadDto {
    blobPathname: string;
    originalFileName: string;
}

@Controller('ocr')
export class OcrController {
    private readonly logger = new Logger(OcrController.name);

    constructor(private readonly ocrService: OcrService) { }

    @Post('extract-text')
    async extractTextFromBlob( // Method name changed for clarity
        @Body() payload: ExtractTextPayloadDto, // MODIFIED: Use @Body() to get JSON payload
    ): Promise<{ text: string }> { // Ensure response matches frontend expectation
        this.logger.log(
            `Received request to extract text from blob: ${payload.blobPathname} (Original: ${payload.originalFileName})`,
        );

        if (!payload || !payload.blobPathname || !payload.originalFileName) {
            this.logger.error(
                'Invalid payload for OCR extraction from blob. Missing blobPathname or originalFileName.',
            );
            throw new BadRequestException(
                'Invalid payload. Missing blobPathname or originalFileName.',
            );
        }

        try {
            const extractedText = await this.ocrService.extractTextFromBlob(
                payload.blobPathname,
                payload.originalFileName,
            );
            return { text: extractedText }; // Return in the format expected by frontend
        } catch (error) {
            this.logger.error(
                `Error in OcrController while processing blob ${payload.blobPathname}: ${(error as Error).message}`,
                (error as Error).stack,
            );
            if (error instanceof HttpException) {
                throw error; // Re-throw if it's already an HttpException (like 400, 404, 500 from service)
            }
            throw new InternalServerErrorException(
                'An unexpected error occurred during OCR processing.',
            );
        }
    }
}