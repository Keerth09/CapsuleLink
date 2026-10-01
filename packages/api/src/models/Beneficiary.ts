import { Schema, model, Types } from "mongoose";

const beneficiarySchema = new Schema(
  {
    capsuleId: {
      type: Types.ObjectId,
      ref: "Capsule",
      required: true,
      index: true,
    },

    userId: {
      type: Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
    },

    priority: {
      type: Number,
      required: true,
      min: 1,
    },

    status: {
      type: String,
      enum: [
        "PENDING",
        "INVITED",
        "ENROLLED",
        "AUTHORIZED",
        "NOTIFIED",
        "ACCESS_STARTED",
        "VIEWED",
        "ACKNOWLEDGED",
      ],
      default: "PENDING",
      required: true,
    },

    acknowledgementDeadline: {
      type: Date,
    },

    notifiedAt: {
      type: Date,
    },

    accessedAt: {
      type: Date,
    },

    viewedAt: {
      type: Date,
    },

    acknowledgedAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  },
);

beneficiarySchema.index({
  capsuleId: 1,
  priority: 1,
});

beneficiarySchema.index({
  userId: 1,
});

beneficiarySchema.index(
  {
    capsuleId: 1,
    userId: 1,
  },
  {
    unique: true,
  },
);

export const Beneficiary = model(
  "Beneficiary",
  beneficiarySchema,
);
