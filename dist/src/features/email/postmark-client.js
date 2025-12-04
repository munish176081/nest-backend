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
var PostmarkClient_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.PostmarkClient = void 0;
const config_1 = require("@nestjs/config");
const common_1 = require("@nestjs/common");
const postmark_1 = require("postmark");
let PostmarkClient = PostmarkClient_1 = class PostmarkClient {
    constructor(configService) {
        this.configService = configService;
        this.logger = new common_1.Logger(PostmarkClient_1.name);
        const apiKey = this.configService.get('email.postmark.apiKey');
        if (!apiKey) {
            throw new Error('Postmark API key is not configured');
        }
        this.client = new postmark_1.ServerClient(apiKey);
    }
    formatFromField(email) {
        const emailMatch = email.match(/<(.+)>/);
        const emailAddress = emailMatch ? emailMatch[1] : email;
        return `pups4sale <${emailAddress}>`;
    }
    async send(options) {
        try {
            const fromField = this.formatFromField(options.from);
            if (options.templateId || options.templateAlias) {
                const templateParams = {
                    From: fromField,
                    To: options.to,
                    TemplateModel: options.templateModel || {},
                };
                if (options.templateId) {
                    templateParams.TemplateId = options.templateId;
                }
                else if (options.templateAlias) {
                    templateParams.TemplateAlias = options.templateAlias;
                }
                await this.client.sendEmailWithTemplate(templateParams);
                this.logger.log(`Email sent successfully to ${options.to} using template ${options.templateId || options.templateAlias}`);
                return { success: true };
            }
            else {
                await this.client.sendEmail({
                    From: fromField,
                    To: options.to,
                    Subject: options.subject || '',
                    HtmlBody: options.htmlBody,
                    TextBody: options.textBody,
                });
                this.logger.log(`Email sent successfully to ${options.to}`);
                return { success: true };
            }
        }
        catch (error) {
            const errorMessage = error?.Message || error?.message || 'Unknown error';
            const errorCode = error?.ErrorCode || error?.statusCode || error?.code || 500;
            this.logger.error(`Failed to send email to ${options.to}: ${errorMessage}`, error?.stack);
            return {
                success: false,
                error: errorMessage,
                errorCode,
            };
        }
    }
};
exports.PostmarkClient = PostmarkClient;
exports.PostmarkClient = PostmarkClient = PostmarkClient_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService])
], PostmarkClient);
//# sourceMappingURL=postmark-client.js.map