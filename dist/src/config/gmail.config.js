"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createGmailOAuth2Client = void 0;
const googleapis_1 = require("googleapis");
const fs_1 = require("fs");
const path_1 = require("path");
function loadGmailCredentials(configService) {
    const possiblePaths = [
        (0, path_1.join)(process.cwd(), 'client_secret_763573865617_bscvdt95m89ihn8hcih38chm9qh0b7sp_apps.json'),
        (0, path_1.join)(process.cwd(), 'nest-backend', 'client_secret_763573865617_bscvdt95m89ihn8hcih38chm9qh0b7sp_apps.json'),
        (0, path_1.join)(process.env.HOME || '', 'Downloads', 'client_secret_763573865617_bscvdt95m89ihn8hcih38chm9qh0b7sp_apps.json'),
        process.env.GMAIL_CREDENTIALS_JSON_PATH,
    ].filter(Boolean);
    for (const jsonPath of possiblePaths) {
        try {
            const jsonContent = (0, fs_1.readFileSync)(jsonPath, 'utf-8');
            const credentials = JSON.parse(jsonContent);
            if (credentials.web) {
                return {
                    clientId: credentials.web.client_id,
                    clientSecret: credentials.web.client_secret,
                    redirectUri: credentials.web.redirect_uris?.[0] || 'http://localhost:3001/api/v1/auth/gmail/callback',
                };
            }
        }
        catch (error) {
            continue;
        }
    }
    const clientId = configService.get('gmail.clientId') || process.env.EMAIL_GMAIL_CLIENT_ID;
    const clientSecret = configService.get('gmail.clientSecret') || process.env.EMAIL_GMAIL_CLIENT_SECRET;
    const redirectUri = configService.get('gmail.redirectUri') || process.env.EMAIL_GMAIL_REDIRECT_URI || 'http://localhost:3001/api/v1/auth/gmail/callback';
    if (!clientId || !clientSecret) {
        throw new Error('Gmail OAuth credentials not configured. ' +
            'Please set EMAIL_GMAIL_CLIENT_ID and EMAIL_GMAIL_CLIENT_SECRET in your .env file ' +
            'or provide a Gmail credentials JSON file.');
    }
    return {
        clientId,
        clientSecret,
        redirectUri,
    };
}
const createGmailOAuth2Client = (configService) => {
    const credentials = loadGmailCredentials(configService);
    return new googleapis_1.google.auth.OAuth2(credentials.clientId, credentials.clientSecret, credentials.redirectUri);
};
exports.createGmailOAuth2Client = createGmailOAuth2Client;
//# sourceMappingURL=gmail.config.js.map