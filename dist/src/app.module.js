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
const event_emitter_1 = require("@nestjs/event-emitter");
const config_1 = require("@nestjs/config");
const options_1 = require("./config/options");
const external_auth_accounts_entity_1 = require("./features/authentication/entities/external-auth-accounts.entity");
const account_entity_1 = require("./features/accounts/entities/account.entity");
const upload_entity_1 = require("./features/upload/entities/upload.entity");
const listing_entity_1 = require("./features/listings/entities/listing.entity");
const breed_entity_1 = require("./features/breeds/entities/breed.entity");
const breed_type_image_entity_1 = require("./features/breeds/entities/breed-type-image.entity");
const conversation_entity_1 = require("./features/chat/entities/conversation.entity");
const message_entity_1 = require("./features/chat/entities/message.entity");
const participant_entity_1 = require("./features/chat/entities/participant.entity");
const meeting_entity_1 = require("./features/meetings/entities/meeting.entity");
const user_calendar_tokens_entity_1 = require("./features/meetings/entities/user-calendar-tokens.entity");
const wishlist_entity_1 = require("./features/wishlist/entities/wishlist.entity");
const blog_post_entity_1 = require("./features/blogs/entities/blog-post.entity");
const blog_category_entity_1 = require("./features/blogs/entities/blog-category.entity");
const activity_log_entity_1 = require("./features/accounts/entities/activity-log.entity");
const payment_entity_1 = require("./features/payments/entities/payment.entity");
const subscription_entity_1 = require("./features/subscriptions/entities/subscription.entity");
const contact_entity_1 = require("./features/contact/entities/contact.entity");
const typeOrmSnakeCaseNamingStrategy_1 = require("./helpers/typeOrmSnakeCaseNamingStrategy");
const users_module_1 = require("./features/accounts/users.module");
const authentication_module_1 = require("./features/authentication/authentication.module");
const email_module_1 = require("./features/email/email.module");
const upload_module_1 = require("./features/upload/upload.module");
const contact_module_1 = require("./features/contact/contact.module");
const listings_module_1 = require("./features/listings/listings.module");
const breeds_module_1 = require("./features/breeds/breeds.module");
const chat_module_1 = require("./features/chat/chat.module");
const meetings_module_1 = require("./features/meetings/meetings.module");
const wishlist_module_1 = require("./features/wishlist/wishlist.module");
const blogs_module_1 = require("./features/blogs/blogs.module");
const payments_module_1 = require("./features/payments/payments.module");
const subscriptions_module_1 = require("./features/subscriptions/subscriptions.module");
const newsletter_module_1 = require("./features/newsletter/newsletter.module");
let AppModule = class AppModule {
};
exports.AppModule = AppModule;
exports.AppModule = AppModule = __decorate([
    (0, common_1.Module)({
        imports: [
            config_1.ConfigModule.forRoot(options_1.configOptions),
            event_emitter_1.EventEmitterModule.forRoot(),
            typeorm_1.TypeOrmModule.forRootAsync({
                inject: [config_1.ConfigService],
                useFactory: (configService) => {
                    const isProduction = configService.get('NODE_ENV') === 'production';
                    console.log(isProduction);
                    return {
                        type: 'postgres',
                        url: configService.get('dbUrl'),
                        synchronize: true,
                        entities: [
                            external_auth_accounts_entity_1.ExternalAuthAccount,
                            account_entity_1.User,
                            upload_entity_1.Upload,
                            listing_entity_1.Listing,
                            breed_entity_1.Breed,
                            breed_type_image_entity_1.BreedTypeImage,
                            conversation_entity_1.Conversation,
                            message_entity_1.Message,
                            participant_entity_1.Participant,
                            meeting_entity_1.Meeting,
                            user_calendar_tokens_entity_1.UserCalendarTokens,
                            wishlist_entity_1.Wishlist,
                            blog_post_entity_1.BlogPost,
                            blog_category_entity_1.BlogCategory,
                            activity_log_entity_1.ActivityLog,
                            payment_entity_1.Payment,
                            subscription_entity_1.Subscription,
                            contact_entity_1.Contact,
                        ],
                        namingStrategy: new typeOrmSnakeCaseNamingStrategy_1.SnakeCaseNamingStrategy(),
                        logging: false,
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
            breeds_module_1.BreedsModule,
            chat_module_1.ChatModule,
            meetings_module_1.MeetingsModule,
            wishlist_module_1.WishlistModule,
            blogs_module_1.BlogsModule,
            payments_module_1.PaymentsModule,
            subscriptions_module_1.SubscriptionsModule,
            newsletter_module_1.NewsletterModule,
        ],
        providers: [],
    })
], AppModule);
//# sourceMappingURL=app.module.js.map