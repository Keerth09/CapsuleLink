import { Schema, model, Types } from "mongoose";

const releaseSchema = new Schema(
  {
    capsuleId: {
      type: Types.ObjectId,
      ref: "Capsule",
      required: true,
      unique: true,
      index: true,
    },
    status: {
      type: String,
      enum: [
        "PENDING",
        "PROCESSING",
        "COMPLETED",
        "FAILED",
      ],
      default: "PENDING",
      required: true,
    },
    startedAt: {
      type: Date,
    },
    completedAt: {
      type: Date,
    },
    failureReason: {
      type: String,
    },
  },
  {
    timestamps: true,
  },
);

export const Release = model("Release", releaseSchema);
