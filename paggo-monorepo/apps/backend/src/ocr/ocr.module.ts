import { Module } from '@nestjs/common';
import { OcrController } from './ocr.controller';
import { OcrService } from './ocr.service';
import { HttpModule } from '@nestjs/axios';
import { ConfigModule } from '@nestjs/config';

@Module({
    imports: [
        HttpModule,
        ConfigModule,
    ],
    controllers: [OcrController],
    providers: [OcrService],
    exports: [OcrService], // ADD THIS LINE
})
export class OcrModule { }