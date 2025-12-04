export declare const configOptions: {
    envFilePath: string;
    load: (() => {
        env: string;
        appPort: number;
        dbUrl: string;
        siteUrl: string;
        apiUrl: string;
        oauthTimeout: number;
        google: {
            clientId: string;
            clientSecret: string;
        };
        facebook: {
            clientId: string;
            clientSecret: string;
        };
        gmail: {
            clientId: string;
            clientSecret: string;
            redirectUri: string;
            accessToken: string;
            refreshToken: string;
            expiryDate: number;
            fromName: string;
        };
        email: {
            serviceType: string;
            postmark: {
                apiKey: string;
                email: string;
            };
            smtp: {
                host: string;
                port: number;
                user: string;
                password: string;
                fromEmail: string;
                secure: boolean;
            };
        };
        session: {
            name: string;
            secret: string;
            resave: boolean;
            saveUninitialized: boolean;
            cookie: {
                maxAge: number;
                secure: string | boolean;
                sameSite: string;
                proxy: boolean;
            };
        };
        redis: {
            url: string;
            host: string;
            port: number;
            tokenCache: {
                db: number;
            };
        };
        contact: {
            supportEmail: string;
        };
        stripe: {
            secretKey: string;
            publishableKey: string;
            webhookSecret: string;
        };
        paypal: {
            clientId: string;
            secret: string;
            environment: string;
        };
        recaptcha: {
            secretKey: string;
        };
        cloudProvider: string;
        r2: {
            accessKeyId: string;
            secretAccessKey: string;
            bucketName: string;
            endpoint: string;
            region: string;
            publicCdn: string;
        };
    })[];
    validationSchema: import("joi").ObjectSchema<any>;
    isGlobal: boolean;
    ignoreEnvVars: boolean;
    validationOptions: {
        abortEarly: boolean;
    };
};
