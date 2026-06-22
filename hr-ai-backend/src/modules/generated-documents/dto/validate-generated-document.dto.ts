import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class ValidateGeneratedDocumentDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  comment?: string;
}
