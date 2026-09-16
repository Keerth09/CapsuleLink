import { Schema, model, Types } from "mongoose";

const beneficiarySchema = new Schema(
  {
    capsuleId: {
      type: Types.ObjectId,
      ref: "Capsule",
      required: true,
      index: true,
    },
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
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
  },
  {
    timestamps: true,
  },
);

export const Beneficiary = model("Beneficiary", beneficiarySchema);
