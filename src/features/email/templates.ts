// Postmark template aliases or IDs
// These should match the aliases configured in your Postmark dashboard
// You can use either templateAlias (string) or templateId (number)
export const postmarkEmailTemplates = {
  emailVerification: 'welcome', // Account Verification Email by link
  resetPassword: 'password-reset', // Password reset
  emailVerificationWithOtp: 'welcome-1', // Account Verification Email by OTP
  resetPasswordWithOtp: 'welcome-3', // Reset password otp
  contactForm: 'welcome-4', // Contact form
  acknowledgment: 'welcome-5', // Acknowledge email
  listingPendingReview: 'listing-pending-review', // Admin notification when listing is pending review
  listingApproved: 'listing-approved', // User notification when listing is approved
  listingApprovedAdmin: 'listing-approved-admin', // Admin confirmation when listing is approved
};

// For backward compatibility, export as sendGridEmailTemplates (deprecated)
// TODO: Update all usages to use postmarkEmailTemplates
export const sendGridEmailTemplates = postmarkEmailTemplates;

export const images = {
  logo: 'https://cdn.mcauto-images-production.sendgrid.net/181f48788a99b27a/8ece5df8-e43a-4541-a6ab-6f8c0d2a0756/140x45.png',
};
