import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';
import { PaginateDto } from '@/shared/pagination/paginate.dto';

export class SearchTokenDto extends PaginateDto {
  @ApiPropertyOptional({ description: 'Search keyword (name, symbol, mint address)' })
  @IsOptional()
  @IsString()
  keyword?: string;
} 