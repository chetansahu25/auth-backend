import { IsAlphanumeric, IsEmail, IsString } from 'class-validator'
export class RegisterUserDto {
  @IsEmail()
  email!: string;

  @IsAlphanumeric()
  username!: string;

  @IsString()
  name!: string;

  @IsString()
  password!: string;
  

} 