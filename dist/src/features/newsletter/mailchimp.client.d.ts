export declare class MailchimpClient {
    private readonly apiKey;
    private readonly serverPrefix;
    private readonly audienceId;
    private getSubscriberHash;
    private getAuthHeader;
    private fetchJson;
    addMember(name: string, email: string): Promise<{
        success: boolean;
        message: any;
    }>;
}
