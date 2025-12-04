"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MailchimpClient = void 0;
const common_1 = require("@nestjs/common");
const crypto = require("crypto");
let MailchimpClient = class MailchimpClient {
    constructor() {
        this.apiKey = process.env.MAILCHIMP_API_KEY;
        this.serverPrefix = process.env.MAILCHIMP_SERVER_PREFIX;
        this.audienceId = process.env.MAILCHIMP_AUDIENCE_ID;
    }
    getSubscriberHash(email) {
        return crypto.createHash('md5').update(email.toLowerCase()).digest('hex');
    }
    getAuthHeader() {
        const token = Buffer.from(`anystring:${this.apiKey}`).toString('base64');
        return {
            Authorization: `Basic ${token}`,
            'Content-Type': 'application/json',
        };
    }
    async fetchJson(url, options) {
        const res = await fetch(url, options);
        const data = await res.json().catch(() => null);
        return { ok: res.ok, status: res.status, data };
    }
    async addMember(name, email) {
        const subscriberHash = this.getSubscriberHash(email);
        const baseUrl = `https://${this.serverPrefix}.api.mailchimp.com/3.0/lists/${this.audienceId}/members`;
        const memberUrl = `${baseUrl}/${subscriberHash}`;
        const payload = {
            email_address: email,
            status: "subscribed",
            merge_fields: { FNAME: name || "" },
            email_type: "html",
        };
        const getRes = await this.fetchJson(memberUrl, {
            method: "GET",
            headers: this.getAuthHeader(),
        });
        if (getRes.ok) {
            const subscriber = getRes.data;
            if (subscriber.status === "subscribed") {
                return { success: false, message: "Email is already subscribed" };
            }
            const putRes = await this.fetchJson(memberUrl, {
                method: "PUT",
                headers: this.getAuthHeader(),
                body: JSON.stringify(payload),
            });
            if (putRes.ok) {
                return { success: true, message: "Subscribed successfully" };
            }
            return {
                success: false,
                message: putRes.data?.detail || "Failed to update subscriber",
            };
        }
        if (getRes.status === 404) {
            const postRes = await this.fetchJson(baseUrl, {
                method: "POST",
                headers: this.getAuthHeader(),
                body: JSON.stringify(payload),
            });
            if (postRes.ok) {
                return { success: true, message: "Subscribed successfully" };
            }
            return {
                success: false,
                message: postRes.data?.detail || "Failed to subscribe",
            };
        }
        return {
            success: false,
            message: getRes.data?.detail || "Mailchimp request failed",
        };
    }
};
exports.MailchimpClient = MailchimpClient;
exports.MailchimpClient = MailchimpClient = __decorate([
    (0, common_1.Injectable)()
], MailchimpClient);
//# sourceMappingURL=mailchimp.client.js.map