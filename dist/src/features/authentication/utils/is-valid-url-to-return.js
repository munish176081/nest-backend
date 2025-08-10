"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isAllowedUrlToReturn = void 0;
const isAllowedUrlToReturn = (url) => {
    const siteUrl = process.env.SITE_URL;
    const siteDomain = new URL(siteUrl).hostname;
    if (typeof url !== 'string') {
        return false;
    }
    try {
        const domain = new URL(url).hostname;
        if (domain === siteDomain && !url.startsWith(`${siteUrl}/login`)) {
            return true;
        }
    }
    catch (error) {
        console.log(`Failed to parse url ${url}: ${error.message}`);
    }
    return false;
};
exports.isAllowedUrlToReturn = isAllowedUrlToReturn;
//# sourceMappingURL=is-valid-url-to-return.js.map