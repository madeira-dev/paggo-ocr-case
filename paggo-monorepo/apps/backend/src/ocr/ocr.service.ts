import { Injectable, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { createWorker, OEM } from 'tesseract.js';
import * as pdfParse from 'pdf-parse'; // Import pdf-parse
import { Express } from 'express'; // Ensure Express is imported if not already

@Injectable()
export class OcrService {
    private readonly logger = new Logger(OcrService.name);

    async extractTextFromFile(file: Express.Multer.File): Promise<string> {
        this.logger.log(
            `Processing file: ${file.originalname}, type: ${file.mimetype}`,
        );

        if (file.mimetype.startsWith('image/')) {
            return this.extractTextFromImage(file.buffer, file.originalname);
        } else if (file.mimetype === 'application/pdf') {
            return this.extractTextFromPdf(file.buffer, file.originalname);
        } else {
            this.logger.warn(`Unsupported file type: ${file.mimetype} for file ${file.originalname}`);
            throw new HttpException(
                `Unsupported file type: ${file.mimetype}. Please upload an image or PDF.`,
                HttpStatus.BAD_REQUEST,
            );
        }
    }

    private async extractTextFromImage(imageBuffer: Buffer, fileName: string): Promise<string> {
        this.logger.log(`Initializing Tesseract worker for image: ${fileName}`);
        const worker = await createWorker('eng', OEM.TESSERACT_ONLY, { // Using OEM.TESSERACT_ONLY for potentially better results with Tesseract 4+
            // logger: m => this.logger.debug(`Tesseract (${fileName}): ${m.status} (${(m.progress * 100).toFixed(2)}%)`), // Detailed progress
        });

        try {
            this.logger.log(`Performing OCR on image: ${fileName}`);
            const {
                data: { text },
            } = await worker.recognize(imageBuffer);
            this.logger.log(`OCR processing complete for image: ${fileName}`);
            if (!text || text.trim() === "") {
                this.logger.warn(`Tesseract returned empty text for image: ${fileName}`);
                // return `[No text could be extracted from image: ${fileName}]`; // Or throw an error, or return empty string
            }
            return text || ""; // Return empty string if text is null/undefined
        } catch (error) {
            this.logger.error(`Error during Tesseract OCR for image ${fileName}:`, error);
            throw new HttpException(
                `Failed to extract text from image ${fileName} using OCR.`,
                HttpStatus.INTERNAL_SERVER_ERROR,
            );
        } finally {
            this.logger.log(`Terminating Tesseract worker for image: ${fileName}`);
            await worker.terminate();
        }
    }

    private async extractTextFromPdf(pdfBuffer: Buffer, fileName: string): Promise<string> {
        this.logger.log(`Extracting text from PDF: ${fileName}`);
        try {
            const data = await pdfParse(pdfBuffer);
            this.logger.log(`Text extraction complete for PDF: ${fileName}`);
            if (!data.text || data.text.trim() === "") {
                this.logger.warn(`pdf-parse returned empty text for PDF: ${fileName}. This PDF might be image-based or have no selectable text.`);
                // For image-based PDFs, Tesseract would be needed page by page.
                // This current implementation only handles text-based PDFs.
                // Consider returning a specific message or attempting image OCR if pdf-parse fails.
                // For now, we'll return what pdf-parse gives, which might be empty.
            }
            return data.text || ""; // Return empty string if text is null/undefined
        } catch (error) {
            this.logger.error(`Error during PDF text extraction for ${fileName}:`, error);
            throw new HttpException(
                `Failed to extract text from PDF ${fileName}. The PDF might be corrupted or an unsupported format.`,
                HttpStatus.INTERNAL_SERVER_ERROR,
            );
        }
    }
}