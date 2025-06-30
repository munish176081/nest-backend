import Redis from 'ioredis';
import { join } from 'path';
import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { ValidationPipe } from '@nestjs/common';
import * as session from 'express-session';
import * as passport from 'passport';
import * as express from 'express';
import RedisStore from 'connect-redis';
import { AppModule } from './app.module';
import { NestExpressApplication } from '@nestjs/platform-express';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    rawBody: true,  // allowing access to rawbodies usefull for stripe webhooks
  });
  const configService = app.get(ConfigService);

  const redisClient = new Redis(configService.get('redis.url'), {
    ...(configService.get('cloudProvider') === 'heroku' && {
      tls: {
        rejectUnauthorized: false,
      },
    }),
  });

  const redisStore = new RedisStore({
    client: redisClient,
  });

  app.set('trust proxy', 1);
  app.use(
    session({
      ...configService.get('session'),
      store: redisStore,
    }),
  );
  app.use(passport.initialize());
  app.use(passport.session());

  app.setGlobalPrefix('/api/v1');
  app.enableCors({
    origin: [configService.get('siteUrl')],
    credentials: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
    }),
  );

  // serve static files
  app.use('/uploads', express.static(join(__dirname, '..', 'uploads')));

  // Set global HTTP timeout for external API calls
  const http = require('http');
  const https = require('https');
  
  // Increase timeout for HTTP requests
  http.globalAgent.options.timeout = 30000; // 30 seconds
  https.globalAgent.options.timeout = 30000; // 30 seconds

  await app.listen(
    configService.get('appPort'),
    '0.0.0.0'
  );
}

bootstrap();
