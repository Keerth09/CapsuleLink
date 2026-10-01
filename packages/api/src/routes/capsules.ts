import { Router } from "express";
import { Types } from "mongoose";

import {
  requireAuth,
  AuthenticatedRequest,
} from "../middleware/auth.js";

import { Capsule } from "../models/Capsule.js";
import { CapsuleKeyEnvelope } from "../models/CapsuleKeyEnvelope.js";
import { Beneficiary } from "../models/Beneficiary.js";
import { User } from "../models/User.js";

const router = Router();

const EDITABLE_STATUS = new Set([
  "DRAFT",
  "ACTIVE",
  "WARNING",
  "GRACE",
]);

function validObjectId(
  value: unknown,
): value is string {
  return (
    typeof value === "string" &&
    Types.ObjectId.isValid(value)
  );
}

function positiveNumber(
  value: unknown,
): value is number {
  return (
    typeof value === "number" &&
    Number.isFinite(value) &&
    value > 0
  );
}

function nonNegativeNumber(
  value: unknown,
): value is number {
  return (
    typeof value === "number" &&
    Number.isFinite(value) &&
    value >= 0
  );
}

function getId(
  req: AuthenticatedRequest,
): string | null {
  const id = req.params.id;

  if (Array.isArray(id)) {
    return null;
  }

  return id;
}


/*
 * ============================================================
 * GET /api/v1/capsules
 * ============================================================
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
      console.error(
        "List capsules failed:",
        error,
      );

      res.status(500).json({
        error: "INTERNAL_SERVER_ERROR",
      });
    }
  },
);


/*
 * ============================================================
 * POST /api/v1/capsules
 *
 * Creates an encrypted DRAFT capsule.
 *
 * The browser supplies:
 * - ciphertext
 * - iv
 * - cryptoVersion
 * - contentAlgorithm
 * - owner wrapped DEK
 *
 * Beneficiaries are added separately.
 * ============================================================
 */

