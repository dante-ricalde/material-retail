import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ProductsService } from './products.service';
import { CreateProductDto, ListProductsQuery, UpdateProductDto } from './products.dto';
import { resolveMerchantIdBySlug } from '../common/merchants';

@Controller()
export class ProductsController {
  constructor(private readonly products: ProductsService) {}

  @Get('merchants/:slug/products')
  list(
    @Param('slug') slug: string,
    @Query() q: ListProductsQuery,
  ) {
    const m = resolveMerchantIdBySlug(slug);
    const lowStockRaw = q.low_stock ?? q.lowStock;
    return this.products.list(slug, {
      search: q.search,
      category: q.category,
      lowStock: lowStockRaw === 'true' || lowStockRaw === '1',
      page: q.page ? Number(q.page) : 1,
      pageSize: q.pageSize ? Number(q.pageSize) : 25,
    });
  }

  @Get('merchants/:slug/categories')
  categories(@Param('slug') slug: string) {
    return this.products.categories(slug);
  }

  @Get('products/:id')
  detail(@Param('id') id: string) {
    return this.products.detail(id);
  }

  @Post('products')
  create(@Body() dto: CreateProductDto) {
    return this.products.create(dto);
  }

  @Patch('products/:id')
  update(@Param('id') id: string, @Body() dto: UpdateProductDto) {
    return this.products.update(id, dto);
  }

  @Delete('products/:id')
  remove(@Param('id') id: string) {
    return this.products.remove(id);
  }
}
