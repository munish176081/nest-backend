import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { ChatController } from './chat.controller';
import { ChatService } from './chat.service';
import { ChatGateway } from './chat.gateway';
import { ChatWebSocketService } from './chat-websocket.service';
import { Conversation } from './entities/conversation.entity';
import { Message } from './entities/message.entity';
import { Participant } from './entities/participant.entity';
import { UsersModule } from '../accounts/users.module';
import { ListingsModule } from '../listings/listings.module';
import { AuthModule } from '../authentication/authentication.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Conversation, Message, Participant]),
    EventEmitterModule.forRoot(),
    UsersModule,
    ListingsModule,
    AuthModule, // Add this to provide SessionService
  ],
  controllers: [ChatController],
  providers: [ChatService, ChatGateway, ChatWebSocketService],
  exports: [ChatService, ChatGateway, ChatWebSocketService],
})
export class ChatModule {} 