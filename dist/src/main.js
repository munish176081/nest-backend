"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const ioredis_1 = require("ioredis");
const path_1 = require("path");
const core_1 = require("@nestjs/core");
const config_1 = require("@nestjs/config");
const common_1 = require("@nestjs/common");
const session = require("express-session");
const passport = require("passport");
const express = require("express");
const connect_redis_1 = require("connect-redis");
const app_module_1 = require("./app.module");
async function bootstrap() {
    const app = await core_1.NestFactory.create(app_module_1.AppModule, {
        rawBody: true,
    });
    const configService = app.get(config_1.ConfigService);
    const redisClient = new ioredis_1.default(configService.get('redis.url'), {
        ...(configService.get('cloudProvider') === 'heroku' && {
            tls: {
                rejectUnauthorized: false,
            },
        }),
    });
    const redisStore = new connect_redis_1.default({
        client: redisClient,
    });
    app.set('trust proxy', 1);
    app.use(session({
        ...configService.get('session'),
        store: redisStore,
    }));
    app.use(passport.initialize());
    app.use(passport.session());
    app.setGlobalPrefix('/api/v1');
    app.enableCors({
        origin: [configService.get('siteUrl')],
        credentials: true,
    });
    app.useGlobalPipes(new common_1.ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
    }));
    app.use('/uploads', express.static((0, path_1.join)(__dirname, '..', 'uploads')));
    const http = require('http');
    const https = require('https');
    http.globalAgent.options.timeout = 30000;
    https.globalAgent.options.timeout = 30000;
    await app.listen(configService.get('appPort'), '0.0.0.0');
}
bootstrap();
//# sourceMappingURL=main.js.map