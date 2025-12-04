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
async function initializeApplication() {
    const application = await core_1.NestFactory.create(app_module_1.AppModule, {
        rawBody: true,
    });
    const configurationService = application.get(config_1.ConfigService);
    const redisConnection = new ioredis_1.default(configurationService.get('redis.url'), {
        ...(configurationService.get('cloudProvider') === 'heroku' && {
            tls: {
                rejectUnauthorized: false,
            },
        }),
    });
    const redisSessionStore = new connect_redis_1.default({
        client: redisConnection,
    });
    application.set('trust proxy', 1);
    application.use(session({
        ...configurationService.get('session'),
        store: redisSessionStore,
    }));
    application.use(passport.initialize());
    application.use(passport.session());
    application.setGlobalPrefix('/api/v1');
    application.enableCors({
        origin: [configurationService.get('siteUrl')],
        credentials: true,
    });
    application.useGlobalPipes(new common_1.ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
    }));
    console.log("i am here in server.ts");
    application.use('/uploads', express.static((0, path_1.join)(__dirname, '..', 'uploads')));
    await application.listen(configurationService.get('appPort'));
}
initializeApplication();
//# sourceMappingURL=server.js.map