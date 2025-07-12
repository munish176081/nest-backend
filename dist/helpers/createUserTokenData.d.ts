import { User } from "src/features/accounts/entities/account.entity";
export declare const createUserTokenData: (user: User) => {
    id: string;
    email: string;
    name: string;
    username: string;
    status: import("src/features/accounts/entities/account.entity").UserStatusEnum;
    imageUrl: string;
    createdAt: string;
};
export type TokenData = ReturnType<typeof createUserTokenData>;
