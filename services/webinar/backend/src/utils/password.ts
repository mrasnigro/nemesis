import bcrypt from 'bcryptjs';
import crypto from 'crypto';

const SALT_ROUNDS = 12;

/** Stored for accounts that may only sign in through the IMP handoff; never matches a bcrypt compare. */
export const UNUSABLE_PASSWORD_HASH = '!handoff-only';

const BCRYPT_HASH = /^\$2[aby]\$\d{2}\$[./A-Za-z0-9]{53}$/;
const TIMING_PARITY_HASH = bcrypt.hashSync('timing-parity', SALT_ROUNDS);

/** Anything that is not a bcrypt hash (legacy plaintext, handoff marker) is rejected, at bcrypt cost. */
export const verifyPassword = async (password: string, storedHash: string | null | undefined): Promise<boolean> => {
  if (!storedHash || !BCRYPT_HASH.test(storedHash)) {
    await bcrypt.compare(password, TIMING_PARITY_HASH);
    return false;
  }
  return bcrypt.compare(password, storedHash);
};

export const hashPassword = async (password: string): Promise<string> => {
  const salt = await bcrypt.genSalt(SALT_ROUNDS);
  return bcrypt.hash(password, salt);
};

export const comparePassword = async (password: string, hash: string): Promise<boolean> => {
  return bcrypt.compare(password, hash);
};

export function withoutPassword<T extends { passwordHash?: unknown }>(user: T | undefined) {
  if (!user) return user;
  const { passwordHash: _omit, ...rest } = user;
  return rest;
}

export const generateResetToken = (): string => {
  return crypto.randomBytes(32).toString('hex');
};

export const getResetTokenExpiry = (): Date => {
  const expiry = new Date();
  expiry.setHours(expiry.getHours() + 1);
  return expiry;
};
