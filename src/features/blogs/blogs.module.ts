import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BlogPost } from './entities/blog-post.entity';
import { BlogCategory } from './entities/blog-category.entity';
import { BlogRepository } from './repositories/blog.repository';
import { BlogService } from './services/blog.service';
import { BlogController } from './controllers/blog.controller';
import { AuthModule } from '../authentication/authentication.module';
import { UsersModule } from '../accounts/users.module';
import { LoggedInGuard } from '../../middleware/LoggedInGuard';
import { ActiveUserGuard } from '../../middleware/ActiveUserGuard';

@Module({
  imports: [
    TypeOrmModule.forFeature([BlogPost, BlogCategory]),
    AuthModule,
    UsersModule,
  ],
  providers: [BlogRepository, BlogService, LoggedInGuard, ActiveUserGuard],
  controllers: [BlogController],
  exports: [BlogService, BlogRepository],
})
export class BlogsModule {}
