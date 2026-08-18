import { IsObject, IsOptional, IsString } from 'class-validator';

export class CreateVariantDto {
  @IsString()
  productId!: string;

  @IsString()
  name!: string;

  @IsOptional()
  @IsObject()
  attributes?: Record<string, string>;

  @IsOptional()
  stock?: number;

  @IsOptional()
  threshold?: number;
}

export class UpdateVariantDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsObject()
  attributes?: Record<string, string>;
}
