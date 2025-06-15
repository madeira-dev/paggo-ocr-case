// filepath: apps/backend/src/pdf/pdf-generation.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { PDFDocument, StandardFonts, rgb, PageSizes, PDFFont, PDFPage } from 'pdf-lib';
import { MessageSender } from '../../generated/prisma';

// Matches the ChatHistoryItemDto from chat.dto.ts
export interface ChatHistoryPdfItem {
    sender: MessageSender;
    content: string;
    createdAt: string; // ISO Date string
    isSourceDocument?: boolean;
    fileName?: string;
}

export interface CompiledPdfData {
    originalFileName: string;
    extractedOcrText: string;
    chatHistory: ChatHistoryPdfItem[] | null;
    originalFileBuffer?: Buffer;
    originalFileType?: 'pdf' | 'png' | 'jpeg' | 'unsupported';
}

@Injectable()
export class PdfGenerationService {
    private readonly logger = new Logger(PdfGenerationService.name);

    private sanitizeTextForWinAnsi(text: string | null | undefined): string {
        if (!text) return '';
        let sanitized = '';
        for (let i = 0; i < text.length; i++) {
            const char = text[i];
            const code = text.charCodeAt(i);

            // Allow newline, carriage return, tab as addWrappedTextToPage handles them
            if (char === '\n' || char === '\r' || char === '\t') {
                sanitized += char;
                continue;
            }

            // Basic printable ASCII
            if (code >= 0x0020 && code <= 0x007E) {
                sanitized += char;
                continue;
            }

            // Latin-1 Supplement (includes many accented chars, common symbols)
            if (code >= 0x00A0 && code <= 0x00FF) {
                sanitized += char;
                continue;
            }

            // Specific WinAnsi characters from the C1 control range (mapped to Unicode)
            const winAnsiExtras = [
                0x20AC, // € Euro sign
                0x201A, // ‚ Single low-9 quotation mark
                0x0192, // ƒ Latin small letter f with hook
                0x201E, // „ Double low-9 quotation mark
                0x2026, // … Horizontal ellipsis
                0x2020, // † Dagger
                0x2021, // ‡ Double dagger
                0x02C6, // ˆ Modifier letter circumflex accent
                0x2030, // ‰ Per mille sign
                0x0160, // Š Latin capital letter S with caron
                0x2039, // ‹ Single left-pointing angle quotation mark
                0x0152, // Œ Latin capital ligature OE
                0x017D, // Ž Latin capital letter Z with caron
                // 0x008E is unassigned in WinAnsi, maps to U+017D (Ž) in some contexts but better to be explicit
                0x2018, // ‘ Left single quotation mark
                0x2019, // ’ Right single quotation mark
                0x201C, // “ Left double quotation mark
                0x201D, // ” Right double quotation mark
                0x2022, // • Bullet (WinAnsi supports this one)
                0x2013, // – En dash
                0x2014, // — Em dash
                0x02DC, // ˜ Small tilde
                0x2122, // ™ Trade mark sign
                0x0161, // š Latin small letter s with caron
                0x203A, // › Single right-pointing angle quotation mark
                0x0153, // œ Latin small ligature oe
                // 0x009E is unassigned in WinAnsi, maps to U+017E (ž)
                0x017E, // ž Latin small letter z with caron
                0x0178, // Ÿ Latin capital letter Y with diaeresis
            ];

            if (winAnsiExtras.includes(code)) {
                sanitized += char;
                continue;
            }

            // Replace unsupported characters (like "●" U+25CF) with '?'
            sanitized += '?';
        }
        return sanitized;
    }

