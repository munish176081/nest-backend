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
var RecaptchaService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.RecaptchaService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
let RecaptchaService = RecaptchaService_1 = class RecaptchaService {
    constructor(configService) {
        this.configService = configService;
        this.logger = new common_1.Logger(RecaptchaService_1.name);
    }
    async verifyRecaptcha(token) {
        const secretKey = this.configService.get('recaptcha.secretKey') ||
            this.configService.get('RECAPTCHA_SECRET_KEY');
        if (!secretKey) {
            this.logger.warn('reCAPTCHA secret key not configured. Skipping verification.');
            return true;
        }
        if (!token) {
            throw new common_1.BadRequestException('reCAPTCHA token is required');
        }
        try {
            const response = await fetch('https://www.google.com/recaptcha/api/siteverify', {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: `secret=${secretKey}&response=${token}`,
            });
            const data = await response.json();
            if (!data.success) {
                this.logger.warn('reCAPTCHA verification failed:', data);
                throw new common_1.BadRequestException('reCAPTCHA verification failed. Please try again.');
            }
            return true;
        }
        catch (error) {
            this.logger.error('Error verifying reCAPTCHA:', error);
            throw new common_1.BadRequestException('Failed to verify reCAPTCHA. Please try again.');
        }
    }
};
exports.RecaptchaService = RecaptchaService;
exports.RecaptchaService = RecaptchaService = RecaptchaService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService])
], RecaptchaService);
//# sourceMappingURL=recaptcha.service.js.map