"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const postmark_1 = require("postmark");
require("dotenv/config");
const POSTMARK_API_KEY = process.env.POSTMARK_API_KEY;
const POSTMARK_EMAIL = "admin@pups4sale.com.au";
const TEST_RECIPIENT = "test@pups4sale.com.au";
console.log('POSTMARK_API_KEY', POSTMARK_API_KEY);
console.log('POSTMARK_EMAIL', POSTMARK_EMAIL);
console.log('TEST_RECIPIENT', TEST_RECIPIENT);
if (!POSTMARK_API_KEY) {
    console.error('❌ Error: POSTMARK_API_KEY is not set in environment variables');
    process.exit(1);
}
if (!POSTMARK_EMAIL) {
    console.error('❌ Error: POSTMARK_EMAIL is not set in environment variables');
    process.exit(1);
}
const client = new postmark_1.ServerClient(POSTMARK_API_KEY);
const testData = {
    'welcome': {
        username: 'John Doe',
        verificationUrl: 'https://example.com/auth/verify-email?token=abc123&userId=user-123',
    },
    'password-reset': {
        resetUrl: 'https://example.com/auth/reset-password?token=xyz789&userId=user-123',
    },
    'welcome-1': {
        username: 'Jane Smith',
        otp: '123456',
        verificationUrl: 'https://example.com/auth/verify-email-otp',
    },
    'welcome-3': {
        otp: '654321',
        resetUrl: 'https://example.com/auth/reset-password-otp?email=user@example.com',
    },
    'welcome-4': {
        logoUrl: 'https://cdn.mcauto-images-production.sendgrid.net/181f48788a99b27a/8ece5df8-e43a-4541-a6ab-6f8c0d2a0756/140x45.png',
        firstName: 'Alice',
        lastName: 'Johnson',
        email: 'alice@example.com',
        phone: '+1 (555) 123-4567',
        subject: 'General Inquiry',
        message: 'This is a test message from the contact form. I would like to know more about your services.',
        submissionDate: new Date().toLocaleDateString(),
    },
    'welcome-5': {
        logoUrl: 'https://cdn.mcauto-images-production.sendgrid.net/181f48788a99b27a/8ece5df8-e43a-4541-a6ab-6f8c0d2a0756/140x45.png',
        firstName: 'Bob',
        lastName: 'Williams',
        email: 'bob@example.com',
        phone: '+1 (555) 987-6543',
        subject: 'Product Inquiry',
        message: 'I am interested in learning more about your products.',
        submissionDate: new Date().toLocaleDateString(),
    },
    'email-verification': {
        username: 'John Doe',
        verificationUrl: 'https://example.com/auth/verify-email?token=abc123&userId=user-123',
    },
    'reset-password': {
        resetUrl: 'https://example.com/auth/reset-password?token=xyz789&userId=user-123',
    },
    'email-verification-otp': {
        username: 'Jane Smith',
        otp: '123456',
        verificationUrl: 'https://example.com/auth/verify-email-otp',
    },
    'reset-password-otp': {
        otp: '654321',
        resetUrl: 'https://example.com/auth/reset-password-otp?email=user@example.com',
    },
    'contact-form': {
        logoUrl: 'https://cdn.mcauto-images-production.sendgrid.net/181f48788a99b27a/8ece5df8-e43a-4541-a6ab-6f8c0d2a0756/140x45.png',
        firstName: 'Alice',
        lastName: 'Johnson',
        email: 'alice@example.com',
        phone: '+1 (555) 123-4567',
        subject: 'General Inquiry',
        message: 'This is a test message from the contact form. I would like to know more about your services.',
        submissionDate: new Date().toLocaleDateString(),
    },
    'acknowledgment': {
        logoUrl: 'https://cdn.mcauto-images-production.sendgrid.net/181f48788a99b27a/8ece5df8-e43a-4541-a6ab-6f8c0d2a0756/140x45.png',
        firstName: 'Bob',
        lastName: 'Williams',
        email: 'bob@example.com',
        phone: '+1 (555) 987-6543',
        subject: 'Product Inquiry',
        message: 'I am interested in learning more about your products.',
        submissionDate: new Date().toLocaleDateString(),
    },
};
async function testTemplate(templateAlias) {
    console.log(`\n📧 Testing template: ${templateAlias}`);
    console.log('─'.repeat(50));
    const templateData = testData[templateAlias];
    if (!templateData) {
        console.error(`❌ No test data found for template: ${templateAlias}`);
        return false;
    }
    try {
        console.log(`📤 Sending to: ${TEST_RECIPIENT}`);
        console.log(`📋 Template data:`, JSON.stringify(templateData, null, 2));
        const response = await client.sendEmailWithTemplate({
            From: POSTMARK_EMAIL,
            To: TEST_RECIPIENT,
            TemplateAlias: templateAlias,
            TemplateModel: templateData,
        });
        console.log(`✅ Email sent successfully!`);
        console.log(`   Message ID: ${response.MessageID}`);
        console.log(`   Submitted at: ${response.SubmittedAt}`);
        return true;
    }
    catch (error) {
        console.error(`❌ Failed to send email`);
        console.error(`   Error Code: ${error?.ErrorCode || 'Unknown'}`);
        console.error(`   Message: ${error?.Message || error?.message || 'Unknown error'}`);
        if (error?.stack) {
            console.error(`   Stack: ${error.stack}`);
        }
        return false;
    }
}
async function testPlainEmail() {
    console.log(`\n📧 Testing plain email (no template)`);
    console.log('─'.repeat(50));
    try {
        console.log(`📤 Sending to: ${TEST_RECIPIENT}`);
        const response = await client.sendEmail({
            From: POSTMARK_EMAIL,
            To: TEST_RECIPIENT,
            Subject: 'Test Email - Plain Text',
            HtmlBody: '<h1>Test Email</h1><p>This is a plain test email without a template.</p>',
            TextBody: 'Test Email\n\nThis is a plain test email without a template.',
        });
        console.log(`✅ Plain email sent successfully!`);
        console.log(`   Message ID: ${response.MessageID}`);
        console.log(`   Submitted at: ${response.SubmittedAt}`);
        return true;
    }
    catch (error) {
        console.error(`❌ Failed to send plain email`);
        console.error(`   Error Code: ${error?.ErrorCode || 'Unknown'}`);
        console.error(`   Message: ${error?.Message || error?.message || 'Unknown error'}`);
        if (error?.stack) {
            console.error(`   Stack: ${error.stack}`);
        }
        return false;
    }
}
async function runAllTests() {
    console.log('🚀 Starting Postmark Email Template Tests');
    console.log('═'.repeat(50));
    console.log(`📧 From: ${POSTMARK_EMAIL}`);
    console.log(`📧 To: ${TEST_RECIPIENT}`);
    console.log(`🔑 API Key: ${POSTMARK_API_KEY.substring(0, 10)}...`);
    const templates = [
        'welcome',
        'password-reset',
        'welcome-1',
        'welcome-3',
        'welcome-4',
        'welcome-5',
    ];
    const results = {};
    results['plain-email'] = await testPlainEmail();
    for (const template of templates) {
        results[template] = await testTemplate(template);
        await new Promise(resolve => setTimeout(resolve, 1000));
    }
    console.log('\n' + '═'.repeat(50));
    console.log('📊 Test Summary');
    console.log('═'.repeat(50));
    const allResults = Object.entries(results);
    const passed = allResults.filter(([, success]) => success).length;
    const failed = allResults.filter(([, success]) => !success).length;
    allResults.forEach(([template, success]) => {
        const icon = success ? '✅' : '❌';
        console.log(`${icon} ${template}`);
    });
    console.log('\n' + '─'.repeat(50));
    console.log(`✅ Passed: ${passed}`);
    console.log(`❌ Failed: ${failed}`);
    console.log(`📊 Total: ${allResults.length}`);
    if (failed === 0) {
        console.log('\n🎉 All tests passed!');
        process.exit(0);
    }
    else {
        console.log('\n⚠️  Some tests failed. Please check the errors above.');
        process.exit(1);
    }
}
async function listTemplates() {
    console.log('\n📋 Listing available templates from Postmark...');
    console.log('─'.repeat(50));
    try {
        const templates = await client.getTemplates();
        console.log(`✅ Found ${templates.TotalCount} template(s):\n`);
        if (templates.TotalCount === 0) {
            console.log('⚠️  No templates found. Please create templates in your Postmark dashboard.');
            console.log('\nRequired template aliases (or update templates.ts to match your aliases):');
            console.log('  - welcome (email-verification)');
            console.log('  - password-reset (reset-password)');
            console.log('  - welcome-1 (email-verification-otp)');
            console.log('  - welcome-3 (reset-password-otp)');
            console.log('  - welcome-4 (contact-form)');
            console.log('  - welcome-5 (acknowledgment)');
        }
        else {
            templates.Templates.forEach((template) => {
                const alias = template.Alias || '(no alias)';
                const id = template.TemplateId;
                const name = template.Name;
                console.log(`  ${alias.padEnd(30)} ID: ${id.toString().padEnd(10)} Name: ${name}`);
            });
        }
        return templates;
    }
    catch (error) {
        console.error('❌ Failed to list templates');
        console.error(`   Error: ${error?.Message || error?.message || 'Unknown error'}`);
        return null;
    }
}
const templateToTest = process.argv[2];
if (templateToTest === 'list' || templateToTest === '--list') {
    listTemplates()
        .then(() => process.exit(0))
        .catch(error => {
        console.error('Unexpected error:', error);
        process.exit(1);
    });
}
else if (templateToTest) {
    if (templateToTest === 'plain') {
        testPlainEmail()
            .then(success => process.exit(success ? 0 : 1))
            .catch(error => {
            console.error('Unexpected error:', error);
            process.exit(1);
        });
    }
    else {
        testTemplate(templateToTest)
            .then(success => process.exit(success ? 0 : 1))
            .catch(error => {
            console.error('Unexpected error:', error);
            process.exit(1);
        });
    }
}
else {
    runAllTests().catch(error => {
        console.error('Unexpected error:', error);
        process.exit(1);
    });
}
//# sourceMappingURL=test-email-templates.js.map