    private async addWrappedTextToPage(
        page: PDFPage,
        text: string, // This text can contain \n
        font: PDFFont,
        size: number,
        x: number,
        startY: number,
        maxWidth: number,
        pageBottomMargin: number,
        lineHeight: number,
        pdfDoc: PDFDocument,
    ): Promise<{ currentPage: PDFPage, yPosition: number }> {
        let y = startY;
        let currentPage = page;
        // Text parameter is now expected to be pre-sanitized
        const naturalTextLines = text.split('\n');

        for (const lineContent of naturalTextLines) {
            if (lineContent.trim() === "") {
                if (y - lineHeight < pageBottomMargin) {
                    currentPage = pdfDoc.addPage(PageSizes.A4);
                    y = PageSizes.A4[1] - 50;
                }
                y -= lineHeight;
                continue;
            }

            const words = lineContent.split(' ');
            let currentLineSegment = '';

            for (const word of words) {
                if (word.trim() === '' && currentLineSegment.trim() === '') continue;

                const testSegment = currentLineSegment + (currentLineSegment ? ' ' : '') + word;
                const segmentWidth = font.widthOfTextAtSize(testSegment, size); // This line caused the error

                if (segmentWidth <= maxWidth) {
                    currentLineSegment = testSegment;
                } else {
                    if (currentLineSegment.trim() !== "") {
                        if (y - lineHeight < pageBottomMargin) {
                            currentPage = pdfDoc.addPage(PageSizes.A4);
                            y = PageSizes.A4[1] - 50;
                        }
                        currentPage.drawText(currentLineSegment, { x, y, font, size, color: rgb(0, 0, 0), lineHeight });
                        y -= lineHeight;
                    }
                    currentLineSegment = word;

                    if (font.widthOfTextAtSize(currentLineSegment, size) > maxWidth && currentLineSegment.trim() !== "") {
                        if (y - lineHeight < pageBottomMargin) {
                            currentPage = pdfDoc.addPage(PageSizes.A4);
                            y = PageSizes.A4[1] - 50;
                        }
                        currentPage.drawText(currentLineSegment, { x, y, font, size, color: rgb(0, 0, 0), lineHeight });
                        y -= lineHeight;
                        currentLineSegment = '';
                    }
                }
            }

            if (currentLineSegment.trim() !== "") {
                if (y - lineHeight < pageBottomMargin) {
                    currentPage = pdfDoc.addPage(PageSizes.A4);
                    y = PageSizes.A4[1] - 50;
                }
                currentPage.drawText(currentLineSegment, { x, y, font, size, color: rgb(0, 0, 0), lineHeight });
                y -= lineHeight;
            }
        }
        return { currentPage, yPosition: y };
    }


