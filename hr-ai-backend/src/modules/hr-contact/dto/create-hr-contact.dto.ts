import { IsEmail, IsOptional, IsString, MinLength } from 'class-validator';

export class CreateHrContactDto {
  @IsString()
  @MinLength(2)
  name: string;

  @IsEmail()
  email: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsString()
  @MinLength(5)
  message: string;
}
