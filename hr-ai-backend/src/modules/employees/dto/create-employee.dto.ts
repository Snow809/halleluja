import { ApiProperty } from '@nestjs/swagger';
import { IsDateString, IsEmail, IsOptional, IsString } from 'class-validator';

export class CreateEmployeeDto {
  @ApiProperty()
  @IsString()
  matricule: string;

  @ApiProperty()
  @IsEmail()
  email: string;

  @ApiProperty()
  @IsString()
  fullName: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  position?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  department?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  site?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  managerId?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsDateString()
  hiredAt?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  salary?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  userId?: string;
}
