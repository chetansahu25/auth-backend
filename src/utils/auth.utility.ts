import * as bcrypt from 'bcryptjs';

class AuthUtility {
  
  private static readonly SALT_ROUNDS = 12;

  static async generateOtp(): Promise<number>{
    return Math.floor(100000 + Math.random() * 900000);
    }

  static async generateHash(word: string): Promise<string> {
    const salt = await bcrypt.genSalt(AuthUtility.SALT_ROUNDS);
    return bcrypt.hash(word, salt);
  }

  static async verifyHash(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }
}

export default AuthUtility;