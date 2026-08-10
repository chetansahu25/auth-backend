import { MailerService } from '@nestjs-modules/mailer';
import { Injectable } from '@nestjs/common';
import { SentMessageInfo } from 'nodemailer';

@Injectable()
export class EmailService {
  constructor(
    private readonly mailerService: MailerService,
  ){}

  async sendOtp(email: string, otp: number): Promise<SentMessageInfo> {
    await this.mailerService.sendMail({
      to: email,
      subject: 'One-time Password for Auth Backend',
      html: `
        <h1>Your OTP Code</h1>
        <p>Your one-time password is: <strong>${otp}</strong></p>
        <p>This code expires in 10 minutes.</p>
      `
    })
  }
}
