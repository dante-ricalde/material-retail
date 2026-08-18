import { IsInt, IsOptional, IsString, Min } from 'class-validator';

export class CreateProductDto {
  @IsString()
  merchantSlug!: string;

  @IsString()
  name!: string;

  @IsOptional()
  @IsString()
  sku?: string;

  @IsOptional()
  @IsString()
  category?: string;

  @IsOptional()
  @IsString()
  description?: string;

  /**
   * Optional initial variant, created in one round-trip.
   * If `stock` is provided, threshold must be set too (or it falls back to merchant default).
   */
  @IsOptional()
  initialVariant?: {
    name: string;
    attributes?: Record<string, string>;
    stock?: number;
    threshold?: number;
  };
}

export class UpdateProductDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  sku?: string;

  @IsOptional()
  @IsString()
  category?: string;

  @IsOptional()
  @IsString()
  description?: string;
}

export class ListProductsQuery {
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsString()
  category?: string;

  /**
   * Truthy values: "1", "true". When present, only include items whose total stock ≤ max threshold.
   * Accepted as either `low_stock` (the snake_case form the web client sends) or `lowStock`.
   */
  @IsOptional()
  low_stock?: string;

  @IsOptional()
  lowStock?: string;

  @IsOptional()
  page?: string;

  @IsOptional()
  pageSize?: string;
}
