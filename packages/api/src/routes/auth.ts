import { Router } from "express";
import {
  loginSchema,
  registerSchema,
} from "@capsulelink/validation";
import { loginUser } from "../auth/login.js";
import {
  clearAuthCookies,
  REFRESH_COOKIE,
  setAuthCookies,
} from "../auth/cookies.js";
import { registerUser } from "../auth/registration.js";
import { verifyEmail } from "../auth/verification.js";
import { refreshSession } from "../auth/refresh.js";
import { sendVerificationEmail } from "../email/verificationEmail.js";
import { Session } from "../models/Session.js";
import { hashRefreshToken } from "../auth/tokens.js";
import {
  AuthenticatedRequest,
  requireAuth,
} from "../middleware/auth.js";

const router = Router();

router.post("/register", async (req, res) => {
  const result = registerSchema.safeParse(req.body);

  if (!result.success) {
    res.status(400).json({
      error: "INVALID_REQUEST",
    });
    return;
  }

  try {
    const registration = await registerUser(
      result.data.email,
      result.data.password,
    );

    await sendVerificationEmail(
      result.data.email,
      registration.verificationToken,
    );

    res.status(201).json({
      userId: registration.userId,
      message: "Registration successful. Verify your email.",
    });
  } catch (error) {
    if (
      error instanceof Error &&
      error.message === "EMAIL_ALREADY_REGISTERED"
    ) {
      res.status(409).json({
        error: "EMAIL_ALREADY_REGISTERED",
      });
      return;
    }

    console.error("Registration failed:", error);

    res.status(500).json({
      error: "REGISTRATION_FAILED",
    });
  }
});

router.post("/verify-email", async (req, res) => {
  const token =
    typeof req.body?.token === "string" ? req.body.token : "";

  if (!token) {
    res.status(400).json({
      error: "INVALID_REQUEST",
    });
    return;
  }

  try {
    await verifyEmail(token);

    res.status(200).json({
      message: "Email verified successfully.",
    });
  } catch (error) {
    if (
      error instanceof Error &&
      error.message === "INVALID_OR_EXPIRED_VERIFICATION_TOKEN"
    ) {
      res.status(400).json({
        error: "INVALID_OR_EXPIRED_VERIFICATION_TOKEN",
      });
      return;
    }

    console.error("Email verification failed:", error);

    res.status(500).json({
      error: "EMAIL_VERIFICATION_FAILED",
    });
  }
});

router.post("/login", async (req, res) => {
  const result = loginSchema.safeParse(req.body);

  if (!result.success) {
    res.status(400).json({
      error: "INVALID_REQUEST",
    });
    return;
  }

  try {
    const login = await loginUser(
      result.data.email,
      result.data.password,
    );

    setAuthCookies(
      res,
      login.accessToken,
      login.refreshToken,
    );

    res.status(200).json({
      message: "Login successful.",
    });
  } catch (error) {
    if (
      error instanceof Error &&
      error.message === "EMAIL_NOT_VERIFIED"
    ) {
      res.status(403).json({
        error: "EMAIL_NOT_VERIFIED",
      });
      return;
    }

    if (
      error instanceof Error &&
      error.message === "ACCOUNT_NOT_ACTIVE"
    ) {
      res.status(403).json({
        error: "ACCOUNT_NOT_ACTIVE",
      });
      return;
    }

    if (
      error instanceof Error &&
      error.message === "INVALID_CREDENTIALS"
    ) {
      res.status(401).json({
        error: "INVALID_CREDENTIALS",
      });
      return;
    }

    console.error("Login failed:", error);

    res.status(500).json({
      error: "LOGIN_FAILED",
    });
  }
});

router.post("/refresh", async (req, res) => {
  const refreshToken = req.cookies?.[REFRESH_COOKIE];

  if (!refreshToken) {
    res.status(401).json({
      error: "INVALID_REFRESH_TOKEN",
    });
    return;
  }

  try {
    const refreshed = await refreshSession(refreshToken);

    setAuthCookies(
      res,
      refreshed.accessToken,
      refreshed.refreshToken,
    );

    res.status(200).json({
      message: "Session refreshed.",
    });
  } catch (error) {
    if (
      error instanceof Error &&
      error.message === "INVALID_REFRESH_TOKEN"
    ) {
      clearAuthCookies(res);

      res.status(401).json({
        error: "INVALID_REFRESH_TOKEN",
      });
      return;
    }

    console.error("Session refresh failed:", error);

    res.status(500).json({
      error: "SESSION_REFRESH_FAILED",
    });
  }
});

router.post("/logout", async (req, res) => {
  const refreshToken = req.cookies?.[REFRESH_COOKIE];

  if (refreshToken) {
    const refreshTokenHash = hashRefreshToken(refreshToken);

    await Session.findOneAndUpdate(
      {
        refreshTokenHash,
        revokedAt: null,
      },
      {
        revokedAt: new Date(),
      },
    );
  }

  clearAuthCookies(res);

  res.status(200).json({
    message: "Logout successful.",
  });
});

router.get(
  "/me",
  requireAuth,
  async (req: AuthenticatedRequest, res) => {
    res.status(200).json({
      userId: req.userId,
    });
  },
);

export default router;