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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var ContactService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.ContactService = void 0;
const common_1 = require("@nestjs/common");
const email_service_1 = require("../email/email.service");
const recaptcha_service_1 = require("../../common/services/recaptcha.service");
const templates_1 = require("../email/templates");
const config_1 = require("@nestjs/config");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const contact_entity_1 = require("./entities/contact.entity");
let ContactService = ContactService_1 = class ContactService {
    constructor(contactRepo, emailService, configService, recaptchaService) {
        this.contactRepo = contactRepo;
        this.emailService = emailService;
        this.configService = configService;
        this.recaptchaService = recaptchaService;
        this.logger = new common_1.Logger(ContactService_1.name);
    }
    async submitContactForm(contactData) {
        if (contactData.recaptchaToken) {
            await this.recaptchaService.verifyRecaptcha(contactData.recaptchaToken);
        }
        const savedEnquiry = await this.contactRepo.save({
            firstName: contactData.firstName,
            lastName: contactData.lastName,
            email: contactData.email,
            phone: contactData.phone,
            subject: contactData.subject || 'General Inquiry',
            message: contactData.message,
        });
        this.logger.log(`Saved enquiry ID: ${savedEnquiry.id}`);
        const adminEmailResult = await this.emailService.sendEmailWithTemplate({
            recipient: this.configService.get('contact.supportEmail'),
            templateAlias: templates_1.sendGridEmailTemplates.contactForm,
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
        const userEmailResult = await this.emailService.sendEmailWithTemplate({
            recipient: contactData.email,
            templateAlias: templates_1.sendGridEmailTemplates.acknowledgment,
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
        if (!adminEmailResult.success) {
            this.logger.warn(`Failed to send admin notification email: ${adminEmailResult.error}`);
        }
        if (!userEmailResult.success) {
            this.logger.warn(`Failed to send acknowledgment email to ${contactData.email}: ${userEmailResult.error}`);
        }
        this.logger.log(`Contact form submitted by ${contactData.email}`);
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
    async getAllEnquiries(page, limit) {
        const [data, total] = await this.contactRepo.findAndCount({
            skip: (page - 1) * limit,
            take: limit,
            order: { createdAt: 'DESC' },
        });
        return { data, total, page, limit };
    }
};
exports.ContactService = ContactService;
exports.ContactService = ContactService = ContactService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(contact_entity_1.Contact)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        email_service_1.EmailService,
        config_1.ConfigService,
        recaptcha_service_1.RecaptchaService])
], ContactService);
//# sourceMappingURL=contact.service.js.map