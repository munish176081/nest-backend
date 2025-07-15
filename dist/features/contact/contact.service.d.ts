import { ContactDto } from './dto/contact.dto';
import { EmailService } from '../email/email.service';
import { ConfigService } from '@nestjs/config';
export declare class ContactService {
    private readonly emailService;
    private readonly configService;
    private readonly logger;
    constructor(emailService: EmailService, configService: ConfigService);
    submitContactForm(contactData: ContactDto): Promise<{
        message: string;
        success: boolean;
    }>;
}
