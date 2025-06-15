import {
    Injectable,
    Logger,
    InternalServerErrorException,
    BadRequestException,
    NotFoundException,
} from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import { createWorker } from 'tesseract.js';
import pdf = require('pdf-parse'); // Using pdf-parse for PDF text extraction
import axios from 'axios'; // For checking AxiosError type

@Injectable()
export class OcrService {
    private readonly logger = new Logger(OcrService.name);
    private readonly vercelBlobBaseUrl: string;

    constructor(
        private readonly httpService: HttpService,
        private readonly configService: ConfigService,
    ) {
        this.vercelBlobBaseUrl = this.configService.get<string>('VERCEL_BLOB_BASE_URL') || '';
        if (!this.vercelBlobBaseUrl) {
            this.logger.warn(
                'VERCEL_BLOB_BASE_URL is not set in OcrService. Cannot fetch files from blob.',
            );
        }
    }

    async extractTextFromBlob(blobPathname: string, originalFileName: string): Promise<string> {
        this.logger.log(
            `Attempting to extract text from blob: ${blobPathname} (Original: ${originalFileName})`,
        );

        if (!this.vercelBlobBaseUrl) {
            this.logger.error('VERCEL_BLOB_BASE_URL is not configured on the server.');
            throw new InternalServerErrorException('Blob storage URL not configured on server.');
        }

        // Ensure no double slashes if vercelBlobBaseUrl already ends with one
        const baseUrl = this.vercelBlobBaseUrl.endsWith('/')
            ? this.vercelBlobBaseUrl
            : `${this.vercelBlobBaseUrl}/`;
        const fileUrl = `${baseUrl}${blobPathname}`;

        this.logger.log(`Fetching file from Vercel Blob: ${fileUrl}`);

        try {
            const response = await firstValueFrom(
                this.httpService.get(fileUrl, { responseType: 'arraybuffer' }),
            );
            const fileBuffer = Buffer.from(response.data);

            this.logger.log(
                `Successfully fetched ${blobPathname} (${fileBuffer.length} bytes). Performing OCR.`,
            );

            const fileType = originalFileName.split('.').pop()?.toLowerCase() || '';
            let extractedText: string;

            if (fileType === 'pdf') {
                const data = await pdf(fileBuffer);
                extractedText = data.text;
            } else if (['png', 'jpeg', 'jpg', 'tiff', 'bmp', 'webp'].includes(fileType)) {
                const worker = await createWorker('eng'); // Ensure 'eng.traineddata' is available
                const { data: { text } } = await worker.recognize(fileBuffer);
                extractedText = text;
                await worker.terminate();
            } else {
                this.logger.warn(`Unsupported file type for OCR: ${fileType} for file ${originalFileName}`);
                throw new BadRequestException(`Unsupported file type for OCR: ${fileType}`);
            }

            this.logger.log(
                `OCR successful for ${originalFileName}. Extracted text length: ${extractedText?.length || 0}`,
            );
            return extractedText || ""; // Return empty string if null/undefined
        } catch (error: any) {
            this.logger.error(
                `Failed to fetch or OCR file ${blobPathname} from ${fileUrl}: ${error.message}`,
                error.stack,
            );
            if (axios.isAxiosError(error) && error.response?.status === 404) {
                throw new NotFoundException(`File not found at Vercel Blob: ${blobPathname}`);
            }
            // Check for tesseract.js specific errors if any common ones exist
            if (error.message && error.message.includes("TesseractNotInitialized")) {
                throw new InternalServerErrorException(`OCR engine initialization failed. Please try again or check server logs.`);
            }
            throw new InternalServerErrorException(
                `Failed to process file from blob storage: ${error.message}`,
            );
        }
    }
}