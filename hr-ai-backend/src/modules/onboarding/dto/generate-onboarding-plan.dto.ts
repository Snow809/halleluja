import { ApiProperty } from '@nestjs/swagger';
import { IsDateString, IsOptional, IsString } from 'class-validator';

export class GenerateOnboardingPlanDto {
  @ApiProperty()
  @IsString()
  employeeId: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsDateString()
  startsAt?: string;
}
