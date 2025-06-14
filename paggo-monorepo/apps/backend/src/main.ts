console.log("[Backend] main.ts execution started"); // debug
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common'; // Import ValidationPipe

async function bootstrap() {
    const app = await NestFactory.create(AppModule);

    app.useGlobalPipes(new ValidationPipe({ // global DTO validation
        whitelist: true, // strips properties not defined in DTO
        transform: true, // automatically transforms payloads to DTO instances
    }));

    app.enableCors({
        origin: [
            'https://paggo-ocr-case-backend.vercel.app',
            'http://localhost:3001',
        ],
        methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    });
    const port = process.env.PORT || 3000;
    await app.listen(port);
    console.log(`Backend application running on: ${await app.getUrl()}`);
}
bootstrap();
