// Reserved for future inbound webhooks (e.g. supplier integration).
import { IsInt, IsString } from 'class-validator';

export class CreateAlertDto {
  @IsString()
  variantId!: string;

  @IsInt()
  stockQty!: number;
}
