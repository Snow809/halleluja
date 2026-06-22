import { ApiProperty } from '@nestjs/swagger';
import { IsEnum } from 'class-validator';
import { DocumentStatus } from '../../../common/enums/document-status.enum';

export class UpdateDocumentStatusDto {
  @ApiProperty({ enum: DocumentStatus })
  @IsEnum(DocumentStatus)
  status: DocumentStatus;
}
