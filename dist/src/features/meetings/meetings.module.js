"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MeetingsModule = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const meetings_controller_1 = require("./meetings.controller");
const meetings_service_1 = require("./meetings.service");
const oauth_calendar_service_1 = require("./oauth-calendar.service");
const user_calendar_tokens_service_1 = require("./user-calendar-tokens.service");
const oauth_calendar_controller_1 = require("./oauth-calendar.controller");
const calendar_webhook_controller_1 = require("./calendar-webhook.controller");
const meeting_entity_1 = require("./entities/meeting.entity");
const user_calendar_tokens_entity_1 = require("./entities/user-calendar-tokens.entity");
const listings_module_1 = require("../listings/listings.module");
const users_module_1 = require("../accounts/users.module");
const authentication_module_1 = require("../authentication/authentication.module");
const LoggedInGuard_1 = require("../../middleware/LoggedInGuard");
let MeetingsModule = class MeetingsModule {
};
exports.MeetingsModule = MeetingsModule;
exports.MeetingsModule = MeetingsModule = __decorate([
    (0, common_1.Module)({
        imports: [
            typeorm_1.TypeOrmModule.forFeature([meeting_entity_1.Meeting, user_calendar_tokens_entity_1.UserCalendarTokens]),
            listings_module_1.ListingsModule,
            users_module_1.UsersModule,
            authentication_module_1.AuthModule,
        ],
        controllers: [meetings_controller_1.MeetingsController, oauth_calendar_controller_1.OAuthCalendarController, calendar_webhook_controller_1.CalendarWebhookController],
        providers: [meetings_service_1.MeetingsService, oauth_calendar_service_1.OAuthCalendarService, user_calendar_tokens_service_1.UserCalendarTokensService, LoggedInGuard_1.LoggedInGuard],
        exports: [meetings_service_1.MeetingsService, oauth_calendar_service_1.OAuthCalendarService, user_calendar_tokens_service_1.UserCalendarTokensService],
    })
], MeetingsModule);
//# sourceMappingURL=meetings.module.js.map