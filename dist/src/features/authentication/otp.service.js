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
exports.OtpService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const ioredis_1 = require("ioredis");
const auth_config_1 = require("./auth.config");
let OtpService = class OtpService {
    constructor(configService) {
        this.configService = configService;
        this.cache = new ioredis_1.Redis(this.configService.get('redis.url'), {
            db: 1,
            ...(this.configService.get('cloudProvider') === 'heroku' && {
                tls: {
                    rejectUnauthorized: false,
                },
            }),
        });
    }
    generateOtp(length = auth_config_1.AuthConfig.OTP_LENGTH) {
        const digits = '0123456789';
        let otp = '';
        for (let i = 0; i < length; i++) {
            otp += digits[Math.floor(Math.random() * digits.length)];
        }
        return otp;
    }
    async storeOtp(key, otp, expirySeconds = auth_config_1.AuthConfig.OTP_EXPIRY_TIME) {
        console.log(key, otp, "STORE KEY");
        await this.cache.set(key, otp, 'EX', expirySeconds);
    }
    async getOtp(key) {
        console.log(key, "STORE KEY");
        return await this.cache.get(key);
    }
    async validateOtp(key, providedOtp) {
        const storedOtp = await this.getOtp(key);
        console.log(storedOtp, key, "STORED ONE");
        if (!storedOtp) {
            return false;
        }
        const isValid = storedOtp === providedOtp;
        if (isValid) {
            await this.cache.del(key);
        }
        return isValid;
    }
    async canRequestOtp(timeKey, cooldownSeconds = auth_config_1.AuthConfig.OTP_COOLDOWN_PERIOD) {
        const lastRequestTime = await this.cache.get(timeKey);
        if (!lastRequestTime) {
            return true;
        }
        const timeSinceLastRequest = Date.now() / 1000 - parseInt(lastRequestTime);
        return timeSinceLastRequest >= cooldownSeconds;
    }
    async setOtpCooldown(timeKey, cooldownSeconds = auth_config_1.AuthConfig.OTP_COOLDOWN_PERIOD) {
        await this.cache.set(timeKey, Date.now() / 1000, 'EX', cooldownSeconds);
    }
    async getRemainingCooldown(timeKey) {
        const lastRequestTime = await this.cache.get(timeKey);
        if (!lastRequestTime) {
            return 0;
        }
        const timeSinceLastRequest = Date.now() / 1000 - parseInt(lastRequestTime);
        const cooldownPeriod = auth_config_1.AuthConfig.OTP_COOLDOWN_PERIOD;
        const remaining = Math.max(0, cooldownPeriod - timeSinceLastRequest);
        return Math.ceil(remaining);
    }
    async deleteOtp(key, timeKey) {
        const keysToDelete = [key];
        if (timeKey) {
            keysToDelete.push(timeKey);
        }
        await this.cache.del(...keysToDelete);
    }
};
exports.OtpService = OtpService;
exports.OtpService = OtpService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService])
], OtpService);
//# sourceMappingURL=otp.service.js.map