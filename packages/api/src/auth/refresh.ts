import { Session } from "../models/Session.js";
import {
  createAccessToken,
  createRefreshToken,
  hashRefreshToken,
} from "./tokens.js";

const REFRESH_TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export interface RefreshResult {
  accessToken: string;
  refreshToken: string;
}

export async function refreshSession(
  refreshToken: string,
): Promise<RefreshResult> {
  const refreshTokenHash = hashRefreshToken(refreshToken);

  const session = await Session.findOne({
    refreshTokenHash,
    revokedAt: null,
    expiresAt: { $gt: new Date() },
  });

  if (!session) {
    throw new Error("INVALID_REFRESH_TOKEN");
  }

  session.revokedAt = new Date();
  await session.save();

  const newRefreshToken = createRefreshToken();
  const newRefreshTokenHash = hashRefreshToken(newRefreshToken);

  await Session.create({
    userId: session.userId,
    refreshTokenHash: newRefreshTokenHash,
    expiresAt: new Date(Date.now() + REFRESH_TOKEN_TTL_MS),
    revokedAt: null,
  });

  const accessToken = createAccessToken(
    session.userId.toString(),
  );

  return {
    accessToken,
    refreshToken: newRefreshToken,
  };
}
