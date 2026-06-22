import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString } from 'class-validator';
import { DocumentVisibility } from '@prisma/client';

export class CreateDocumentDto {
  @ApiProperty()
  @IsString()
  title: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  category?: string;

  @ApiProperty({ required: false, default: '1.0' })
  @IsOptional()
  @IsString()
  version?: string;

  @ApiProperty({ required: false, enum: DocumentVisibility })
  @IsOptional()
  @IsEnum(DocumentVisibility)
  visibility?: DocumentVisibility;

  @ApiProperty({ required: false, description: 'Comma-separated roles for ROLE_RESTRICTED documents' })
  @IsOptional()
  @IsString()
  allowedRoles?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  employeeId?: string;
}
