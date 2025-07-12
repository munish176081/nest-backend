import { User } from "src/features/accounts/entities/account.entity";

export const createUserTokenData = (user: User) => {
  return {
    id: user.id,
    email: user.email,
    name: user.name || user.username || 'User',
    username: user.username,
    status: user.status,
    imageUrl: user.imageUrl,
    createdAt: user.createdAt,
  };
};

export type TokenData = ReturnType<typeof createUserTokenData>;
