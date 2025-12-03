import { Module } from '@nestjs/common';
import { ContactController } from './contact.controller';
import { ContactService } from './contact.service';
import { EmailModule } from '../email/email.module';
import { CommonModule } from '../../common/common.module';

@Module({
  imports: [EmailModule, CommonModule],
  controllers: [ContactController],
  providers: [ContactService],
})
export class ContactModule {} 