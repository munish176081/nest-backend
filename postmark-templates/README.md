# Postmark Email Templates

This directory contains all email templates for your Postmark integration. Each template has both HTML and plain text versions.

## Templates Included

1. **email-verification** - Email verification with link
2. **reset-password** - Password reset with link
3. **email-verification-otp** - Email verification with OTP code
4. **reset-password-otp** - Password reset with OTP code
5. **contact-form** - Admin notification for contact form submissions
6. **acknowledgment** - User acknowledgment email for contact form submissions

## How to Add Templates to Postmark

1. Log in to your Postmark dashboard
2. Navigate to **Templates** section
3. Click **Add Template** → **Start from Scratch**
4. Set the **Template Alias** to match the template name (e.g., `email-verification`)
5. Copy the HTML content from the `.html` file into the **HTML** section
6. Copy the text content from the `.txt` file into the **Plain Text** section
7. Save the template
8. Repeat for all 6 templates

## Template Variables

### email-verification
- `{{username}}` - User's name
- `{{verificationUrl}}` - Email verification link

### reset-password
- `{{resetUrl}}` - Password reset link

### email-verification-otp
- `{{username}}` - User's name
- `{{otp}}` - 6-digit OTP code
- `{{verificationUrl}}` - Email verification link (optional)

### reset-password-otp
- `{{otp}}` - 6-digit OTP code
- `{{resetUrl}}` - Password reset link (optional)

### contact-form
- `{{firstName}}` - Contact's first name
- `{{lastName}}` - Contact's last name
- `{{email}}` - Contact's email
- `{{phone}}` - Contact's phone (optional)
- `{{subject}}` - Inquiry subject
- `{{message}}` - Inquiry message
- `{{submissionDate}}` - Submission date

### acknowledgment
- `{{firstName}}` - Contact's first name
- `{{subject}}` - Inquiry subject
- `{{submissionDate}}` - Submission date

## Notes

- All templates use Mustache syntax (`{{variable}}`) for dynamic content
- The `{{#phone}}` syntax in contact-form is a conditional block - it will only show if phone is provided
- Templates are designed to be responsive and work across email clients
- The color scheme uses #14a800 (green) for primary actions, matching a professional design

