import * as Joi from 'joi';

enum Environment {
  Development = 'development',
  Staging = 'staging',
  Production = 'production',
  Test = 'test',
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

  SENDGRID_API_KEY: Joi.string().required(),
  SENDGRID_EMAIL: Joi.string().required(),

  SESSION_SECRET: Joi.string().required(),
  COOKIE_DOMAIN: Joi.string().optional(),

  PORT: Joi.number().optional(),
  STRIPE_SECRET_KEY: Joi.string(),
  STRIPE_WEBHOOK_SECRET: Joi.string(),
});

export const configConfiguration = () => {
  return {
    env: process.env.NODE_ENV,
    appPort: parseInt(process.env.PORT || '3001'),
    dbUrl: process.env.DATABASE_URL,
    siteUrl: process.env.SITE_URL,
    apiUrl: process.env.API_URL,
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    },
    facebook: {
      clientId: process.env.FACEBOOK_CLIENT_ID,
      clientSecret: process.env.FACEBOOK_CLIENT_SECRET,
    },
    sendgrid: {
      apiKey: process.env.SENDGRID_API_KEY,
      email: process.env.SENDGRID_EMAIL,
    },
    session: {
      name: 'token',
      secret: process.env.SESSION_SECRET,
      resave: false,
      saveUninitialized: false,
      cookie: {
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
        secure: process.env.CLOUD_PROVIDER ? true : 'auto',
        // domain: process.env.COOKIE_DOMAIN || '/',
        sameSite: process.env.CLOUD_PROVIDER ? 'none' : 'lax',
        proxy: true,
      },
    },
    redis: {
      url: process.env.REDIS_URL,
      host: process.env.REDIS_HOST,
      port: parseInt(process.env.REDIS_PORT || '6379'),
      tokenCache: {
        db: 1,
      },
    },
    stripeSecretKey: process.env.STRIPE_SECRET_KEY,
    stripeWebhookSecret: process.env.STRIPE_WEBHOOK_SECRET,
    cloudProvider: process.env.CLOUD_PROVIDER,
  };
};
