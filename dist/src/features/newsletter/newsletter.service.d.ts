import { MailchimpClient } from "./mailchimp.client";
export declare class NewsletterService {
    private mailchimp;
    constructor(mailchimp: MailchimpClient);
    subscribe(name: string, email: string): Promise<{
        success: boolean;
        message: any;
    }>;
}
