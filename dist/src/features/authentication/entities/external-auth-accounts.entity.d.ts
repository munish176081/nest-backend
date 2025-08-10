import { User } from "../../accounts/entities/account.entity";
export declare class ExternalAuthAccount {
    id: string;
    email: string;
    provider: string;
    externalId: string;
    raw: Record<string, unknown>;
    user?: User;
    createdAt: string;
    updatedAt: string;
}
