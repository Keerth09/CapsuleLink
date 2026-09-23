import crypto from "node:crypto";
import { User } from "../models/User.js";
import { EmailVerification } from "../models/EmailVerification.js";

export async function verifyEmail(
  verificationToken: string,
): Promise<void> {
  const tokenHash = crypto
    .createHash("sha256")
    .update(verificationToken)
    .digest("hex");

  const verification = await EmailVerification.findOne({
    tokenHash,
    consumedAt: null,
    expiresAt: { $gt: new Date() },
  });

  if (!verification) {
    throw new Error("INVALID_OR_EXPIRED_VERIFICATION_TOKEN");
  }

  await User.findByIdAndUpdate(verification.userId, {
    emailVerified: true,
  });

  await EmailVerification.findByIdAndUpdate(verification._id, {
    consumedAt: new Date(),
  });
}
