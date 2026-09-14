import './instrument';
import { type INestApplication, Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from './app.module';
import { IoAdapter } from '@nestjs/platform-socket.io';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { type Request, type Response } from 'express';
import helmet from 'helmet';

const logger = new Logger('Bootstrap');

if (!process.env.DIRECT_URL && process.env.DATABASE_URL) {
  process.env.DIRECT_URL = process.env.DATABASE_URL;
}

let cachedApp: INestApplication | undefined;

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  app.set('trust proxy', 1);
  app.use(helmet());

  const allowedOrigins = process.env.CORS_ORIGIN
    ? process.env.CORS_ORIGIN.split(',').map((o) => o.trim())
    : ['http://localhost:5173', 'http://localhost:3000'];

  app.enableCors({
    origin: (origin, callback) => {
      if (
        !origin ||
        allowedOrigins.includes(origin) ||
        origin.endsWith('.vercel.app') ||
        process.env.NODE_ENV !== 'production'
      ) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'), false);
      }
    },
    credentials: true,
  });

  app.useWebSocketAdapter(new IoAdapter(app));

  const config = new DocumentBuilder()
    .setTitle('Social Network API')
    .setDescription('Social Network backend API documentation')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  const port = process.env.PORT ?? 3000;
  await app.listen(port, '0.0.0.0');
  logger.log(`Server running on port ${port}`);

  // Fallback forwarder on port 5000 in case legacy GitHub OAuth callback reaches port 5000
  if (Number(port) !== 5000) {
    try {
      const httpModule = await import('http');
      const forwarder = httpModule.createServer((req, res) => {
        const targetUrl = `http://localhost:${port}${req.url || ''}`;
        res.writeHead(302, { Location: targetUrl });
        res.end();
      });
      forwarder.listen(5000, '0.0.0.0', () => {
        logger.log(`OAuth fallback forwarder listening on port 5000 -> ${port}`);
      });
      forwarder.on('error', (err: any) => {
        logger.warn(`Port 5000 forwarder skipped: ${err.message}`);
      });
    } catch (err) {
      logger.warn(`Port 5000 forwarder setup failed: ${err}`);
    }
  }
}

if (process.env.NODE_ENV !== 'production' || !process.env.VERCEL) {
  void bootstrap();
}

// Vercel Serverless Handler
export default async function handler(req: Request, res: Response): Promise<void> {
  if (!cachedApp) {
    const app = await NestFactory.create<NestExpressApplication>(AppModule);
    app.set('trust proxy', 1);
    app.use(helmet());
    app.enableCors({
      origin: process.env.CORS_ORIGIN?.split(',').map((o) => o.trim()) ?? '*',
      credentials: true,
    });
    app.useWebSocketAdapter(new IoAdapter(app));
    await app.init();
    cachedApp = app;
  }
  const instance = cachedApp.getHttpAdapter().getInstance() as (
    req: Request,
    res: Response,
  ) => void;
  instance(req, res);
}
