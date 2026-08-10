import * as bcrypt from 'bcryptjs';

class AuthUtility {
  private static readonly SALT_ROUNDS = 12;

  static async generatePasswordHash(password: string): Promise<string> {
    const salt = await bcrypt.genSalt(AuthUtility.SALT_ROUNDS);
    return bcrypt.hash(password, salt);
  }

  static async verifyPassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }
}

export default AuthUtility;