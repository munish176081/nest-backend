import * as Joi from 'joi';

enum Environment {
  Development = 'development',
  Staging = 'staging',
  Production = 'production',
  Test = 'test',
}

enum EmailServiceType {
  Postmark = 'postmark',
  SMTP = 'smtp',
  Gmail = 'gmail',
}

export const configValidationSchema = Joi.object({
  NODE_ENV: Joi.string().valid(...Object.values(Environment)),
  DATABASE_URL: Joi.string().required(),

  API_URL: Joi.string().required(),
  SITE_URL: Joi.string().required(),

  GOOGLE_CLIENT_ID: Joi.string().required(),
  GOOGLE_CLIENT_SECRET: Joi.string().required(),

  FACEBOOK_CLIENT_ID: Joi.string().required(),
  FACEBOOK_CLIENT_SECRET: Joi.string().required(),

  // OAuth Timeout Configuration
  OAUTH_TIMEOUT: Joi.number().default(30000), // 30 seconds default

  // Email Configuration
  EMAIL_SERVICE_TYPE: Joi.string().valid(...Object.values(EmailServiceType)).required(),
  
  // Postmark Configuration
  POSTMARK_API_KEY: Joi.string().when('EMAIL_SERVICE_TYPE', {
    is: EmailServiceType.Postmark,
    then: Joi.required(),
    otherwise: Joi.optional(),
  }),
  POSTMARK_EMAIL: Joi.string().when('EMAIL_SERVICE_TYPE', {
    is: EmailServiceType.Postmark,
    then: Joi.required(),
    otherwise: Joi.optional(),
  }),

  // SMTP Configuration
  SMTP_HOST: Joi.string().when('EMAIL_SERVICE_TYPE', {
    is: EmailServiceType.SMTP,
    then: Joi.required(),
    otherwise: Joi.optional(),
  }),
  SMTP_PORT: Joi.number().when('EMAIL_SERVICE_TYPE', {
    is: EmailServiceType.SMTP,
    then: Joi.required(),
    otherwise: Joi.optional(),
  }),
  SMTP_USER: Joi.string().when('EMAIL_SERVICE_TYPE', {
    is: EmailServiceType.SMTP,
    then: Joi.required(),
    otherwise: Joi.optional(),
  }),
  SMTP_PASSWORD: Joi.string().when('EMAIL_SERVICE_TYPE', {
    is: EmailServiceType.SMTP,
    then: Joi.required(),
    otherwise: Joi.optional(),
  }),
  SMTP_FROM_EMAIL: Joi.string().when('EMAIL_SERVICE_TYPE', {
    is: EmailServiceType.SMTP,
    then: Joi.required(),
    otherwise: Joi.optional(),
  }),
  SMTP_SECURE: Joi.boolean().default(true),

  // Gmail API Configuration (using EMAIL_GMAIL_ prefix to avoid conflicts with GOOGLE_CLIENT_ID/SECRET)
  EMAIL_GMAIL_CLIENT_ID: Joi.string().when('EMAIL_SERVICE_TYPE', {
    is: EmailServiceType.Gmail,
    then: Joi.required(),
    otherwise: Joi.optional(),
  }),
  EMAIL_GMAIL_CLIENT_SECRET: Joi.string().when('EMAIL_SERVICE_TYPE', {
    is: EmailServiceType.Gmail,
    then: Joi.required(),
    otherwise: Joi.optional(),
  }),
  EMAIL_GMAIL_REDIRECT_URI: Joi.string().optional(),
  // Refresh token is optional initially - user needs to obtain it via OAuth flow
  EMAIL_GMAIL_REFRESH_TOKEN: Joi.string().optional(),
  EMAIL_GMAIL_ACCESS_TOKEN: Joi.string().optional(),
  EMAIL_GMAIL_EXPIRY_DATE: Joi.number().optional(),

  SESSION_SECRET: Joi.string().required(),
  COOKIE_DOMAIN: Joi.string().optional(),

  // Cloud Provider
  CLOUD_PROVIDER: Joi.string().optional(),

  // R2 Configuration
  R2_ACCESS_KEY_ID: Joi.string().optional(),
  R2_SECRET_ACCESS_KEY: Joi.string().optional(),
  R2_BUCKET_NAME: Joi.string().optional(),
  R2_ENDPOINT: Joi.string().optional(),
  R2_REGION: Joi.string().default('auto'),
  R2_PUBLIC_CDN: Joi.string().optional(),
});

export const configConfiguration = () => {
  return {
    env: process.env.NODE_ENV,
    appPort: parseInt(process.env.PORT || '3001'),
    dbUrl: process.env.DATABASE_URL,
    siteUrl: process.env.SITE_URL,
    apiUrl: process.env.API_URL,
    oauthTimeout: parseInt(process.env.OAUTH_TIMEOUT || '30000'),
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    },
    facebook: {
      clientId: process.env.FACEBOOK_CLIENT_ID,
      clientSecret: process.env.FACEBOOK_CLIENT_SECRET,
    },
    gmail: {
      clientId: process.env.EMAIL_GMAIL_CLIENT_ID,
      clientSecret: process.env.EMAIL_GMAIL_CLIENT_SECRET,
      redirectUri: process.env.EMAIL_GMAIL_REDIRECT_URI,
      accessToken: process.env.EMAIL_GMAIL_ACCESS_TOKEN,
      refreshToken: process.env.EMAIL_GMAIL_REFRESH_TOKEN,
      expiryDate: process.env.EMAIL_GMAIL_EXPIRY_DATE ? parseInt(process.env.EMAIL_GMAIL_EXPIRY_DATE, 10) : undefined,
    },
    email: {
      serviceType: process.env.EMAIL_SERVICE_TYPE,
      postmark: {
        apiKey: process.env.POSTMARK_API_KEY,
        email: process.env.POSTMARK_EMAIL,
      },
      smtp: {
        host: process.env.SMTP_HOST,
        port: parseInt(process.env.SMTP_PORT || '587'),
        user: process.env.SMTP_USER,
        password: process.env.SMTP_PASSWORD,
        fromEmail: process.env.SMTP_FROM_EMAIL,
        secure: process.env.SMTP_SECURE === 'true',
      },
    },
    session: {
      name: 'token',
      secret: process.env.SESSION_SECRET,
      resave: false,
      saveUninitialized: false,
      cookie: {
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
        secure: process.env.CLOUD_PROVIDER ? true : 'auto',
        sameSite: process.env.CLOUD_PROVIDER ? 'none' : 'lax',
        proxy: true,
      },
    },
    redis: {
      url: process.env.REDIS_URL,
      host: process.env.REDIS_HOST,
      port: parseInt(process.env.REDIS_PORT || '6379'),
      tokenCache: {
        db: 0,
      },
    },
    contact: {
      supportEmail: process.env.CONTACT_SUPPORT_EMAIL,
    },
    stripeSecretKey: process.env.STRIPE_SECRET_KEY,
    stripeWebhookSecret: process.env.STRIPE_WEBHOOK_SECRET,
    cloudProvider: process.env.CLOUD_PROVIDER,
    r2: {
      accessKeyId: process.env.R2_ACCESS_KEY_ID,
      secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
      bucketName: process.env.R2_BUCKET_NAME,
      endpoint: process.env.R2_ENDPOINT,
      region: process.env.R2_REGION || 'auto',
      publicCdn: process.env.R2_PUBLIC_CDN,
    },
  };
};
