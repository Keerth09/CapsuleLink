import { Schema, model } from "mongoose";

const userSchema = new Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },

    passwordHash: {
      type: String,
      required: true,
    },

    emailVerified: {
      type: Boolean,
      required: true,
      default: false,
    },

    timezone: {
      type: String,
      required: true,
      default: "UTC",
    },

    status: {
      type: String,
      required: true,
      default: "ACTIVE",
    },
  },
  {
    timestamps: true,
  },
);

export const User = model("User", userSchema);