import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { User } from './entities/user.entity';
import { ILike, Not, Repository } from 'typeorm';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
  ) {}

  async createByAccount({
    email,
    imageUrl,
    ip,
    firstName,
    lastName,
  }: {
    email: string;
    imageUrl?: string;
    ip?: string;
    firstName?: string;
    lastName?: string;
  }) {
    const userExist = await this.getExistByUsernameOrEmail({ email });

    if (userExist) {
      // we do not allow to user to connect multiple external providers with same email
      if (userExist.externalAccounts.length > 0)
        throw new BadRequestException('User already exists with this email');

      // validate if user is suspended, if so, we do not allow to user to connect multiple external providers with same email
      if (userExist.status === 'suspended')
        throw new UnauthorizedException('User is suspended');

      if (
        userExist.status === 'not_verified' ||
        (imageUrl && !userExist.imageUrl)
      ) {
        // if user email is not verified, we can verify it now
        if (userExist.status === 'not_verified') {
          userExist.status = 'active';
        }

        // if user does not have profile image, add that
        if (imageUrl && !userExist.imageUrl) {
          userExist.imageUrl = imageUrl;
        }

        await this.userRepo.save(userExist);
      }

      return userExist;
    }

    const username = await this.generateUsername(firstName, lastName);

    const user = this.userRepo.create({
      username,
      ip,
      email,
      imageUrl,
      status: 'active',
    });

    return this.userRepo.save(user);
  }

  async generateUsername(
    firstName: string = '',
    lastName: string = '',
    randomNumber: string = '',
  ) {
    const username = `${firstName.toLowerCase()}${lastName.toLowerCase()}${randomNumber ? `_${randomNumber}` : ''}`;
    const isUsernameExists = await this.userRepo.findOneBy({
      username: ILike(username),
    });

    if (isUsernameExists) {
      return this.generateUsername(
        firstName,
        lastName,
        `${randomNumber}${Math.trunc(Math.random() * 100)}`,
      );
    }

    return username;
  }

  async getBy({ email }: { email: string }) {
    return this.userRepo.findOneBy({ email });
  }

  async getExistByUsernameOrEmail({
    username,
    email,
  }: {
    username?: string;
    email?: string;
  }) {
    const user = await this.userRepo.findOne({
      where: [
        // Check if a user exists with the given username (case-insensitive).
        { username: ILike(username) },
        { email },
      ],
      relations: { externalAccounts: true },
    });

    return user;
  }

  async create(createUser: {
    email: string;
    username: string;
    hashedPassword: string;
    ip?: string;
  }) {
    const user = this.userRepo.create({
      email: createUser.email,
      username: createUser.username,
      hashedPassword: createUser.hashedPassword,
      ip: createUser.ip,
      status: 'not_verified',
    });

    return this.userRepo.save(user);
  }

  async validateAndGetUser(usernameOrEmail: string) {
    if (!usernameOrEmail) {
      throw new Error('Username or email is required to get user');
    }

    const user = await this.userRepo.findOne({
      where: [{ username: usernameOrEmail }, { email: usernameOrEmail }],
      relations: {
        externalAccounts: true,
      },
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    if (user.status === 'suspended') {
      throw new UnauthorizedException('User is suspended');
    }

    return user;
  }

  async verifyUser(userId: string) {
    const { affected } = await this.userRepo.update(
      { id: userId, status: Not('active') },
      { status: 'active' },
    );

    if (affected === 0) {
      throw new BadRequestException('User already verified');
    }
  }

  async resetPassword(userId: string, hashedPassword: string) {
    const user = await this.userRepo.findOneBy({ id: userId });

    if (!user) {
      throw new BadRequestException('User not found');
    }

    if (!user.hashedPassword) {
      throw new BadRequestException('User does not have a password');
    }

    user.hashedPassword = hashedPassword;

    return this.userRepo.save(user);
  }
}
