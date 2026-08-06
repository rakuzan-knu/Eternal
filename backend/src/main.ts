import './instrument';
import { type INestApplication, Logger, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { ExpressAdapter } from '@nestjs/platform-express';
import { IoAdapter } from '@nestjs/platform-socket.io';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import express, { type Request, type Response } from 'express';
import { AppModule } from './app.module';

const logger = new Logger('Bootstrap');

async function createNestServer(expressApp: express.Express): Promise<INestApplication> {
  const adapter = new ExpressAdapter(expressApp);
  const app = await NestFactory.create(AppModule, adapter);

  app.enableCors({
    origin: process.env.CORS_ORIGIN?.split(',') ?? 'http://localhost:5173',
    credentials: true,
  });

  app.useWebSocketAdapter(new IoAdapter(app));

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  const config = new DocumentBuilder()
    .setTitle('Social Network API')
    .setDescription('Social Network backend API documentation')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  await app.init();
  return app;
}

// Local development
if (process.env.NODE_ENV !== 'production') {
  async function bootstrap() {
    const expressApp = express();
    await createNestServer(expressApp);
    const port = process.env.PORT ?? 3000;
    expressApp.listen(port, () => {
      logger.log(`Server running on port ${port}`);
    });
  }
  void bootstrap();
}

// Vercel Serverless Handler
let expressAppInstance: express.Express | undefined;

export default async function handler(req: Request, res: Response): Promise<void> {
  if (!expressAppInstance) {
    expressAppInstance = express();
    await createNestServer(expressAppInstance);
  }
  expressAppInstance(req, res);
}
