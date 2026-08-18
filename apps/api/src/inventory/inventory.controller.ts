import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import { InventoryService } from './inventory.service';
import { AdjustInventoryDto, UpdateInventoryDto } from './inventory.dto';

@Controller('inventory')
export class InventoryController {
  constructor(private readonly inventory: InventoryService) {}

  @Get(':variantId')
  getOne(@Param('variantId') variantId: string) {
    return this.inventory.get(variantId);
  }

  @Patch(':variantId')
  update(@Param('variantId') variantId: string, @Body() dto: UpdateInventoryDto) {
    return this.inventory.update(variantId, dto);
  }

  @Post(':variantId/adjust')
  adjust(@Param('variantId') variantId: string, @Body() dto: AdjustInventoryDto) {
    return this.inventory.adjust(variantId, dto);
  }
}
