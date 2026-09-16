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
    },
    encryptedContent: {
      type: String,
      required: true,
    },
    wrappedDek: {
      type: String,
      required: true,
    },
    iv: {
      type: String,
      required: true,
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
    checkInInterval: {
      type: Number,
      required: true,
    },
    warningLeadTime: {
      type: Number,
      required: true,
    },
    gracePeriod: {
      type: Number,
      required: true,
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
  },
  {
    timestamps: true,
  },
);

export const Capsule = model("Capsule", capsuleSchema);
