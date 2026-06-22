import { ApiProperty } from '@nestjs/swagger';

export class RagResponseDto {
  @ApiProperty()
  answer: string;

  @ApiProperty()
  refused: boolean;

  @ApiProperty({ isArray: true })
  sources: Array<{ documentId: string; title: string; sourcePage?: number }>;
}
