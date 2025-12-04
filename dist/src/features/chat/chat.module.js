"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ChatModule = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const event_emitter_1 = require("@nestjs/event-emitter");
const chat_controller_1 = require("./chat.controller");
const chat_service_1 = require("./chat.service");
const chat_gateway_1 = require("./chat.gateway");
const chat_websocket_service_1 = require("./chat-websocket.service");
const conversation_entity_1 = require("./entities/conversation.entity");
const message_entity_1 = require("./entities/message.entity");
const participant_entity_1 = require("./entities/participant.entity");
const users_module_1 = require("../accounts/users.module");
const listings_module_1 = require("../listings/listings.module");
const authentication_module_1 = require("../authentication/authentication.module");
const account_entity_1 = require("../accounts/entities/account.entity");
const LoggedInGuard_1 = require("../../middleware/LoggedInGuard");
let ChatModule = class ChatModule {
};
exports.ChatModule = ChatModule;
exports.ChatModule = ChatModule = __decorate([
    (0, common_1.Module)({
        imports: [
            typeorm_1.TypeOrmModule.forFeature([conversation_entity_1.Conversation, message_entity_1.Message, participant_entity_1.Participant, account_entity_1.User]),
            event_emitter_1.EventEmitterModule.forRoot(),
            users_module_1.UsersModule,
            listings_module_1.ListingsModule,
            authentication_module_1.AuthModule,
        ],
        controllers: [chat_controller_1.ChatController],
        providers: [chat_service_1.ChatService, chat_gateway_1.ChatGateway, chat_websocket_service_1.ChatWebSocketService, LoggedInGuard_1.LoggedInGuard],
        exports: [chat_service_1.ChatService, chat_gateway_1.ChatGateway, chat_websocket_service_1.ChatWebSocketService],
    })
], ChatModule);
//# sourceMappingURL=chat.module.js.map