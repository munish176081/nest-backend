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
Object.defineProperty(exports, "__esModule", { value: true });
exports.EmailService = void 0;
const common_1 = require("@nestjs/common");
const sendgrid_client_1 = require("./sendgrid-client");
const config_1 = require("@nestjs/config");
let EmailService = class EmailService {
    constructor(sendGridClient, configService) {
        this.sendGridClient = sendGridClient;
        this.configService = configService;
    }
    async sendTestEmail(recipient, body = 'This is a test mail') {
        const mail = {
            to: recipient,
            from: this.configService.get('sendgrid.email'),
            subject: 'Test email',
            content: [{ type: 'text/html', value: body }],
        };
        await this.sendGridClient.send(mail);
    }
    async sendEmailWithTemplate({ recipient, templateId, dynamicTemplateData, }) {
        const mail = {
            to: recipient,
            from: this.configService.get('email.sendgrid.email'),
            templateId,
            dynamicTemplateData,
        };
        await this.sendGridClient.send(mail);
    }
};
exports.EmailService = EmailService;
exports.EmailService = EmailService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [sendgrid_client_1.SendGridClient,
        config_1.ConfigService])
], EmailService);
//# sourceMappingURL=email.service.js.map