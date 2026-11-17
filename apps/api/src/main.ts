import 'reflect-metadata';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';

async function createApplication() {
  const app = await NestFactory.create(AppModule);
  app.setGlobalPrefix('api');
  const webOrigin = process.env.WEB_ORIGIN?.trim();
  if (webOrigin) app.enableCors({ origin: webOrigin, methods: ['GET', 'POST'] });
  await app.init();
  return app;
}

let application: ReturnType<typeof createApplication> | undefined;

export default async function handler(request: IncomingMessage, response: ServerResponse) {
  application ??= createApplication().catch(error => {
    application = undefined;
    throw error;
  });
  const app = await application;
  app.getHttpAdapter().getInstance()(request, response);
}

async function startLocalServer() {
  const app = await createApplication();
  await app.listen(Number(process.env.PORT ?? 3000), '127.0.0.1');
}

if (import.meta.main && !process.env.VERCEL) {
  startLocalServer().catch(error => {
    console.error(error);
    process.exitCode = 1;
  });
}
