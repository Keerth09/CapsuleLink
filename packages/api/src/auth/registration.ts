import crypto from "node:crypto";
import { User } from "../models/User.js";
import { EmailVerification } from "../models/EmailVerification.js";
import { hashPassword } from "./password.js";

const EMAIL_VERIFICATION_TTL_MS = 24 * 60 * 60 * 1000;

export interface RegistrationResult {
  userId: string;
  verificationToken: string;
}

export async function registerUser(
  email: string,
  password: string,
): Promise<RegistrationResult> {
  const normalizedEmail = email.trim().toLowerCase();

  const existingUser = await User.findOne({
    email: normalizedEmail,
  });

  if (existingUser) {
    throw new Error("EMAIL_ALREADY_REGISTERED");
  }

  const passwordHash = await hashPassword(password);

  const user = await User.create({
    email: normalizedEmail,
    passwordHash,
    emailVerified: false,
    timezone: "UTC",
    status: "ACTIVE",
  });

  const verificationToken = crypto.randomBytes(32).toString("base64url");

  const tokenHash = crypto
    .createHash("sha256")
    .update(verificationToken)
    .digest("hex");

  await EmailVerification.create({
    userId: user._id,
    tokenHash,
    expiresAt: new Date(Date.now() + EMAIL_VERIFICATION_TTL_MS),
  });

  return {
    userId: user._id.toString(),
    verificationToken,
  };
}
