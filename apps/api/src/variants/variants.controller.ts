import { Body, Controller, Delete, Param, Patch, Post } from '@nestjs/common';
import { VariantsService } from './variants.service';
import { CreateVariantDto, UpdateVariantDto } from './variants.dto';

@Controller()
export class VariantsController {
  constructor(private readonly variants: VariantsService) {}

  @Post('products/:productId/variants')
  create(@Param('productId') productId: string, @Body() body: Omit<CreateVariantDto, 'productId'>) {
    return this.variants.create({ ...body, productId });
  }

  @Patch('variants/:id')
  update(@Param('id') id: string, @Body() dto: UpdateVariantDto) {
    return this.variants.update(id, dto);
  }

  @Delete('variants/:id')
  remove(@Param('id') id: string) {
    return this.variants.remove(id);
  }
}
