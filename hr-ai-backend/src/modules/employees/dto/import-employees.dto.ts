import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class ImportEmployeesDto {
  @ApiProperty({ required: false, example: 'csv' })
  @IsOptional()
  @IsString()
  format?: string;
}
