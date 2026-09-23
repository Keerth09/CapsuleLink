import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { ACCESS_COOKIE } from "../auth/cookies.js";
import { config } from "../config.js";

export interface AuthenticatedRequest extends Request {
  userId?: string;
}

interface AccessTokenPayload {
  sub: string;
  type: "access";
}

export function requireAuth(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): void {
  const token = req.cookies?.[ACCESS_COOKIE];

  if (!token) {
    res.status(401).json({
      error: "UNAUTHORIZED",
    });
    return;
  }

  try {
    const payload = jwt.verify(
      token,
      config.jwtSecret,
    ) as AccessTokenPayload;

    if (
      payload.type !== "access" ||
      typeof payload.sub !== "string"
    ) {
      res.status(401).json({
        error: "UNAUTHORIZED",
      });
      return;
    }

    req.userId = payload.sub;
    next();
  } catch {
    res.status(401).json({
      error: "UNAUTHORIZED",
    });
  }
}