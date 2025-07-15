import {
  BadRequestException,
  Inject,
  Injectable,
  UnauthorizedException,
  forwardRef,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ILike, Not, Repository } from 'typeorm';
import { User } from './entities/account.entity';
import { SessionService } from '../authentication/session.service';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @Inject(forwardRef(() => SessionService))
    private readonly sessionService: SessionService,
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

        const updatedUser = await this.userRepo.save(userExist);

        // Update session data after user data changes
        try {
          await this.sessionService.updateUserSession(updatedUser.id, updatedUser);
        } catch (error) {
          console.error('Error updating session after user data changes:', error);
        }

        return updatedUser;
      }

      return userExist;
    }

    // Create name from firstName and lastName
    const name = `${firstName || ''} ${lastName || ''}`.trim() || 'User';
    const username = await this.generateUsername(firstName, lastName);

    const user = this.userRepo.create({
      name,
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

  async generateUsernameFromName(
    name: string,
    randomNumber: string = '',
  ) {
    // Convert name to lowercase and remove special characters
    const cleanName = name.toLowerCase().replace(/[^a-z0-9]/g, '');
    const username = `${cleanName}${randomNumber ? `_${randomNumber}` : ''}`;
    
    const isUsernameExists = await this.userRepo.findOneBy({
      username: ILike(username),
    });

    if (isUsernameExists) {
      return this.generateUsernameFromName(
        name,
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
        ...(username ? [{ username: ILike(username) }] : []),
        ...(email ? [{ email }] : []),
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
    // Store the frontend's username as name, and generate a unique username
    const name = createUser.username;
    const generatedUsername = await this.generateUsernameFromName(name);

    const user = this.userRepo.create({
      email: createUser.email,
      name,
      username: generatedUsername,
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

    // Update session data after user verification
    try {
      const updatedUser = await this.userRepo.findOneBy({ id: userId });
      if (updatedUser) {
        await this.sessionService.updateUserSession(userId, updatedUser);
      }
    } catch (error) {
      console.error('Error updating session after user verification:', error);
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

    const updatedUser = await this.userRepo.save(user);

    // Update session data after password reset
    try {
      await this.sessionService.updateUserSession(userId, updatedUser);
    } catch (error) {
      console.error('Error updating session after password reset:', error);
    }

    return updatedUser;
  }

  async verifyUserByEmail(email: string) {
    const user = await this.userRepo.findOneBy({ email });
    if (!user) {
      throw new BadRequestException('User not found');
    }
    if (user.status === 'active') {
      throw new BadRequestException('User already verified');
    }
    user.status = 'active';
    await this.userRepo.save(user);
    // Update session data after user verification
    try {
      await this.sessionService.updateUserSession(user.id, user);
    } catch (error) {
      console.error('Error updating session after user verification:', error);
    }
  }

  async migrateExistingUsers() {
    console.log('Starting migration of existing users...');
    
    // Get all users with null name
    const usersWithNullName = await this.userRepo.find({
      where: { name: null },
    });

    console.log(`Found ${usersWithNullName.length} users with null name`);

    for (const user of usersWithNullName) {
      try {
        // Set name to username if name is null
        user.name = user.username || 'User';
        
        // Generate a new unique username based on the name
        const newUsername = await this.generateUsernameFromName(user.name);
        user.username = newUsername;
        
        await this.userRepo.save(user);
        console.log(`Migrated user: ${user.email} -> name: ${user.name}, username: ${user.username}`);
      } catch (error) {
        console.error(`Failed to migrate user ${user.email}:`, error);
      }
    }

    console.log('Migration completed');
  }
}