router.post(
  "/",
  requireAuth,
  async (req: AuthenticatedRequest, res) => {
    try {
      const body = req.body ?? {};

      /*
       * Never accept plaintext or legacy crypto fields.
       */
      if (
        "plaintext" in body ||
        "message" in body ||
        "content" in body ||
        "encryptedContent" in body ||
        "cryptoMetadata" in body
      ) {
        res.status(400).json({
          error:
            "PLAINTEXT_OR_LEGACY_CRYPTO_NOT_ALLOWED",
        });
        return;
      }

      const {
        title,
        ciphertext,
        iv,
        cryptoVersion,
        contentAlgorithm,
        ownerKeyEnvelope,
        checkInInterval,
        warningLeadTime,
        gracePeriod,
      } = body;

      if (
        typeof title !== "string" ||
        title.trim().length === 0 ||
        title.trim().length > 200
      ) {
        res.status(400).json({
          error: "INVALID_TITLE",
        });
        return;
      }

      if (
        typeof ciphertext !== "string" ||
        ciphertext.length === 0
      ) {
        res.status(400).json({
          error: "INVALID_CIPHERTEXT",
        });
        return;
      }

      if (
        typeof iv !== "string" ||
        iv.length === 0
      ) {
        res.status(400).json({
          error: "INVALID_IV",
        });
        return;
      }

      if (cryptoVersion !== 1) {
        res.status(400).json({
          error: "UNSUPPORTED_CRYPTO_VERSION",
        });
        return;
      }

      if (
        contentAlgorithm !==
        "AES-256-GCM"
      ) {
        res.status(400).json({
          error:
            "UNSUPPORTED_CONTENT_ALGORITHM",
        });
        return;
      }

      if (
        !ownerKeyEnvelope ||
        typeof ownerKeyEnvelope.wrappedDek !==
          "string" ||
        ownerKeyEnvelope.wrappedDek.length === 0
      ) {
        res.status(400).json({
          error: "INVALID_OWNER_KEY_ENVELOPE",
        });
        return;
      }

      if (
        ownerKeyEnvelope.keyWrapAlgorithm !==
        "RSA-OAEP-SHA256"
      ) {
        res.status(400).json({
          error:
            "UNSUPPORTED_KEY_WRAP_ALGORITHM",
        });
        return;
      }

      if (
        ownerKeyEnvelope.keyVersion !== 1
      ) {
        res.status(400).json({
          error: "UNSUPPORTED_KEY_VERSION",
        });
        return;
      }

      if (!positiveNumber(checkInInterval)) {
        res.status(400).json({
          error: "INVALID_CHECK_IN_INTERVAL",
        });
        return;
      }

      if (
        !nonNegativeNumber(
          warningLeadTime,
        )
      ) {
        res.status(400).json({
          error: "INVALID_WARNING_LEAD_TIME",
        });
        return;
      }

      if (
        !nonNegativeNumber(gracePeriod)
      ) {
        res.status(400).json({
          error: "INVALID_GRACE_PERIOD",
        });
        return;
      }

      if (
        warningLeadTime >= checkInInterval
      ) {
        res.status(400).json({
          error:
            "WARNING_LEAD_TIME_MUST_BE_LESS_THAN_INTERVAL",
        });
        return;
      }

      /*
       * Verify owner's cryptographic identity
       * exists before accepting an owner envelope.
       */
      const owner = await User.findById(
        req.userId,
      )
        .select(
          "email emailVerified status publicKey keyVersion",
        )
        .lean();

      if (!owner) {
        res.status(401).json({
          error: "USER_NOT_FOUND",
        });
        return;
      }

      if (!owner.emailVerified) {
        res.status(403).json({
          error: "EMAIL_NOT_VERIFIED",
        });
        return;
      }

      if (owner.status !== "ACTIVE") {
        res.status(403).json({
          error: "USER_NOT_ACTIVE",
        });
        return;
      }

      if (!owner.publicKey) {
        res.status(409).json({
          error:
            "CRYPTOGRAPHIC_IDENTITY_REQUIRED",
        });
        return;
      }

      const capsule = await Capsule.create({
        ownerId: req.userId,
        title: title.trim(),
        ciphertext,
        iv,
        cryptoVersion,
        contentAlgorithm,
        checkInInterval,
        warningLeadTime,
        gracePeriod,
        status: "DRAFT",
      });

      try {
        await CapsuleKeyEnvelope.create({
          capsuleId: capsule._id,
          recipientUserId: req.userId,
          wrappedDek:
            ownerKeyEnvelope.wrappedDek,
          keyWrapAlgorithm:
            ownerKeyEnvelope.keyWrapAlgorithm,
          keyVersion:
            ownerKeyEnvelope.keyVersion,
        });
      } catch (error) {
        await Capsule.findByIdAndDelete(
          capsule._id,
        );

        throw error;
      }

      res.status(201).json({
        capsule: {
          id: String(capsule._id),
          status: capsule.status,
          title: capsule.title,
          cryptoVersion:
            capsule.cryptoVersion,
          contentAlgorithm:
            capsule.contentAlgorithm,
          checkInInterval:
            capsule.checkInInterval,
          warningLeadTime:
            capsule.warningLeadTime,
          gracePeriod:
            capsule.gracePeriod,
        },
      });
    } catch (error) {
      console.error(
        "Create capsule failed:",
        error,
      );

      res.status(500).json({
        error: "INTERNAL_SERVER_ERROR",
      });
    }
  },
);


/*
 * ============================================================
 * GET /api/v1/capsules/:id
 * ============================================================
 */

router.get(
  "/:id",
  requireAuth,
  async (req: AuthenticatedRequest, res) => {
    try {
      const id = getId(req);

      if (!id || !validObjectId(id)) {
        res.status(400).json({
          error: "INVALID_CAPSULE_ID",
        });
        return;
      }

      const capsule = await Capsule.findOne({
        _id: id,
        ownerId: req.userId,
      }).lean();

      if (!capsule) {
        res.status(404).json({
          error: "CAPSULE_NOT_FOUND",
        });
        return;
      }

      const beneficiaries =
        await Beneficiary.find({
          capsuleId: capsule._id,
        })
          .sort({ priority: 1 })
          .lean();

      const keyEnvelopes =
        await CapsuleKeyEnvelope.find({
          capsuleId: capsule._id,
        }).lean();

      res.status(200).json({
        capsule,
        beneficiaries,
        keyEnvelopes,
      });
    } catch (error) {
      console.error(
        "Get capsule failed:",
        error,
      );

      res.status(500).json({
        error: "INTERNAL_SERVER_ERROR",
      });
    }
  },
);


/*
 * ============================================================
 * GET /api/v1/capsules/:id/beneficiaries
 * ============================================================
 */

