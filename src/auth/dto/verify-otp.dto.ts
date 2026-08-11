import { IsString, Length } from "class-validator"

export class VerifyOtpDto{
  @IsString()
  id!: string

  @IsString()
  @Length(6,6)
  otp!: string

  @IsString()
  deviceId!: string

  @IsString()
  deviceName!: string

}