// import { Module } from '@nestjs/common';
// import { ConfigModule } from '@nestjs/config';
// import { AppController } from './app.controller';
// import { AppService } from './app.service';
// import { PrismaModule } from './prisma/prisma.module';
// import { AuthModule } from './auth/auth.module';
// import { OpenaiModule } from './openai/openai.module';
// import { ChatModule } from './chat/chat.module';
// import { OcrModule } from './ocr/ocr.module';

// @Module({
//     imports: [
//         ConfigModule.forRoot({
//             isGlobal: true,
//             envFilePath: '.env',
//         }),
//         PrismaModule,
//         AuthModule,
//         OpenaiModule,
//         ChatModule,
//         OcrModule,
//     ],
//     controllers: [AppController],
//     providers: [AppService],
// })
// export class AppModule { }

import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';

@Module({
    imports: [],
    controllers: [AppController],
    providers: [AppService],
})
export class AppModule { }
