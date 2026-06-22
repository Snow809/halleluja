import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class ValidateDocumentDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  comment?: string;
}
