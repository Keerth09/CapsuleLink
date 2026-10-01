import { Router } from "express";
import { requireAuth, AuthenticatedRequest } from "../middleware/auth.js";
import { Capsule } from "../models/Capsule.js";

const router = Router();

/**
 * GET /api/v1/capsules
 * Return capsules owned by the authenticated user.
 */
router.get(
  "/",
  requireAuth,
  async (req: AuthenticatedRequest, res) => {
    try {
      const capsules = await Capsule.find({
        ownerId: req.userId,
      })
        .sort({ createdAt: -1 })
        .lean();

      res.status(200).json({
        capsules,
      });
    } catch (error) {
      console.error("List capsules failed:", error);

      res.status(500).json({
        error: "CAPSULE_LIST_FAILED",
      });
    }
  },
);

export default router;
