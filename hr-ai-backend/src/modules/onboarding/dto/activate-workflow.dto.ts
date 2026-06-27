import { ApiProperty } from '@nestjs/swagger';
import { IsDateString, IsIn, IsOptional, IsString } from 'class-validator';

export class ActivateWorkflowDto {
  @ApiProperty()
  @IsString()
  employeeId: string;

  @ApiProperty({ enum: ['ONBOARDING', 'OFFBOARDING'] })
  @IsIn(['ONBOARDING', 'OFFBOARDING'])
  workflowType: 'ONBOARDING' | 'OFFBOARDING';

  @ApiProperty({ required: false })
  @IsOptional()
  @IsDateString()
  startsAt?: string;
}
