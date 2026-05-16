// src/modules/post/post.controller.ts
import {
  Controller,
  Get,
  Post,
  Delete,
  Patch,
  Body,
  Query,
  Param,
  Req,
  UseGuards,
  ParseIntPipe,
  BadRequestException,
} from '@nestjs/common';
import { PostService } from './post.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CreatePostDto } from './dto/create-post.dto';

@Controller('posts')
export class PostController {
  constructor(private readonly postService: PostService) {}

 // -----------------------------------------------------------
  // 📌 Infinite Feed
  // GET /posts/feed?cursor=&limit=
  // -----------------------------------------------------------
  @Get('feed')
  async getFeed(
    @Query('cursor') cursor?: string,
    @Query('limit') limit?: string,
  ) {
    return this.postService.getFeed(
      cursor ? Number(cursor) : undefined,
      Number(limit) || 10,
    );
  }

  // -----------------------------------------------------------
  // 🟦 Get posts created by logged-in user
  // GET /posts/my-posts
  // -----------------------------------------------------------
  @UseGuards(JwtAuthGuard)
  @Get('my-posts')
  getMyPosts(@Req() req: any) {
    return this.postService.getPostsByUser(req.user.userId);
  }

  // ------------------ Posts by Categories ------------------
  @Get('categories')
  getPostsByCategories(
    @Query('categories') categories: string,
    @Query('limit') limit?: string,
  ) {
    if (!categories) {
      throw new BadRequestException('categories query param is required');
    }

    const categoryArray = categories.split(',').map((c) => c.trim());
    const parsedLimit = limit ? parseInt(limit, 10) : 10;

    if (isNaN(parsedLimit) || parsedLimit <= 0) {
      throw new BadRequestException('limit must be a positive number');
    }

    return this.postService.getPostsByCategories(categoryArray, parsedLimit);
  }
  // ------------------ Trending Posts ------------------
  @Get('trending')
  getTrending(@Query('limit') limit?: string) {
    const parsedLimit = limit ? parseInt(limit, 10) : 10;

    if (isNaN(parsedLimit) || parsedLimit <= 0) {
      throw new BadRequestException('limit must be a positive number');
    }

    return this.postService.getTrendingPosts(parsedLimit);
  }

  // -----------------------------------------------------------
  // 🟦 Get posts by any user
  // GET /posts/user/:id
  // -----------------------------------------------------------
  @UseGuards(JwtAuthGuard)
  @Get('user/:id')
  getPostsByUser(@Param('id', ParseIntPipe) id: number) {
    return this.postService.getPostsByUser(id);
  }

  // -----------------------------------------------------------
  // 📌 Upload a new post (Authenticated)
  // POST /posts
  // -----------------------------------------------------------
  @UseGuards(JwtAuthGuard)
  @Post()
  createPost(@Req() req: any, @Body() dto: CreatePostDto) {
    return this.postService.createPost(req.user.userId, dto);
  }

  // -----------------------------------------------------------
  // 📌 Delete a post (only creator)
  // DELETE /posts/:id
  // -----------------------------------------------------------
  @UseGuards(JwtAuthGuard)
  @Delete(':id')
  deletePost(@Req() req: any, @Param('id', ParseIntPipe) id: number) {
    return this.postService.deletePost(req.user.userId, id);
  }

  // -----------------------------------------------------------
  // 📌 Increment Views
  // PATCH /posts/:id/views
  // -----------------------------------------------------------
  @Patch(':id/views')
  addView(@Param('id', ParseIntPipe) id: number) {
    return this.postService.incrementViews(id);
  }

  // -----------------------------------------------------------
  // 📌 Increment Shares
  // PATCH /posts/:id/share
  // -----------------------------------------------------------
  @Patch(':id/share')
  addShare(@Param('id', ParseIntPipe) id: number) {
    return this.postService.incrementShares(id);
  }

  // -----------------------------------------------------------
  // 📌 Get single post detail
  // GET /posts/:id
  // -----------------------------------------------------------
  @Get(':id')
  getPost(@Param('id', ParseIntPipe) id: number) {
    return this.postService.getPostById(id);
  }
}
