import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';

const app = await NestFactory.create(AppModule);
app.setGlobalPrefix('api');
const webOrigin = process.env.WEB_ORIGIN?.trim();
if (webOrigin) app.enableCors({ origin: webOrigin, methods: ['GET', 'POST'] });
const port = Number(process.env.PORT ?? 3000);
await app.listen(port, process.env.VERCEL ? '0.0.0.0' : '127.0.0.1');
