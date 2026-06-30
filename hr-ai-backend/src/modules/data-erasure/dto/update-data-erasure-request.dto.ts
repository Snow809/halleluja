import { IsEnum, IsOptional, IsString } from 'class-validator';

export enum DataErasureStatusDto {
  PENDING = 'PENDING',
  APPROVED_FOR_FUTURE_PURGE = 'APPROVED_FOR_FUTURE_PURGE',
  CANCELLED = 'CANCELLED',
}

export class UpdateDataErasureRequestDto {
  @IsEnum(DataErasureStatusDto)
  status: DataErasureStatusDto;

  @IsString()
  @IsOptional()
  notes?: string;
}
