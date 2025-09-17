export declare class UserDto {
    id: string;
    email: string;
    name: string;
    username: string;
    imageUrl: string;
    createdAt: string;
    status: string;
    role: string;
    isSuperAdmin: boolean;
    get displayName(): string;
}
