import Redis from 'ioredis';
import { join } from 'path';
import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { ValidationPipe } from '@nestjs/common';
import * as session from 'express-session';
import * as passport from 'passport';
import * as express from 'express';
import RedisStore from 'connect-redis';
import { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from './app.module';

async function initializeApplication() {
  const application = await NestFactory.create<NestExpressApplication>(AppModule, {
    rawBody: true,  // allowing access to rawbodies usefull for stripe webhooks
  });
  const configurationService = application.get(ConfigService);

  const redisConnection = new Redis(configurationService.get('redis.url'), {
    ...(configurationService.get('cloudProvider') === 'heroku' && {
      tls: {
        rejectUnauthorized: false,
      },
    }),
  });

  const redisSessionStore = new RedisStore({
    client: redisConnection,
  });

  application.set('trust proxy', 1);
  application.use(
    session({
      ...configurationService.get('session'),
      store: redisSessionStore,
    }),
  );
  application.use(passport.initialize());
  application.use(passport.session());

  application.setGlobalPrefix('/api/v1');
  application.enableCors({
    origin: [configurationService.get('siteUrl')],
    credentials: true,
  });

  application.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
    }),
  );

  console.log("i am here in server.ts");
  // serve static files
  application.use('/uploads', express.static(join(__dirname, '..', 'uploads')));

  await application.listen(configurationService.get('appPort'));
}

initializeApplication();
