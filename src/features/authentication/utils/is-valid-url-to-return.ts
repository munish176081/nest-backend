export const isAllowedUrlToReturn = (url: string) => {
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
  } catch (error: any) {
    console.log(`Failed to parse url ${url}: ${error.message}`);
  }

  return false;
};
