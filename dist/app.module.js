"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppModule = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const config_1 = require("@nestjs/config");
const options_1 = require("./config/options");
const external_auth_accounts_entity_1 = require("./features/authentication/entities/external-auth-accounts.entity");
const account_entity_1 = require("./features/accounts/entities/account.entity");
const upload_entity_1 = require("./features/upload/entities/upload.entity");
const listing_entity_1 = require("./features/listings/entities/listing.entity");
const typeOrmSnakeCaseNamingStrategy_1 = require("./helpers/typeOrmSnakeCaseNamingStrategy");
const users_module_1 = require("./features/accounts/users.module");
const authentication_module_1 = require("./features/authentication/authentication.module");
const email_module_1 = require("./features/email/email.module");
const upload_module_1 = require("./features/upload/upload.module");
const contact_module_1 = require("./features/contact/contact.module");
const listings_module_1 = require("./features/listings/listings.module");
let AppModule = class AppModule {
};
exports.AppModule = AppModule;
exports.AppModule = AppModule = __decorate([
    (0, common_1.Module)({
        imports: [
            config_1.ConfigModule.forRoot(options_1.configOptions),
            typeorm_1.TypeOrmModule.forRootAsync({
                inject: [config_1.ConfigService],
                useFactory: (configService) => {
                    const isProduction = configService.get('NODE_ENV') === 'production';
                    return {
                        type: 'postgres',
                        url: configService.get('dbUrl'),
                        synchronize: true,
                        entities: [external_auth_accounts_entity_1.ExternalAuthAccount, account_entity_1.User, upload_entity_1.Upload, listing_entity_1.Listing],
                        namingStrategy: new typeOrmSnakeCaseNamingStrategy_1.SnakeCaseNamingStrategy(),
                        logging: !isProduction,
                        ssl: {
                            rejectUnauthorized: false,
                        },
                        extra: {
                            ssl: {
                                rejectUnauthorized: false,
                            },
                        },
                    };
                },
            }),
            users_module_1.UsersModule,
            authentication_module_1.AuthModule,
            email_module_1.EmailModule,
            upload_module_1.UploadModule,
            contact_module_1.ContactModule,
            listings_module_1.ListingsModule,
        ],
        providers: [],
    })
], AppModule);
//# sourceMappingURL=app.module.js.map