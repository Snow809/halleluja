import { IsOptional, IsString, MinLength } from 'class-validator';

export class UpdateTemplateDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  title?: string;

  @IsOptional()
  @IsString()
  @MinLength(2)
  documentType?: string;

  @IsOptional()
  @IsString()
  @MinLength(2)
  category?: string;

  @IsOptional()
  @IsString()
  description?: string;
}