    async generateCompiledPdf(data: CompiledPdfData): Promise<Buffer> {
        this.logger.log(`Starting PDF generation for: ${data.originalFileName}`);
        const pdfDoc = await PDFDocument.create();
        const helveticaFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
        const helveticaBoldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

        const pageMargin = 50;
        const contentWidth = PageSizes.A4[0] - 2 * pageMargin;
        const contentHeight = PageSizes.A4[1] - 2 * pageMargin;

        let currentPage: PDFPage;
        let currentY: number;

        // --- 1. Add Original Document ---
        if (data.originalFileBuffer) {
            if (data.originalFileType === 'pdf') {
                try {
                    const originalPdf = await PDFDocument.load(data.originalFileBuffer);
                    const copiedPageIndices = originalPdf.getPageIndices();
                    const copiedPages = await pdfDoc.copyPages(originalPdf, copiedPageIndices);
                    copiedPages.forEach(p => pdfDoc.addPage(p));
                    this.logger.log(`Embedded ${copiedPages.length} pages from original PDF.`);
                    if (pdfDoc.getPageCount() > 0) {
                        currentPage = pdfDoc.getPage(pdfDoc.getPageCount() - 1);
                    }
                } catch (e) {
                    this.logger.error('Failed to embed original PDF', (e as Error).stack);
                    const errorPage = pdfDoc.addPage(PageSizes.A4);
                    // Error messages are ASCII, no sanitization needed for this hardcoded string
                    await this.addWrappedTextToPage(errorPage, 'Error: Could not embed the original PDF document.', helveticaFont, 12, pageMargin, contentHeight + pageMargin - 20, contentWidth, pageMargin, 14, pdfDoc);
                    currentPage = errorPage;
                }
            } else if (data.originalFileType === 'png' || data.originalFileType === 'jpeg') {
                try {
                    const imagePage = pdfDoc.addPage(PageSizes.A4);
                    const embeddedImage = data.originalFileType === 'png'
                        ? await pdfDoc.embedPng(data.originalFileBuffer)
                        : await pdfDoc.embedJpg(data.originalFileBuffer);
                    const dims = embeddedImage.scaleToFit(contentWidth, contentHeight);
                    imagePage.drawImage(embeddedImage, {
                        x: (PageSizes.A4[0] - dims.width) / 2,
                        y: (PageSizes.A4[1] - dims.height) / 2,
                        width: dims.width,
                        height: dims.height,
                    });
                    this.logger.log(`Embedded original image: ${this.sanitizeTextForWinAnsi(data.originalFileName)}`); // Sanitize filename for logging if desired
                    currentPage = imagePage;
                } catch (e) {
                    this.logger.error('Failed to embed original image', (e as Error).stack);
                    const errorPage = pdfDoc.addPage(PageSizes.A4);
                    await this.addWrappedTextToPage(errorPage, 'Error: Could not embed the original image document.', helveticaFont, 12, pageMargin, contentHeight + pageMargin - 20, contentWidth, pageMargin, 14, pdfDoc);
                    currentPage = errorPage;
                }
            } else { // Unsupported type
                const unsupportedPage = pdfDoc.addPage(PageSizes.A4);
                const unsupportedMessage = `Original file (${this.sanitizeTextForWinAnsi(data.originalFileName)}) is of an unsupported type for direct embedding.`;
                await this.addWrappedTextToPage(unsupportedPage, unsupportedMessage, helveticaFont, 12, pageMargin, contentHeight + pageMargin - 20, contentWidth, pageMargin, 14, pdfDoc);
                currentPage = unsupportedPage;
            }
        } else { // No original file buffer
            const noFilePage = pdfDoc.addPage(PageSizes.A4);
            await this.addWrappedTextToPage(noFilePage, 'Original file was not available for embedding.', helveticaFont, 12, pageMargin, contentHeight + pageMargin - 20, contentWidth, pageMargin, 14, pdfDoc);
            currentPage = noFilePage;
        }


        // --- 2. Add OCR Extracted Text ---
        let ocrPage = pdfDoc.addPage(PageSizes.A4);
        let ocrY = contentHeight + pageMargin - 20;
        ocrPage.drawText('OCR Extracted Text', { x: pageMargin, y: ocrY, font: helveticaBoldFont, size: 16 }); // ASCII title
        ocrY -= 25;

        const sanitizedOcrText = this.sanitizeTextForWinAnsi(data.extractedOcrText || 'No OCR text extracted.');
        const ocrResult = await this.addWrappedTextToPage(ocrPage, sanitizedOcrText, helveticaFont, 10, pageMargin, ocrY, contentWidth, pageMargin, 12, pdfDoc);
        currentPage = ocrResult.currentPage;
        currentY = ocrResult.yPosition;
        this.logger.log('Added OCR text to PDF.');

        // --- 3. Add Chat History ---
        if (currentPage !== ocrPage || currentY < pageMargin + 100) {
            currentPage = pdfDoc.addPage(PageSizes.A4);
            currentY = contentHeight + pageMargin - 20;
        } else {
            currentY -= 20;
        }

        currentPage.drawText('Chat History', { x: pageMargin, y: currentY, font: helveticaBoldFont, size: 16 }); // ASCII title
        currentY -= 25;

        if (data.chatHistory && data.chatHistory.length > 0) {
            for (const msg of data.chatHistory) {
                const senderName = msg.sender === 'USER' ? 'User' : 'AI'; // ASCII
                const timestamp = new Date(msg.createdAt).toLocaleString(); // Standard date/time chars, generally safe
                const headerText = this.sanitizeTextForWinAnsi(`${senderName} [${timestamp}]:`); // Sanitize just in case localeString has odd chars

                const headerResult = await this.addWrappedTextToPage(currentPage, headerText, helveticaBoldFont, 10, pageMargin, currentY, contentWidth, pageMargin, 12, pdfDoc);
                currentPage = headerResult.currentPage;
                currentY = headerResult.yPosition;
                currentY -= 5;

                const sanitizedMsgContent = this.sanitizeTextForWinAnsi(msg.content);
                const contentResult = await this.addWrappedTextToPage(currentPage, sanitizedMsgContent, helveticaFont, 10, pageMargin, currentY, contentWidth, pageMargin, 12, pdfDoc);
                currentPage = contentResult.currentPage;
                currentY = contentResult.yPosition;

                if (msg.fileName) {
                    const sanitizedFileName = this.sanitizeTextForWinAnsi(msg.fileName);
                    const fileText = `(Attached file: ${sanitizedFileName})`; // Already sanitized
                    const fileTextResult = await this.addWrappedTextToPage(currentPage, fileText, helveticaFont, 8, pageMargin + 10, currentY, contentWidth - 10, pageMargin, 10, pdfDoc);
                    currentPage = fileTextResult.currentPage;
                    currentY = fileTextResult.yPosition;
                }
                currentY -= 15;
            }
        } else {
            const noHistoryResult = await this.addWrappedTextToPage(currentPage, 'No chat history available.', helveticaFont, 10, pageMargin, currentY, contentWidth, pageMargin, 12, pdfDoc); // ASCII
            currentPage = noHistoryResult.currentPage;
        }
        this.logger.log('Added chat history to PDF.');

        const pdfBytes = await pdfDoc.save();
        this.logger.log(`PDF generation complete. Size: ${pdfBytes.length} bytes.`);
        return Buffer.from(pdfBytes);
    }
}