import { Router } from "express";

import {
  AuthenticatedRequest,
  requireAuth,
} from "../middleware/auth.js";
import { User } from "../models/User.js";

const router = Router();

const PBKDF2_ITERATIONS = 600_000;

function isValidEnvelope(value: unknown): boolean {
  if (!value || typeof value !== "object") {
    return false;
  }

  const envelope =
    value as Record<string, unknown>;

  return (
    typeof envelope.ciphertext === "string" &&
    envelope.ciphertext.length > 0 &&
    envelope.ciphertext.length <= 100_000 &&
    typeof envelope.iv === "string" &&
    envelope.iv.length > 0 &&
    typeof envelope.salt === "string" &&
    envelope.salt.length > 0 &&
    envelope.algorithm === "AES-256-GCM" &&
    envelope.kdf === "PBKDF2-HMAC-SHA-256" &&
    envelope.iterations === PBKDF2_ITERATIONS
  );
}

/**
 * GET /api/v1/identity
 *
 * Returns the authenticated user's cryptographic identity.
 *
 * The private key is never returned plaintext.
 * Only encrypted envelopes are returned.
 */
router.get(
  "/",
  requireAuth,
  async (
    req: AuthenticatedRequest,
    res,
  ) => {
    try {
      const user = await User.findById(
        req.userId,
      ).lean();

      if (!user) {
        res.status(404).json({
          error: "USER_NOT_FOUND",
        });
        return;
      }

      const configured =
        Boolean(
          user.publicKey &&
          user.encryptedPrivateKeyEnvelopes,
        );

      res.status(200).json({
        configured,
        publicKey: user.publicKey ?? null,
        keyVersion:
          user.keyVersion ?? null,
        encryptedPrivateKeyEnvelopes:
          user.encryptedPrivateKeyEnvelopes ??
          null,
      });
    } catch (error) {
      console.error(
        "Get cryptographic identity failed:",
        error,
      );

      res.status(500).json({
        error: "IDENTITY_LOOKUP_FAILED",
      });
    }
  },
);

/**
 * POST /api/v1/identity/enroll
 *
 * Registers browser-generated cryptographic identity.
 *
 * The server receives:
 * - public key
 * - encrypted private-key envelope protected by vault passphrase
 * - encrypted private-key envelope protected by Recovery Key
 *
 * The server never receives either secret.
 */
router.post(
  "/enroll",
  requireAuth,
  async (
    req: AuthenticatedRequest,
    res,
  ) => {
    try {
      const user = await User.findById(
        req.userId,
      );

      if (!user) {
        res.status(404).json({
          error: "USER_NOT_FOUND",
        });
        return;
      }

      if (!user.emailVerified) {
        res.status(403).json({
          error: "EMAIL_NOT_VERIFIED",
        });
        return;
      }

      if (user.status !== "ACTIVE") {
        res.status(403).json({
          error: "ACCOUNT_NOT_ACTIVE",
        });
        return;
      }

      if (
        user.publicKey ||
        user.encryptedPrivateKeyEnvelopes
      ) {
        res.status(409).json({
          error: "CRYPTOGRAPHIC_IDENTITY_ALREADY_ENROLLED",
        });
        return;
      }

      const {
        publicKey,
        keyVersion,
        encryptedPrivateKeyEnvelopes,
      } = req.body ?? {};

      if (
        typeof publicKey !== "string" ||
        publicKey.length < 100 ||
        publicKey.length > 20_000
      ) {
        res.status(400).json({
          error: "INVALID_PUBLIC_KEY",
        });
        return;
      }

      if (keyVersion !== 1) {
        res.status(400).json({
          error: "UNSUPPORTED_KEY_VERSION",
        });
        return;
      }

      if (
        !encryptedPrivateKeyEnvelopes ||
        typeof encryptedPrivateKeyEnvelopes !==
          "object"
      ) {
        res.status(400).json({
          error: "INVALID_PRIVATE_KEY_ENVELOPES",
        });
        return;
      }

      const {
        passphrase,
        recovery,
      } = encryptedPrivateKeyEnvelopes;

      if (
        !isValidEnvelope(passphrase) ||
        !isValidEnvelope(recovery)
      ) {
        res.status(400).json({
          error: "INVALID_PRIVATE_KEY_ENVELOPES",
        });
        return;
      }

      user.publicKey = publicKey;
      user.keyVersion = keyVersion;
      user.encryptedPrivateKeyEnvelopes = {
        passphrase,
        recovery,
      };

      await user.save();

      res.status(201).json({
        configured: true,
        keyVersion: user.keyVersion,
        message:
          "Cryptographic identity enrolled successfully.",
      });
    } catch (error) {
      console.error(
        "Cryptographic identity enrollment failed:",
        error,
      );

      res.status(500).json({
        error: "IDENTITY_ENROLLMENT_FAILED",
      });
    }
  },
);

export default router;
