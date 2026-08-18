import { IsInt, IsOptional, Min } from 'class-validator';

export class UpdateInventoryDto {
  @IsOptional()
  @IsInt()
  @Min(0)
  stockQty?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  threshold?: number;
}

export class AdjustInventoryDto {
  /** Signed integer; positive = received stock, negative = sold / used / damaged. */
  @IsInt()
  delta!: number;

  @IsOptional()
  reason?: string;
}
