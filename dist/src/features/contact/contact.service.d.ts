import { ContactDto } from './dto/contact.dto';
import { EmailService } from '../email/email.service';
import { RecaptchaService } from '../../common/services/recaptcha.service';
import { ConfigService } from '@nestjs/config';
import { Repository } from 'typeorm';
import { Contact } from './entities/contact.entity';
export declare class ContactService {
    private readonly contactRepo;
    private readonly emailService;
    private readonly configService;
    private readonly recaptchaService;
    private readonly logger;
    constructor(contactRepo: Repository<Contact>, emailService: EmailService, configService: ConfigService, recaptchaService: RecaptchaService);
    submitContactForm(contactData: ContactDto): Promise<{
        message: string;
        success: boolean;
    }>;
    getAllEnquiries(page: number, limit: number): Promise<{
        data: Contact[];
        total: number;
        page: number;
        limit: number;
    }>;
}
