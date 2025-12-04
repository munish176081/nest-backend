"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TemplateRenderer = void 0;
const fs_1 = require("fs");
const path_1 = require("path");
const templates_1 = require("./templates");
class TemplateRenderer {
    static renderTemplate(templateAlias, data) {
        let html;
        const templateMap = {
            [templates_1.postmarkEmailTemplates.emailVerification]: 'email-verification.html',
            [templates_1.postmarkEmailTemplates.resetPassword]: 'reset-password.html',
            [templates_1.postmarkEmailTemplates.emailVerificationWithOtp]: 'email-verification-otp.html',
            [templates_1.postmarkEmailTemplates.resetPasswordWithOtp]: 'reset-password-otp.html',
            [templates_1.postmarkEmailTemplates.contactForm]: 'contact-form.html',
            [templates_1.postmarkEmailTemplates.acknowledgment]: 'acknowledgment.html',
            [templates_1.postmarkEmailTemplates.listingPendingReview]: 'listing-pending-review.html',
            [templates_1.postmarkEmailTemplates.listingApproved]: 'listing-approved.html',
            [templates_1.postmarkEmailTemplates.listingApprovedAdmin]: 'listing-approved-admin.html',
        };
        const templateFile = templateMap[templateAlias];
        if (!templateFile) {
            throw new Error(`Template not found: ${templateAlias}`);
        }
        try {
            html = (0, fs_1.readFileSync)((0, path_1.join)(this.templatesPath, templateFile), 'utf-8');
        }
        catch (error) {
            throw new Error(`Failed to load template file: ${templateFile} - ${error.message}`);
        }
        let renderedHtml = html;
        for (const [key, value] of Object.entries(data)) {
            const regex = new RegExp(`{{\\s*${key}\\s*}}`, 'g');
            renderedHtml = renderedHtml.replace(regex, String(value || ''));
        }
        return renderedHtml;
    }
    static renderString(template, data) {
        let rendered = template;
        for (const [key, value] of Object.entries(data)) {
            const regex = new RegExp(`{{\\s*${key}\\s*}}`, 'g');
            rendered = rendered.replace(regex, String(value || ''));
        }
        return rendered;
    }
}
exports.TemplateRenderer = TemplateRenderer;
TemplateRenderer.templatesPath = (0, path_1.resolve)(process.cwd(), 'postmark-templates');
//# sourceMappingURL=template-renderer.js.map