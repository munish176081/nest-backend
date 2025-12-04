import { Injectable, Logger } from '@nestjs/common';
import { ContactDto } from './dto/contact.dto';
import { EmailService } from '../email/email.service';
import { RecaptchaService } from '../../common/services/recaptcha.service';
import { images, sendGridEmailTemplates } from '../email/templates';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Contact } from './entities/contact.entity';

@Injectable()
export class ContactService {
  private readonly logger = new Logger(ContactService.name);

  constructor(
    @InjectRepository(Contact)
    private readonly contactRepo: Repository<Contact>,
    private readonly emailService: EmailService, private readonly configService: ConfigService, private readonly recaptchaService: RecaptchaService,
) {}

  async submitContactForm(contactData: ContactDto): Promise<{ message: string; success: boolean }> {
    // Verify reCAPTCHA if token is provided
    if (contactData.recaptchaToken) {
      await this.recaptchaService.verifyRecaptcha(contactData.recaptchaToken);
    }

    // Save enquiry in DB
    const savedEnquiry = await this.contactRepo.save({
      firstName: contactData.firstName,
      lastName: contactData.lastName,
      email: contactData.email,
      phone: contactData.phone,
      subject: contactData.subject || 'General Inquiry',
      message: contactData.message,
    });

    this.logger.log(`Saved enquiry ID: ${savedEnquiry.id}`);

    // Send notification email to admin using Postmark template
    const adminEmailResult = await this.emailService.sendEmailWithTemplate({
      recipient: this.configService.get('contact.supportEmail'),
      templateAlias: sendGridEmailTemplates.contactForm, // Your Postmark template alias for admin notifications
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

    // Send acknowledgment email to user using Postmark template
    const userEmailResult = await this.emailService.sendEmailWithTemplate({
      recipient: contactData.email,
      templateAlias: sendGridEmailTemplates.acknowledgment, // Your Postmark template alias for user acknowledgments
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

    // Log email results
    if (!adminEmailResult.success) {
      this.logger.warn(`Failed to send admin notification email: ${adminEmailResult.error}`);
    }
    if (!userEmailResult.success) {
      this.logger.warn(`Failed to send acknowledgment email to ${contactData.email}: ${userEmailResult.error}`);
    }

    // Always return success if at least one email was sent (or even if both failed, form was submitted)
    // In production, you might want to store the submission in a database as a backup
    this.logger.log(`Contact form submitted by ${contactData.email}`);

    // If both emails failed, inform user but still return success (form was received)
    if (!adminEmailResult.success && !userEmailResult.success) {
      return {
        message: 'Your enquiry has been received, but we encountered an issue sending confirmation emails. We will contact you shortly.',
        success: true,
      };
    }

    return {
      message: 'Your Enquiry has been submitted successfully!',
      success: true,
    };
  }
}