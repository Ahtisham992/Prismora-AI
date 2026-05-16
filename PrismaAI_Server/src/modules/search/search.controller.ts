import { Controller, Get, Query } from '@nestjs/common';
import { SearchService } from './search.service';

@Controller('search')
export class SearchController {
  constructor(private readonly searchService: SearchService) {}

  @Get()
  async globalSearch(@Query('q') keyword: string) {
    if (!keyword || keyword.trim().length === 0) {
      return {
        posts: [],
        people: [],
      };
    }

    return this.searchService.globalSearch(keyword);
  }
}