router.get(
  "/:id/beneficiaries",
  requireAuth,
  async (req: AuthenticatedRequest, res) => {
    try {
      const id = getId(req);

      if (!id || !validObjectId(id)) {
        res.status(400).json({
          error: "INVALID_CAPSULE_ID",
        });
        return;
      }

      const capsule = await Capsule.findOne({
        _id: id,
        ownerId: req.userId,
      }).lean();

      if (!capsule) {
        res.status(404).json({
          error: "CAPSULE_NOT_FOUND",
        });
        return;
      }

      const beneficiaries =
        await Beneficiary.find({
          capsuleId: capsule._id,
        })
          .sort({ priority: 1 })
          .lean();

      res.status(200).json({
        beneficiaries,
      });
    } catch (error) {
      console.error(
        "List beneficiaries failed:",
        error,
      );

      res.status(500).json({
        error: "INTERNAL_SERVER_ERROR",
      });
    }
  },
);


/*
 * ============================================================
 * POST /api/v1/capsules/:id/beneficiaries
 *
 * Adds an already-enrolled recipient to a DRAFT capsule.
 *
 * Body:
 * {
 *   userId,
 *   priority,
 *   wrappedDek,
 *   keyWrapAlgorithm,
 *   keyVersion
 * }
 * ============================================================
 */

router.post(
  "/:id/beneficiaries",
  requireAuth,
  async (req: AuthenticatedRequest, res) => {
    try {
      const id = getId(req);

      if (!id || !validObjectId(id)) {
        res.status(400).json({
          error: "INVALID_CAPSULE_ID",
        });
        return;
      }

      const capsule = await Capsule.findOne({
        _id: id,
        ownerId: req.userId,
      });

      if (!capsule) {
        res.status(404).json({
          error: "CAPSULE_NOT_FOUND",
        });
        return;
      }

      if (capsule.status !== "DRAFT") {
        res.status(409).json({
          error:
            "BENEFICIARIES_CAN_ONLY_BE_ADDED_TO_DRAFT",
        });
        return;
      }

      const {
        userId,
        priority,
        wrappedDek,
        keyWrapAlgorithm,
        keyVersion,
      } = req.body ?? {};

      if (
        !validObjectId(userId) ||
        String(userId) === String(req.userId)
      ) {
        res.status(400).json({
          error: "INVALID_BENEFICIARY_USER",
        });
        return;
      }

      if (
        !positiveNumber(priority)
      ) {
        res.status(400).json({
          error: "INVALID_PRIORITY",
        });
        return;
      }

      if (
        typeof wrappedDek !== "string" ||
        wrappedDek.length === 0
      ) {
        res.status(400).json({
          error: "INVALID_WRAPPED_DEK",
        });
        return;
      }

      if (
        keyWrapAlgorithm !==
        "RSA-OAEP-SHA256"
      ) {
        res.status(400).json({
          error:
            "UNSUPPORTED_KEY_WRAP_ALGORITHM",
        });
        return;
      }

      if (keyVersion !== 1) {
        res.status(400).json({
          error: "UNSUPPORTED_KEY_VERSION",
        });
        return;
      }

      const recipient =
        await User.findById(userId)
          .select(
            "email emailVerified status publicKey keyVersion",
          )
          .lean();

      if (!recipient) {
        res.status(404).json({
          error: "BENEFICIARY_USER_NOT_FOUND",
        });
        return;
      }

      if (!recipient.emailVerified) {
        res.status(400).json({
          error:
            "BENEFICIARY_EMAIL_NOT_VERIFIED",
        });
        return;
      }

      if (recipient.status !== "ACTIVE") {
        res.status(400).json({
          error:
            "BENEFICIARY_USER_NOT_ACTIVE",
        });
        return;
      }

      if (!recipient.publicKey) {
        res.status(400).json({
          error:
            "BENEFICIARY_CRYPTOGRAPHIC_IDENTITY_REQUIRED",
        });
        return;
      }

      const existing =
        await Beneficiary.findOne({
          capsuleId: capsule._id,
          userId: recipient._id,
        });

      if (existing) {
        res.status(409).json({
          error:
            "BENEFICIARY_ALREADY_ENROLLED",
        });
        return;
      }

      const priorityExists =
        await Beneficiary.findOne({
          capsuleId: capsule._id,
          priority,
        });

      if (priorityExists) {
        res.status(409).json({
          error:
            "BENEFICIARY_PRIORITY_ALREADY_USED",
        });
        return;
      }

      const beneficiary =
        await Beneficiary.create({
          capsuleId: capsule._id,
          userId: recipient._id,
          email: recipient.email,
          priority,
          status: "ENROLLED",
        });

      await CapsuleKeyEnvelope.create({
        capsuleId: capsule._id,
        recipientUserId:
          recipient._id,
        wrappedDek,
        keyWrapAlgorithm,
        keyVersion,
      });

      res.status(201).json({
        beneficiary,
      });
    } catch (error) {
      console.error(
        "Enroll beneficiary failed:",
        error,
      );

      res.status(500).json({
        error: "INTERNAL_SERVER_ERROR",
      });
    }
  },
);


