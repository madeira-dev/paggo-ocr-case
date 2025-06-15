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
import pdf = require('pdf-parse');
import axios from 'axios';

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

        // Ensure this method calls the public fetchFileBufferFromBlob or has its own fetch logic
        const fileBuffer = await this.fetchFileBufferFromBlob(blobPathname, `OCR processing for ${originalFileName}`);
        // ... rest of OCR logic from previous implementation ...
        const fileType = originalFileName.split('.').pop()?.toLowerCase() || '';
        let extractedText: string;

        if (fileType === 'pdf') {
            const data = await pdf(fileBuffer);
            extractedText = data.text;
        } else if (['png', 'jpeg', 'jpg', 'tiff', 'bmp', 'webp'].includes(fileType)) {
            const worker = await createWorker('eng');
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
        return extractedText || "";
    }

    // Ensure this public method exists
    async fetchFileBufferFromBlob(blobPathname: string, contextMessage: string = "file operation"): Promise<Buffer> {
        if (!this.vercelBlobBaseUrl) {
            this.logger.error(`VERCEL_BLOB_BASE_URL is not configured. Cannot proceed with ${contextMessage}.`);
            throw new InternalServerErrorException('Blob storage URL not configured on server.');
        }

        const baseUrl = this.vercelBlobBaseUrl.endsWith('/')
            ? this.vercelBlobBaseUrl
            : `${this.vercelBlobBaseUrl}/`;
        const fileUrl = `${baseUrl}${blobPathname}`;

        this.logger.log(`Fetching file for ${contextMessage} from Vercel Blob: ${fileUrl}`);

        try {
            const response = await firstValueFrom(
                this.httpService.get(fileUrl, { responseType: 'arraybuffer' }),
            );
            const fileBuffer = Buffer.from(response.data);
            this.logger.log(
                `Successfully fetched ${blobPathname} (${fileBuffer.length} bytes) for ${contextMessage}.`,
            );
            return fileBuffer;
        } catch (error: any) {
            this.logger.error(
                `Failed to fetch file ${blobPathname} from ${fileUrl} for ${contextMessage}: ${error.message}`,
                error.stack,
            );
            if (axios.isAxiosError(error) && error.response?.status === 404) {
                throw new NotFoundException(`File not found at Vercel Blob: ${blobPathname}`);
            }
            throw new InternalServerErrorException(
                `Failed to fetch file from blob storage for ${contextMessage}: ${error.message}`,
            );
        }
    }
}