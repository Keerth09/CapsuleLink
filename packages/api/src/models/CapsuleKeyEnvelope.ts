import { Schema, model, Types } from "mongoose";

const capsuleKeyEnvelopeSchema = new Schema(
  {
    capsuleId: {
      type: Types.ObjectId,
      ref: "Capsule",
      required: true,
      index: true,
    },

    recipientUserId: {
      type: Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    wrappedDek: {
      type: String,
      required: true,
    },

    keyWrapAlgorithm: {
      type: String,
      enum: ["RSA-OAEP-SHA256"],
      required: true,
    },

    keyVersion: {
      type: Number,
      required: true,
      default: 1,
    },
  },
  {
    timestamps: true,
  },
);

capsuleKeyEnvelopeSchema.index(
  {
    capsuleId: 1,
    recipientUserId: 1,
  },
  {
    unique: true,
  },
);

export const CapsuleKeyEnvelope = model(
  "CapsuleKeyEnvelope",
  capsuleKeyEnvelopeSchema,
);
