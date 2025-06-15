// filepath: apps/backend/src/pdf/pdf.module.ts
import { Module } from '@nestjs/common';
import { PdfGenerationService } from './pdf-generation.service';

@Module({
    providers: [PdfGenerationService],
    exports: [PdfGenerationService],
})
export class PdfModule { }