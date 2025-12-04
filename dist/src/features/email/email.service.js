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
var EmailService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.EmailService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const gmail_service_1 = require("./gmail.service");
const template_renderer_1 = require("./template-renderer");
let EmailService = EmailService_1 = class EmailService {
    constructor(gmailService, configService) {
        this.gmailService = gmailService;
        this.configService = configService;
        this.logger = new common_1.Logger(EmailService_1.name);
    }
    async sendTestEmail(recipient, body = 'This is a test mail') {
        return await this.gmailService.sendMail(recipient, 'Test email', body);
    }
    async sendEmailWithTemplate({ recipient, templateId, templateAlias, dynamicTemplateData, }) {
        if (!templateAlias) {
            throw new Error('templateAlias is required for Gmail email service');
        }
        try {
            const html = template_renderer_1.TemplateRenderer.renderTemplate(templateAlias, dynamicTemplateData);
            const subject = this.getSubjectForTemplate(templateAlias);
            return await this.gmailService.sendMail(recipient, subject, html);
        }
        catch (error) {
            this.logger.error(`Failed to render or send email template: ${error.message}`, error?.stack);
            return {
                success: false,
                error: error.message || 'Failed to send email',
                errorCode: 500,
            };
        }
    }
    getSubjectForTemplate(templateAlias) {
        const subjectMap = {
            'welcome': `Welcome to ${process.env.SITE_NAME}! Verify Your Email Address`,
            'password-reset': `Reset Your ${process.env.SITE_NAME} Password`,
            'welcome-1': `Welcome to ${process.env.SITE_NAME}! Verify Your Email Address`,
            'welcome-3': `${process.env.SITE_NAME} - OTP Code for Password Reset`,
            'welcome-4': `${process.env.SITE_NAME} - New Contact Form Submission`,
            'welcome-5': `We Received Your Enquiry - ${process.env.SITE_NAME}`,
            'listing-pending-review': `${process.env.SITE_NAME} - New Listing Pending Review`,
            'listing-approved': `Your Listing Has Been Approved - ${process.env.SITE_NAME}`,
            'listing-approved-admin': `${process.env.SITE_NAME} - Listing Approved Confirmation`,
        };
        return subjectMap[templateAlias] || `Email from ${process.env.SITE_NAME}`;
    }
};
exports.EmailService = EmailService;
exports.EmailService = EmailService = EmailService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [gmail_service_1.GmailService,
        config_1.ConfigService])
], EmailService);
//# sourceMappingURL=email.service.js.map