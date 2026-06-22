import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class RequestGeneratedDocumentDto {
  @ApiProperty({ example: 'attestation' })
  @IsString()
  type: string;

  @ApiProperty()
  @IsString()
  prompt: string;
}
