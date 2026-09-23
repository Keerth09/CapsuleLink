import crypto from "node:crypto";
import jwt from "jsonwebtoken";
import { config } from "../config.js";

const ACCESS_TOKEN_EXPIRES_IN = "15m";

export interface AccessTokenPayload {
  sub: string;
  type: "access";
}

export function createAccessToken(userId: string): string {
  const payload: AccessTokenPayload = {
    sub: userId,
    type: "access",
  };

  return jwt.sign(payload, config.jwtSecret, {
    expiresIn: ACCESS_TOKEN_EXPIRES_IN,
  });
}

export function createRefreshToken(): string {
  return crypto.randomBytes(32).toString("base64url");
}

export function hashRefreshToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}
