import { Router } from "express";

import {
  AuthenticatedRequest,
  requireAuth,
} from "../middleware/auth.js";
import { User } from "../models/User.js";

const router = Router();

/*
 * GET /api/v1/beneficiary/lookup?email=...
 *
 * Returns only information required by the browser
 * to wrap a capsule DEK for an enrolled beneficiary.
 *
 * No private key or encrypted private-key envelope is returned.
 */
router.get(
  "/lookup",
  requireAuth,
  async (
    req: AuthenticatedRequest,
    res,
  ) => {
    try {
      const email =
        typeof req.query.email === "string"
          ? req.query.email.trim().toLowerCase()
          : "";

      if (!email) {
        res.status(400).json({
          error: "BENEFICIARY_EMAIL_REQUIRED",
        });
        return;
      }

      const beneficiary = await User.findOne({
        email,
        emailVerified: true,
        status: "ACTIVE",
      })
        .select("email publicKey keyVersion")
        .lean();

      if (!beneficiary) {
        res.status(404).json({
          error: "BENEFICIARY_NOT_FOUND",
        });
        return;
      }

      if (!beneficiary.publicKey) {
        res.status(409).json({
          error:
            "BENEFICIARY_CRYPTOGRAPHIC_IDENTITY_REQUIRED",
        });
        return;
      }

      if (String(beneficiary._id) === String(req.userId)) {
        res.status(400).json({
          error: "OWNER_CANNOT_BE_BENEFICIARY",
        });
        return;
      }

      res.status(200).json({
        beneficiary: {
          userId: String(beneficiary._id),
          email: beneficiary.email,
          publicKey: beneficiary.publicKey,
          keyVersion: beneficiary.keyVersion ?? 1,
        },
      });
    } catch (error) {
      console.error(
        "Beneficiary lookup failed:",
        error,
      );

      res.status(500).json({
        error: "BENEFICIARY_LOOKUP_FAILED",
      });
    }
  },
);

export default router;
