import { Schema, model } from "mongoose";

const encryptedPrivateKeyEnvelopeSchema = new Schema(
  {
    ciphertext: {
      type: String,
      required: true,
    },
    iv: {
      type: String,
      required: true,
    },
    salt: {
      type: String,
      required: true,
    },
    algorithm: {
      type: String,
      enum: ["AES-256-GCM"],
      required: true,
    },
    kdf: {
      type: String,
      enum: ["PBKDF2-HMAC-SHA-256"],
      required: true,
    },
    iterations: {
      type: Number,
      enum: [600000],
      required: true,
    },
  },
  {
    _id: false,
  },
);

const encryptedPrivateKeyEnvelopesSchema = new Schema(
  {
    passphrase: {
      type: encryptedPrivateKeyEnvelopeSchema,
      required: true,
    },
    recovery: {
      type: encryptedPrivateKeyEnvelopeSchema,
      required: true,
    },
  },
  {
    _id: false,
  },
);

const userSchema = new Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },

    passwordHash: {
      type: String,
      required: true,
    },

    emailVerified: {
      type: Boolean,
      default: false,
      required: true,
    },

    timezone: {
      type: String,
      default: "UTC",
      required: true,
    },

    status: {
      type: String,
      enum: ["ACTIVE", "SUSPENDED", "DISABLED"],
      default: "ACTIVE",
      required: true,
    },

    /*
     * Public cryptographic identity.
     *
     * This is safe to store server-side.
     * The corresponding private key is never stored plaintext.
     */
    publicKey: {
      type: String,
    },

    /*
     * Both envelopes contain the same private key,
     * independently protected by:
     *
     * 1. Vault passphrase
     * 2. Recovery Key
     *
     * Neither secret is stored here.
     */
    encryptedPrivateKeyEnvelopes: {
      type: encryptedPrivateKeyEnvelopesSchema,
    },

    keyVersion: {
      type: Number,
      default: 1,
    },
  },
  {
    timestamps: true,
  },
);

export const User = model("User", userSchema);