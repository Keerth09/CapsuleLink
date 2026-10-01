import { Schema, model, Types } from "mongoose";

const capsuleSchema = new Schema(
  {
    ownerId: {
      type: Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200,
    },

    /**
     * Encrypted capsule ciphertext only.
     * Plaintext must never be stored server-side.
     */
    ciphertext: {
      type: String,
      required: true,
    },

    /**
     * Base64 encoded 96-bit AES-GCM IV.
     */
    iv: {
      type: String,
      required: true,
    },

    cryptoVersion: {
      type: Number,
      required: true,
      default: 1,
    },

    contentAlgorithm: {
      type: String,
      enum: ["AES-256-GCM"],
      required: true,
    },

    checkInInterval: {
      type: Number,
      required: true,
      min: 1,
    },

    warningLeadTime: {
      type: Number,
      required: true,
      min: 0,
    },

    gracePeriod: {
      type: Number,
      required: true,
      min: 0,
    },

    lastCheckInAt: {
      type: Date,
    },

    nextCheckInAt: {
      type: Date,
    },

    warningAt: {
      type: Date,
    },

    graceEndsAt: {
      type: Date,
    },

    status: {
      type: String,
      enum: [
        "DRAFT",
        "ACTIVE",
        "WARNING",
        "GRACE",
        "RELEASING",
        "RELEASED",
        "CANCELLED",
      ],
      default: "DRAFT",
      required: true,
    },

    releaseStartedAt: {
      type: Date,
    },

    releasedAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  },
);

capsuleSchema.index({
  ownerId: 1,
  status: 1,
});

capsuleSchema.index({
  status: 1,
  nextCheckInAt: 1,
});

capsuleSchema.index({
  status: 1,
  graceEndsAt: 1,
});

export const Capsule = model("Capsule", capsuleSchema);
