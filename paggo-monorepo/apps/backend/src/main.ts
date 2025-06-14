import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import * as session from 'express-session';
import * as passport from 'passport';
import { ValidationPipe } from '@nestjs/common';

console.log("[Backend] main.ts execution started"); // debug

async function bootstrap() {
    const app = await NestFactory.create(AppModule);

    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3001';
    console.log(`[Backend] Configuring CORS for origin: ${frontendUrl}`);

    app.enableCors({
        origin: (origin, callback) => {
            // In development, allow specific localhost origin or no origin (e.g. Postman)
            const allowedOrigins = [frontendUrl];
            if (!origin || allowedOrigins.includes(origin)) {
                callback(null, true);
            } else {
                console.warn(`[Backend] CORS: Blocked origin - ${origin}`);
                callback(new Error('Not allowed by CORS'));
            }
        },
        methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
        credentials: true,
        allowedHeaders: 'Content-Type, Accept, Authorization, X-Requested-With',
    });

    app.useGlobalPipes(new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
    }));

    console.log("[Backend] Setting up session middleware...");
    app.use(
        session({
            secret: process.env.SESSION_SECRET || 'a_very_secure_secret_for_development_!@#$',
            resave: false,
            saveUninitialized: false,
            cookie: {
                secure: false, // MUST be false for HTTP localhost development
                httpOnly: true, // Good for security (prevents client-side JS access)
                maxAge: 24 * 60 * 60 * 1000, // 1 day
                sameSite: 'lax', // 'lax' is usually best for session cookies.
                // 'none' would require secure: true.
                // path: '/', // Default is usually fine
                // domain: 'localhost', // Usually not needed for localhost and can sometimes cause issues if misconfigured.
                // If your backend and frontend were on different subdomains of a real domain,
                // you might set this to '.yourdomain.com'.
            },
        }),
    );
    console.log("[Backend] Session cookie settings applied:", {
        secure: false, // Log the actual value being used
        httpOnly: true,
        maxAge: 24 * 60 * 60 * 1000,
        sameSite: 'lax',
    });

    app.use(passport.initialize());
    app.use(passport.session());
    console.log("[Backend] Passport initialized.");

    const port = process.env.PORT || 3000;
    await app.listen(port);
    // Listen on all available IPv4 interfaces for easier access from other devices/containers if needed.
    // For just local, 'localhost' or '[::1]' (IPv6) is fine.
    console.log(`Backend application running on: http://0.0.0.0:${port} and http://localhost:${port}`);
}
bootstrap();
