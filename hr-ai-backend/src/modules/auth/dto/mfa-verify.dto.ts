import { IsBoolean, IsOptional, IsString, Length } from 'class-validator';

export class MfaVerifyDto {
  @IsString()
  mfaToken: string;

  @IsString()
  @Length(6, 6)
  code: string;

  @IsBoolean()
  @IsOptional()
  remember?: boolean;
}
