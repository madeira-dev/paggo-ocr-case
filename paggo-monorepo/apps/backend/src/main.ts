console.log("[Backend] main.ts execution started"); // debug
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { MethodNotAllowedException } from '@nestjs/common';

async function bootstrap() {
    const app = await NestFactory.create(AppModule);
    app.enableCors({
        origin: [
            'https://paggo-ocr-case-backend.vercel.app',
            'http://localhost:3001' // remove this later
        ],
        methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    });
    const port = process.env.PORT || 3000;
    await app.listen(port);
    console.log(`Backend application running on: ${await app.getUrl()}`);
}
bootstrap();
