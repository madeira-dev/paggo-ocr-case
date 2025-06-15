// import { NestFactory } from '@nestjs/core';
// import { AppModule } from './app.module';
// import session from 'express-session';
// import passport from 'passport';
// import { ValidationPipe } from '@nestjs/common';
// import { ExpressAdapter } from '@nestjs/platform-express';
// import expressType from 'express'; // Import the type
// import express from 'express';    // Import the value

// let cachedServer: expressType.Express;

// async function bootstrap() {
//     if (cachedServer) {
//         return cachedServer;
//     }

//     const expressApp = express();
//     const app = await NestFactory.create(AppModule, new ExpressAdapter(expressApp));

//     app.setGlobalPrefix('api');

//     const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3001';
//     console.log(`[Backend] Configuring CORS for origin: ${frontendUrl}`);
//     const allowedOrigins = [frontendUrl, 'http://localhost:3000', 'http://localhost:3001', 'http://localhost:3002'];
//     if (process.env.VERCEL_URL) {
//         allowedOrigins.push(`https://${process.env.VERCEL_URL}`);
//     }


//     app.enableCors({
//         origin: (origin, callback) => {
//             if (!origin || allowedOrigins.some(allowed => origin.startsWith(allowed))) {
//                 callback(null, true);
//             } else {
//                 console.warn(`[Backend] CORS: Blocked origin - ${origin}`);
//                 callback(new Error('Not allowed by CORS'));
//             }
//         },
//         credentials: true,
//         methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
//         allowedHeaders: 'Content-Type, Accept, Authorization, X-Requested-With',
//     });
//     console.log('[Backend] CORS configured.');

//     app.useGlobalPipes(
//         new ValidationPipe({
//             whitelist: true,
//             transform: true,
//             forbidNonWhitelisted: true,
//         }),
//     );
//     console.log('[Backend] Global validation pipe set.');

//     console.log('[Backend] Setting up session middleware...');
//     app.use(
//         session({
//             secret: process.env.SESSION_SECRET || '!@#$_a_very_secure_secret_for_development_!@#$',
//             resave: false,
//             saveUninitialized: false,
//             cookie: {
//                 secure: process.env.NODE_ENV === 'production',
//                 httpOnly: true,
//                 maxAge: 24 * 60 * 60 * 1000,
//                 sameSite: 'lax',
//             },
//         }),
//     );
//     console.log('[Backend] Session cookie settings applied.');

//     app.use(passport.initialize());
//     app.use(passport.session());
//     console.log('[Backend] Passport initialized.');

//     await app.init();
//     console.log('[Backend] Nest application initialized.');
//     cachedServer = expressApp;
//     return expressApp;
// }

// // Export a function that Vercel can call.
// // This function will return the Express app instance.
// export default async (req: expressType.Request, res: expressType.Response) => {
//     const server = await bootstrap();
//     server(req, res);
// };

// // For local development (not using `vercel dev`)
// async function localDevelopment() {
//     console.log('[Backend] main.ts execution started for local development');
//     const server = await bootstrap(); // This is the expressApp
//     const port = process.env.PORT || 3000;
//     server.listen(port, () => {
//         console.log(`[Backend] Local development: Application is running on: http://localhost:${port}`);
//         console.log(`[Backend] Try accessing http://localhost:${port}/api`);
//     });
// }

// if (process.env.VERCEL !== '1' && process.env.NODE_ENV !== 'test' && require.main === module) {
//     localDevelopment();
// }

import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
    const app = await NestFactory.create(AppModule);
    await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
