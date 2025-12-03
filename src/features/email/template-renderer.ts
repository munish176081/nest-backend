import { readFileSync } from 'fs';
import { join, resolve } from 'path';
import { postmarkEmailTemplates } from './templates';

/**
 * Renders HTML email templates by replacing placeholders with dynamic data
 */
export class TemplateRenderer {
  // Resolve path from project root (works in both dev and production)
  private static templatesPath = resolve(process.cwd(), 'postmark-templates');

  /**
   * Renders a template by replacing {{variable}} placeholders with actual values
   */
  static renderTemplate(templateAlias: string, data: Record<string, any>): string {
    let html: string;

    // Map template aliases to HTML files
    const templateMap: Record<string, string> = {
      [postmarkEmailTemplates.emailVerification]: 'email-verification.html',
      [postmarkEmailTemplates.resetPassword]: 'reset-password.html',
      [postmarkEmailTemplates.emailVerificationWithOtp]: 'email-verification-otp.html',
      [postmarkEmailTemplates.resetPasswordWithOtp]: 'reset-password-otp.html',
      [postmarkEmailTemplates.contactForm]: 'contact-form.html',
      [postmarkEmailTemplates.acknowledgment]: 'acknowledgment.html',
      [postmarkEmailTemplates.listingPendingReview]: 'listing-pending-review.html',
      [postmarkEmailTemplates.listingApproved]: 'listing-approved.html',
      [postmarkEmailTemplates.listingApprovedAdmin]: 'listing-approved-admin.html',
    };

    const templateFile = templateMap[templateAlias];
    if (!templateFile) {
      throw new Error(`Template not found: ${templateAlias}`);
    }

    try {
      html = readFileSync(
        join(this.templatesPath, templateFile),
        'utf-8',
      );
    } catch (error) {
      throw new Error(`Failed to load template file: ${templateFile} - ${error.message}`);
    }

    // Replace all {{variable}} placeholders with actual values
    let renderedHtml = html;
    for (const [key, value] of Object.entries(data)) {
      const regex = new RegExp(`{{\\s*${key}\\s*}}`, 'g');
      renderedHtml = renderedHtml.replace(regex, String(value || ''));
    }

    // Remove any remaining unreplaced placeholders (optional, for cleaner output)
    // renderedHtml = renderedHtml.replace(/{{[^}]+}}/g, '');

    return renderedHtml;
  }

  /**
   * Renders a simple HTML email from a template string
   */
  static renderString(template: string, data: Record<string, any>): string {
    let rendered = template;
    for (const [key, value] of Object.entries(data)) {
      const regex = new RegExp(`{{\\s*${key}\\s*}}`, 'g');
      rendered = rendered.replace(regex, String(value || ''));
    }
    return rendered;
  }
}

