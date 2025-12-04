import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ContactController } from './contact.controller';
import { ContactService } from './contact.service';
import { EmailModule } from '../email/email.module';
import { CommonModule } from '../../common/common.module';
import { Contact } from './entities/contact.entity';

@Module({
  imports: [EmailModule, CommonModule, TypeOrmModule.forFeature([Contact])],
  controllers: [ContactController],
  providers: [ContactService],
})
export class ContactModule {} 