import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class AskQuestionDto {
  @ApiProperty()
  @IsString()
  question: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  conversationId?: string;
}
