import { Module } from '@nestjs/common';
import { OcrController } from './ocr.controller';
import { OcrService } from './ocr.service';
import { HttpModule } from '@nestjs/axios'; // Ensure HttpModule is imported
import { ConfigModule } from '@nestjs/config'; // Ensure ConfigModule is imported (or globally available)

@Module({
    imports: [
        HttpModule, // Make HttpService available
        ConfigModule, // Make ConfigService available
    ],
    controllers: [OcrController],
    providers: [OcrService],
})
export class OcrModule { }