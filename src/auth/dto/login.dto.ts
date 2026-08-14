import { IsAlphanumeric, IsEmail, IsString } from 'class-validator'
export class LoginDto {
  @IsEmail()
  email?: string;

  @IsAlphanumeric()
  username?: string;

  @IsString()
  password!: string;

  @IsString()
  deviceId!: string

  @IsString()
  deviceName!: string
  

}