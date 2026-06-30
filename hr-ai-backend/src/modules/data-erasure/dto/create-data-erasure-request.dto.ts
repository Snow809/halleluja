import { IsOptional, IsString, MinLength } from 'class-validator';

export class CreateDataErasureRequestDto {
  @IsString()
  employeeId: string;

  @IsString()
  @MinLength(3)
  reason: string;

  @IsString()
  @IsOptional()
  notes?: string;
}