/*
 * ============================================================
 * PATCH /api/v1/capsules/:id
 *
 * DRAFT → ACTIVE activation happens here.
 * ============================================================
 */

router.patch(
  "/:id",
  requireAuth,
  async (req: AuthenticatedRequest, res) => {
    try {
      const id = getId(req);

      if (!id || !validObjectId(id)) {
        res.status(400).json({
          error: "INVALID_CAPSULE_ID",
        });
        return;
      }

      const capsule = await Capsule.findOne({
        _id: id,
        ownerId: req.userId,
      });

      if (!capsule) {
        res.status(404).json({
          error: "CAPSULE_NOT_FOUND",
        });
        return;
      }

      if (
        !EDITABLE_STATUS.has(
          capsule.status,
        )
      ) {
        res.status(409).json({
          error: "CAPSULE_NOT_EDITABLE",
        });
        return;
      }

      const {
        title,
        checkInInterval,
        warningLeadTime,
        gracePeriod,
        status,
      } = req.body ?? {};

      if (title !== undefined) {
        if (
          typeof title !== "string" ||
          title.trim().length === 0 ||
          title.trim().length > 200
        ) {
          res.status(400).json({
            error: "INVALID_TITLE",
          });
          return;
        }

        capsule.title = title.trim();
      }

      if (
        checkInInterval !== undefined
      ) {
        if (
          !positiveNumber(
            checkInInterval,
          )
        ) {
          res.status(400).json({
            error:
              "INVALID_CHECK_IN_INTERVAL",
          });
          return;
        }

        capsule.checkInInterval =
          checkInInterval;
      }

      if (
        warningLeadTime !== undefined
      ) {
        if (
          !nonNegativeNumber(
            warningLeadTime,
          )
        ) {
          res.status(400).json({
            error:
              "INVALID_WARNING_LEAD_TIME",
          });
          return;
        }

        capsule.warningLeadTime =
          warningLeadTime;
      }

      if (gracePeriod !== undefined) {
        if (
          !nonNegativeNumber(
            gracePeriod,
          )
        ) {
          res.status(400).json({
            error: "INVALID_GRACE_PERIOD",
          });
          return;
        }

        capsule.gracePeriod =
          gracePeriod;
      }

      if (
        capsule.warningLeadTime >=
        capsule.checkInInterval
      ) {
        res.status(400).json({
          error:
            "WARNING_LEAD_TIME_MUST_BE_LESS_THAN_INTERVAL",
        });
        return;
      }

      /*
       * Activation is allowed only from DRAFT.
       */
      if (
        status === "ACTIVE" &&
        capsule.status === "DRAFT"
      ) {
        const beneficiaries =
          await Beneficiary.find({
            capsuleId: capsule._id,
            status: {
              $in: [
                "ENROLLED",
                "AUTHORIZED",
              ],
            },
          }).lean();

        if (beneficiaries.length === 0) {
          res.status(400).json({
            error:
              "BENEFICIARY_REQUIRED_BEFORE_ACTIVATION",
          });
          return;
        }

        const envelopeCount =
          await CapsuleKeyEnvelope.countDocuments({
            capsuleId: capsule._id,
          });

        /*
         * Owner envelope + every beneficiary
         * envelope must exist.
         */
        if (
          envelopeCount <
          beneficiaries.length + 1
        ) {
          res.status(400).json({
            error:
              "KEY_ENVELOPES_INCOMPLETE",
          });
          return;
        }

        const now = new Date();

        capsule.status = "ACTIVE";
        capsule.lastCheckInAt = now;
        capsule.nextCheckInAt =
          new Date(
            now.getTime() +
              capsule.checkInInterval,
          );

        capsule.warningAt =
          new Date(
            capsule.nextCheckInAt.getTime() -
              capsule.warningLeadTime,
          );

        capsule.graceEndsAt =
          new Date(
            capsule.nextCheckInAt.getTime() +
              capsule.gracePeriod,
          );
      }

      await capsule.save();

      res.status(200).json({
        capsule,
      });
    } catch (error) {
      console.error(
        "Update capsule failed:",
        error,
      );

      res.status(500).json({
        error: "INTERNAL_SERVER_ERROR",
      });
    }
  },
);


