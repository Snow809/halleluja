import { IsBoolean, IsObject, IsOptional } from 'class-validator';

export class AcceptConsentDto {
  @IsBoolean()
  termsAccepted: boolean;

  @IsBoolean()
  privacyAccepted: boolean;

  @IsBoolean()
  rightsNoticeAccepted: boolean;

  @IsObject()
  @IsOptional()
  preferences?: Record<string, unknown>;
}
