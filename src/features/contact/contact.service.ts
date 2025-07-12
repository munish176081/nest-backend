import { Injectable, Logger } from '@nestjs/common';
import { ContactDto } from './dto/contact.dto';
import { EmailService } from '../email/email.service';
import { images, sendGridEmailTemplates } from '../email/templates';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class ContactService {
  private readonly logger = new Logger(ContactService.name);

  constructor(private readonly emailService: EmailService, private readonly configService: ConfigService) {}

  async submitContactForm(contactData: ContactDto): Promise<{ message: string; success: boolean }> {
    try {
      // Send notification email to admin using SendGrid template
      await this.emailService.sendEmailWithTemplate({
        recipient: this.configService.get('contact.supportEmail'),
        templateId: sendGridEmailTemplates.contactForm, // Your SendGrid template ID for admin notifications
        dynamicTemplateData: {
          logoUrl: images.logo,
          firstName: contactData.firstName,
          lastName: contactData.lastName,
          email: contactData.email,
          phone: contactData.phone,
          subject: contactData.subject || 'General Inquiry',
          message: contactData.message,
          submissionDate: new Date().toLocaleDateString(),
        },
      });

      // Send acknowledgment email to user using SendGrid template
      await this.emailService.sendEmailWithTemplate({
        recipient: contactData.email,
        templateId: sendGridEmailTemplates.acknowledgment, // Your SendGrid template ID for user acknowledgments
        dynamicTemplateData: {
          logoUrl: images.logo,
          firstName: contactData.firstName,
          lastName: contactData.lastName,
          email: contactData.email,
          phone: contactData.phone,
          subject: contactData.subject || 'General Inquiry',
          message: contactData.message,
          submissionDate: new Date().toLocaleDateString(),
        },
      });

      this.logger.log(`Contact form submitted by ${contactData.email}`);

      return {
        message: 'Your Enquiry has been submitted successfully!',
        success: true,
      };
    } catch (error) {
      this.logger.error('Failed to submit contact form', error);
      console.log(error);
      throw new Error('Failed to send message. Please try again later.');
    }
  }
}