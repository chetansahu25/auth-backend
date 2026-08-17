import { IsAlphanumeric, IsEmail, IsOptional, IsString } from 'class-validator'
export class LoginDto {
  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsAlphanumeric()
  username?: string;

  @IsString()
  password!: string;

  @IsString()
  deviceId!: string

  @IsString()
  deviceName!: string
  

}