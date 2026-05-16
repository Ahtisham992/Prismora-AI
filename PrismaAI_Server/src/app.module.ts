/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import configuration from './config/configuration';
import { validationSchema } from './config/validation';
import { PrismaModule } from './prisma/prisma.module'; // if you already have it
import { UserModule } from './modules/user/user.module';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './modules/auth/auth.module';
import { PostModule } from './modules/post/post.module';
import { LikeModule } from './modules/like/like.module';
import { CommentModule } from './modules/comment/comment.module';
import { BookmarkModule } from './modules/bookmark/bookmark.module';
import { FollowModule } from './modules/follow/follow.module';
import { ReportModule } from './modules/report/report.module';
import { SummaryModule } from './modules/summary/summary.module';
import { AiModule } from './modules/ai/ai.module';
import { SearchModule } from './modules/search/search.module';
import { UtilityModule } from './modules/utility/utility.module';
import { NotificationModule } from './modules/notifications/notifications.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true, // 🌍 makes config available everywhere
      load: [configuration], // loads your configuration.ts
      validationSchema, // validates your .env with Joi
      envFilePath: `.env.${process.env.NODE_ENV || 'development'}`, // dynamic env
    }),

    PrismaModule,
    UserModule,
    AuthModule,
    PostModule,
    LikeModule,
    CommentModule,
    BookmarkModule,
    FollowModule,
    ReportModule,
    SummaryModule,
    AiModule,
    SearchModule,
    UtilityModule,
    NotificationModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
