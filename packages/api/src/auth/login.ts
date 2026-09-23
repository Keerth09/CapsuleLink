import { User } from "../models/User.js";
import { Session } from "../models/Session.js";
import {
  createAccessToken,
  createRefreshToken,
  hashRefreshToken,
} from "./tokens.js";
import { verifyPassword } from "./password.js";

const REFRESH_TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export interface LoginResult {
  accessToken: string;
  refreshToken: string;
}

export async function loginUser(
  email: string,
  password: string,
): Promise<LoginResult> {
  const normalizedEmail = email.trim().toLowerCase();

  const user = await User.findOne({
    email: normalizedEmail,
  });

  if (!user) {
    throw new Error("INVALID_CREDENTIALS");
  }

  if (!user.emailVerified) {
    throw new Error("EMAIL_NOT_VERIFIED");
  }

  if (user.status !== "ACTIVE") {
    throw new Error("ACCOUNT_NOT_ACTIVE");
  }

  const passwordValid = await verifyPassword(
    user.passwordHash,
    password,
  );

  if (!passwordValid) {
    throw new Error("INVALID_CREDENTIALS");
  }

  const accessToken = createAccessToken(user._id.toString());
  const refreshToken = createRefreshToken();
  const refreshTokenHash = hashRefreshToken(refreshToken);

  await Session.create({
    userId: user._id,
    refreshTokenHash,
    expiresAt: new Date(Date.now() + REFRESH_TOKEN_TTL_MS),
    revokedAt: null,
  });

  return {
    accessToken,
    refreshToken,
  };
}
