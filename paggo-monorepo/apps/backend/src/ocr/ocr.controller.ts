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
import * as cuid from 'cuid'; // Import cuid
import * as path from 'path'; // Import path

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

            const originalName = file.originalname;
            const extension = path.extname(originalName);
            const baseName = path.basename(originalName, extension);
            const uniqueId = cuid();
            // You can choose the format. Example: originalfilename_cuid.ext
            const storedFileName = `${baseName}_${uniqueId}${extension}`;
            // Or, if you prefer a completely unique name not tied to original:
            // const storedFileName = `${uniqueId}${extension}`;


            return {
                text: extractedText,
                storedFileName: storedFileName,
                originalFileName: originalName,
            };
        } catch (error) {
            this.logger.error(
                `Failed to extract text from file: ${file.originalname}`,
                (error as Error).stack,
            );
            // Ensure the error message from OcrService (like unsupported type) is propagated
            if (error instanceof HttpException) {
                throw error;
            }
            throw new HttpException(
                (error as Error).message || 'Failed to extract text from file.',
                HttpStatus.INTERNAL_SERVER_ERROR,
            );
        }
    }
}