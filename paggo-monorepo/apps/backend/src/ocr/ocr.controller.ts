import {
    Controller,
    Post,
    UploadedFile,
    UseInterceptors,
    Logger,
    HttpException,
    HttpStatus,
    ParseFilePipeBuilder,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { OcrService } from './ocr.service';
import { Express } from 'express';

@Controller('ocr')
export class OcrController {
    private readonly logger = new Logger(OcrController.name);
    constructor(private readonly ocrService: OcrService) { }

    @Post('extract-text')
    @UseInterceptors(FileInterceptor('file'))
    async extractText(
        @UploadedFile(
            new ParseFilePipeBuilder()
                .addFileTypeValidator({
                    fileType: /(jpg|jpeg|png|pdf)$/i,
                })
                .addMaxSizeValidator({
                    maxSize: 10 * 1024 * 1024, // 10MB limit
                })
                .build({
                    exceptionFactory: (error) => {
                        (this as any).this.logger.error(`File validation failed: ${error}`);
                        return new HttpException(
                            `File validation failed: ${error}. Please upload a valid image (JPG, PNG, GIF) or PDF file under 10MB.`,
                            HttpStatus.BAD_REQUEST,
                        );
                    },
                    errorHttpStatusCode: HttpStatus.BAD_REQUEST,
                }),
        )
        file: Express.Multer.File,
    ) {
        this.logger.log(
            `Received file for OCR: ${file?.originalname}, type: ${file?.mimetype}, size: ${file?.size} bytes`,
        );

        if (!file) {
            this.logger.error('No file uploaded for OCR.');
            throw new HttpException('No file uploaded', HttpStatus.BAD_REQUEST);
        }

        try {
            const extractedText = await this.ocrService.extractTextFromFile(file);
            this.logger.log(
                `Successfully extracted text from file: ${file.originalname}`,
            );
            return { text: extractedText };
        } catch (error) {
            this.logger.error(
                `Failed to extract text from file: ${file.originalname}`,
                (error as Error).stack,
            );
            throw new HttpException(
                (error as Error).message || 'Failed to extract text from file.',
                HttpStatus.INTERNAL_SERVER_ERROR,
            );
        }
    }
}