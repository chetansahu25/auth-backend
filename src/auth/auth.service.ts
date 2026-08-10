import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UserService } from '../user/user.service';
import AuthUtility from '../utils/auth.utility';
import { EmailService } from '../email/email.service';
import { RegisterAuthDto } from './dto/register-auth.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly userService: UserService,
    private readonly emailService: EmailService
  ) {}

  async registerUser(registerAuthDto: RegisterAuthDto) {

    //save and get Id of user
    const { id, email } = await this.userService.createUser(registerAuthDto);

    //generating hashed password
    const hashedPassword = await AuthUtility.generateHash(
      registerAuthDto.password,
    );

    //saving password to db
    const savePasswordCredentials = this.prisma.passwordCredentials.create({
      data: {
        userId: id,
        hashedPassword: hashedPassword,
      },
    });

    //generating otp
    const otp: number = await AuthUtility.generateOtp();
    

    //sending verification email
    const sendEmail = this.emailService.sendOtp(email, otp) 
    

    //create otp hash
    const otpHash = await AuthUtility.generateHash(String(otp))

    

  const saveOtp = await this.prisma.otpChallenges.create({
    data: {
      userId: id,
      destination: email,
      purpose: 'EMAIL_VERIFICATION',
      codeHash: otpHash,
      expiresAt: new Date(new Date().getTime() + 15*60*1000)
    }
  })


    //return otp id to the user
    return saveOtp.id;


  }
}
