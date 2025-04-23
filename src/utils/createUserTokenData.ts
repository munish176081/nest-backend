import { User } from 'src/modules/users/entities/user.entity';

export const createUserTokenData = (user: User) => {
  return {
    id: user.id,
    email: user.email,
    username: user.username,
    status: user.status,
    imageUrl: user.imageUrl,
    createdAt: user.createdAt,
  };
};

export type TokenData = ReturnType<typeof createUserTokenData>;