/*
 * ============================================================
 * DELETE /api/v1/capsules/:id
 * ============================================================
 */

router.delete(
  "/:id",
  requireAuth,
  async (req: AuthenticatedRequest, res) => {
    try {
      const id = getId(req);

      if (!id || !validObjectId(id)) {
        res.status(400).json({
          error: "INVALID_CAPSULE_ID",
        });
        return;
      }

      const capsule =
        await Capsule.findOneAndDelete({
          _id: id,
          ownerId: req.userId,
          status: "DRAFT",
        });

      if (!capsule) {
        res.status(404).json({
          error:
            "DRAFT_CAPSULE_NOT_FOUND",
        });
        return;
      }

      await CapsuleKeyEnvelope.deleteMany({
        capsuleId: capsule._id,
      });

      await Beneficiary.deleteMany({
        capsuleId: capsule._id,
      });

      res.status(200).json({
        message: "CAPSULE_DELETED",
      });
    } catch (error) {
      console.error(
        "Delete capsule failed:",
        error,
      );

      res.status(500).json({
        error: "INTERNAL_SERVER_ERROR",
      });
    }
  },
);


/*
 * ============================================================
 * POST /api/v1/capsules/:id/check-in
 *
 * Basic authoritative check-in implementation.
 * Worker/scheduling hardening comes next.
 * ============================================================
 */

router.post(
  "/:id/check-in",
  requireAuth,
  async (req: AuthenticatedRequest, res) => {
    try {
      const id = getId(req);

      if (!id || !validObjectId(id)) {
        res.status(400).json({
          error: "INVALID_CAPSULE_ID",
        });
        return;
      }

      const capsule =
        await Capsule.findOneAndUpdate(
          {
            _id: id,
            ownerId: req.userId,
            status: {
              $in: [
                "ACTIVE",
                "WARNING",
                "GRACE",
              ],
            },
          },
          {
            $set: {
              status: "ACTIVE",
              lastCheckInAt:
                new Date(),
            },
          },
          {
            new: true,
          },
        );

      if (!capsule) {
        res.status(404).json({
          error:
            "ACTIVE_CAPSULE_NOT_FOUND",
        });
        return;
      }

      const now = new Date();

      capsule.nextCheckInAt =
        new Date(
          now.getTime() +
            capsule.checkInInterval,
        );

      capsule.warningAt =
        new Date(
          capsule.nextCheckInAt.getTime() -
            capsule.warningLeadTime,
        );

      capsule.graceEndsAt =
        new Date(
          capsule.nextCheckInAt.getTime() +
            capsule.gracePeriod,
        );

      await capsule.save();

      res.status(200).json({
        capsule,
        message: "CHECK_IN_RECORDED",
      });
    } catch (error) {
      console.error(
        "Check-in failed:",
        error,
      );

      res.status(500).json({
        error: "INTERNAL_SERVER_ERROR",
      });
    }
  },
);


/*
 * ============================================================
 * POST /api/v1/capsules/:id/cancel
 * ============================================================
 */

router.post(
  "/:id/cancel",
  requireAuth,
  async (req: AuthenticatedRequest, res) => {
    try {
      const id = getId(req);

      if (!id || !validObjectId(id)) {
        res.status(400).json({
          error: "INVALID_CAPSULE_ID",
        });
        return;
      }

      const capsule =
        await Capsule.findOneAndUpdate(
          {
            _id: id,
            ownerId: req.userId,
            status: {
              $in: [
                "DRAFT",
                "ACTIVE",
                "WARNING",
                "GRACE",
              ],
            },
          },
          {
            $set: {
              status: "CANCELLED",
            },
          },
          {
            new: true,
          },
        );

      if (!capsule) {
        res.status(404).json({
          error:
            "CANCELLABLE_CAPSULE_NOT_FOUND",
        });
        return;
      }

      res.status(200).json({
        capsule,
      });
    } catch (error) {
      console.error(
        "Cancel capsule failed:",
        error,
      );

      res.status(500).json({
        error: "INTERNAL_SERVER_ERROR",
      });
    }
  },
);

export default router;
