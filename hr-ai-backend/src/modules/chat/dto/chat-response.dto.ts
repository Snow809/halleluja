import { ApiProperty } from '@nestjs/swagger';

export class ChatResponseDto {
  @ApiProperty()
  conversationId: string;

  @ApiProperty()
  answer: string;

  @ApiProperty()
  refused: boolean;
}
