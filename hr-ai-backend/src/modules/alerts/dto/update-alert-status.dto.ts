import { ApiProperty } from '@nestjs/swagger';
import { IsEnum } from 'class-validator';
import { AlertStatus } from '../../../common/enums/alert-status.enum';

export class UpdateAlertStatusDto {
  @ApiProperty({ enum: AlertStatus })
  @IsEnum(AlertStatus)
  status: AlertStatus;
}
