import { NewsletterService } from "./newsletter.service";
import { SubscribeDto } from "./dto/subscribe.dto";
export declare class NewsletterController {
    private newsletter;
    constructor(newsletter: NewsletterService);
    subscribe(dto: SubscribeDto): Promise<{
        success: boolean;
        message: any;
    }>;
}
