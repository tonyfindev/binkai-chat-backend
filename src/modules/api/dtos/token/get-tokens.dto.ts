import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, IsArray } from 'class-validator';
import { Transform } from 'class-transformer';
import { IsSolanaAddress } from '@/shared/validator/decorators/isSolanaAddress';

export class GetTokensDto {
  @ApiProperty({ 
    description: 'List of token mint addresses',
    isArray: true,
    example: ['address1', 'address2']
  })
  @IsNotEmpty()
  @Transform(({ value }) => {
    // Convert input to array
    let addresses = [];
    if (Array.isArray(value)) {
      addresses = value;
    } else if (typeof value === 'string') {
      addresses = [value];
    }
    
    // Remove duplicates using Set
    return [...new Set(addresses)];
  })
  @IsArray()
  @IsString({ each: true })
  @IsSolanaAddress()
  addresses: string[];
} 