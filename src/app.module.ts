import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { ConfigModule, ConfigService } from '@nestjs/config';
import { configOptions } from './config/options';
import { ExternalAuthAccount } from './features/authentication/entities/external-auth-accounts.entity';
import { User } from './features/accounts/entities/account.entity';
import { Upload } from './features/upload/entities/upload.entity';
import { Listing } from './features/listings/entities/listing.entity';
import { Breed } from './features/breeds/entities/breed.entity';
// Temporarily commented out to avoid schema conflicts
// import { ListingType } from './features/listings/entities/listing-type.entity';
// import { ListingFile } from './features/listings/entities/listing-file.entity';
import { SnakeCaseNamingStrategy } from './helpers/typeOrmSnakeCaseNamingStrategy';
import { UsersModule } from './features/accounts/users.module';
import { AuthModule } from './features/authentication/authentication.module';
import { EmailModule } from './features/email/email.module';
import { UploadModule } from './features/upload/upload.module';
import { ContactModule } from './features/contact/contact.module';
import { ListingsModule } from './features/listings/listings.module';
import { BreedsModule } from './features/breeds/breeds.module';


@Module({
  imports: [
    ConfigModule.forRoot(configOptions),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const isProduction = configService.get('NODE_ENV') === 'production';
    
        return {
          type: 'postgres',
          url: configService.get('dbUrl'),
          synchronize: true, // Enabled
          entities: [ExternalAuthAccount, User, Upload, Listing, Breed],
          namingStrategy: new SnakeCaseNamingStrategy(),
          logging: !isProduction,
    
          // ✅ Final working setup: one ssl object only
          ssl: {
            rejectUnauthorized: false,
          },
          extra: {
            ssl: {
              rejectUnauthorized: false,
            },
          },
        };
      },
    }),
    UsersModule,
    AuthModule,
    EmailModule,
    UploadModule,
    ContactModule,
    ListingsModule,
    BreedsModule,
  ],
  providers: [],
})
export class AppModule {}
