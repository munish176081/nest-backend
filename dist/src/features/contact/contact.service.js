"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var ContactService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.ContactService = void 0;
const common_1 = require("@nestjs/common");
const email_service_1 = require("../email/email.service");
const templates_1 = require("../email/templates");
const config_1 = require("@nestjs/config");
let ContactService = ContactService_1 = class ContactService {
    constructor(emailService, configService) {
        this.emailService = emailService;
        this.configService = configService;
        this.logger = new common_1.Logger(ContactService_1.name);
    }
    async submitContactForm(contactData) {
        try {
            await this.emailService.sendEmailWithTemplate({
                recipient: this.configService.get('contact.supportEmail'),
                templateId: templates_1.sendGridEmailTemplates.contactForm,
                dynamicTemplateData: {
                    logoUrl: templates_1.images.logo,
                    firstName: contactData.firstName,
                    lastName: contactData.lastName,
                    email: contactData.email,
                    phone: contactData.phone,
                    subject: contactData.subject || 'General Inquiry',
                    message: contactData.message,
                    submissionDate: new Date().toLocaleDateString(),
                },
            });
            await this.emailService.sendEmailWithTemplate({
                recipient: contactData.email,
                templateId: templates_1.sendGridEmailTemplates.acknowledgment,
                dynamicTemplateData: {
                    logoUrl: templates_1.images.logo,
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
        }
        catch (error) {
            this.logger.error('Failed to submit contact form', error);
            console.log(error);
            throw new Error('Failed to send message. Please try again later.');
        }
    }
};
exports.ContactService = ContactService;
exports.ContactService = ContactService = ContactService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [email_service_1.EmailService, config_1.ConfigService])
], ContactService);
//# sourceMappingURL=contact.service.js.map