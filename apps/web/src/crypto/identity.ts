import { entropyToMnemonic } from "@scure/bip39";
import { wordlist } from "@scure/bip39/wordlists/english.js";

const RSA_MODULUS_LENGTH = 3072;
const PBKDF2_ITERATIONS = 600000;
const IDENTITY_KEY_VERSION = 1;

const PRIVATE_KEY_ALGORITHM = "RSA-OAEP-SHA256" as const;
const PRIVATE_KEY_KDF = "PBKDF2-HMAC-SHA256" as const;

function toArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  const copy = new Uint8Array(bytes.byteLength);
  copy.set(bytes);
  return copy.buffer;
}

function randomBytes(length: number): Uint8Array {
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  return bytes;
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";
  const chunkSize = 0x8000;

  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(
      ...bytes.subarray(i, Math.min(i + chunkSize, bytes.length)),
    );
  }

  return btoa(binary);
}

function base64ToBytes(value: string): Uint8Array {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);

  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }

  return bytes;
}

export interface EncryptedPrivateKeyEnvelope {
  ciphertext: string;
  iv: string;
  salt: string;
  algorithm: typeof PRIVATE_KEY_ALGORITHM;
  kdf: typeof PRIVATE_KEY_KDF;
  iterations: number;
}

export interface IdentityEnrollmentPayload {
  publicKey: string;
  encryptedPrivateKeyEnvelopes: {
    passphrase: EncryptedPrivateKeyEnvelope;
    recovery: EncryptedPrivateKeyEnvelope;
  };
  keyVersion: number;
}

export interface CryptographicIdentity {
  publicKey: string;
  encryptedPrivateKeyEnvelopes: {
    passphrase: EncryptedPrivateKeyEnvelope;
    recovery: EncryptedPrivateKeyEnvelope;
  };
  recoveryKey: string;
  recoveryConfirmationWords: {
    positions: [number, number, number];
    words: [string, string, string];
  };
  keyVersion: number;
}

async function deriveAesKey(
  secret: string,
  salt: Uint8Array,
): Promise<CryptoKey> {
  const secretBytes = new TextEncoder().encode(secret);

  const passwordKey = await crypto.subtle.importKey(
    "raw",
    toArrayBuffer(secretBytes),
    "PBKDF2",
    false,
    ["deriveKey"],
  );

  return crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: toArrayBuffer(salt),
      iterations: PBKDF2_ITERATIONS,
      hash: "SHA-256",
    },
    passwordKey,
    {
      name: "AES-GCM",
      length: 256,
    },
    false,
    ["encrypt", "decrypt"],
  );
}

async function encryptPrivateKey(
  privateKeyBytes: Uint8Array,
  secret: string,
): Promise<EncryptedPrivateKeyEnvelope> {
  const salt = randomBytes(16);
  const iv = randomBytes(12);

  const wrappingKey = await deriveAesKey(secret, salt);

  const encrypted = await crypto.subtle.encrypt(
    {
      name: "AES-GCM",
      iv: toArrayBuffer(iv),
    },
    wrappingKey,
    toArrayBuffer(privateKeyBytes),
  );

  return {
    ciphertext: bytesToBase64(new Uint8Array(encrypted)),
    iv: bytesToBase64(iv),
    salt: bytesToBase64(salt),
    algorithm: PRIVATE_KEY_ALGORITHM,
    kdf: PRIVATE_KEY_KDF,
    iterations: PBKDF2_ITERATIONS,
  };
}

function selectRecoveryConfirmationWords(
  recoveryKey: string,
  positions: [number, number, number],
) {
  const words = recoveryKey.trim().split(/\s+/);

  return {
    positions,
    words: [
      words[positions[0]],
      words[positions[1]],
      words[positions[2]],
    ] as [string, string, string],
  };
}

/**
 * Generates three unique random word positions from a 24-word Recovery Key.
 */
export function selectRecoveryConfirmationIndexes(): [
  number,
  number,
  number,
] {
  const source = crypto.getRandomValues(new Uint32Array(3));

  const first = source[0] % 24;

  let second = source[1] % 24;
  while (second === first) {
    second = (second + 1) % 24;
  }

  let third = source[2] % 24;
  while (third === first || third === second) {
    third = (third + 1) % 24;
  }

  return [first, second, third];
}

/**
 * Generates a cryptographically secure 24-word Recovery Key.
 */
export function generateRecoveryKey(): string {
  const entropy = randomBytes(32);
  return entropyToMnemonic(entropy, wordlist);
}

export function recoveryKeyToWords(recoveryKey: string): string[] {
  return recoveryKey.trim().split(/\s+/);
}

export async function generateCryptographicIdentity(
  vaultPassphrase: string,
): Promise<CryptographicIdentity> {
  if (vaultPassphrase.length < 12) {
    throw new Error("VAULT_PASSPHRASE_TOO_SHORT");
  }

  const keyPair = await crypto.subtle.generateKey(
    {
      name: "RSA-OAEP",
      modulusLength: RSA_MODULUS_LENGTH,
      publicExponent: new Uint8Array([1, 0, 1]),
      hash: "SHA-256",
    },
    true,
    ["encrypt", "decrypt"],
  );

  const publicKeyBytes = new Uint8Array(
    await crypto.subtle.exportKey("spki", keyPair.publicKey),
  );

  const privateKeyBytes = new Uint8Array(
    await crypto.subtle.exportKey("pkcs8", keyPair.privateKey),
  );

  const recoveryKey = generateRecoveryKey();

  const confirmationIndexes =
    selectRecoveryConfirmationIndexes();

  const passphraseEnvelope = await encryptPrivateKey(
    privateKeyBytes,
    vaultPassphrase,
  );

  const recoveryEnvelope = await encryptPrivateKey(
    privateKeyBytes,
    recoveryKey,
  );

  return {
    publicKey: bytesToBase64(publicKeyBytes),
    encryptedPrivateKeyEnvelopes: {
      passphrase: passphraseEnvelope,
      recovery: recoveryEnvelope,
    },
    recoveryKey,
    recoveryConfirmationWords:
      selectRecoveryConfirmationWords(
        recoveryKey,
        confirmationIndexes,
      ),
    keyVersion: IDENTITY_KEY_VERSION,
  };
}

/**
 * Compatibility API used by CryptoSetupPage.
 *
 * Returns the server-safe enrollment payload separately from
 * the Recovery Key, which must never be sent to the backend.
 */
export async function createIdentityEnrollmentPayload(
  vaultPassphrase: string,
  recoveryKey: string,
): Promise<{
  payload: IdentityEnrollmentPayload;
}> {
  if (vaultPassphrase.length < 12) {
    throw new Error("VAULT_PASSPHRASE_TOO_SHORT");
  }

  const recoveryWords = recoveryKeyToWords(recoveryKey);

  if (recoveryWords.length !== 24) {
    throw new Error("INVALID_RECOVERY_KEY");
  }

  const keyPair = await crypto.subtle.generateKey(
    {
      name: "RSA-OAEP",
      modulusLength: RSA_MODULUS_LENGTH,
      publicExponent: new Uint8Array([1, 0, 1]),
      hash: "SHA-256",
    },
    true,
    ["encrypt", "decrypt"],
  );

  const publicKeyBytes = new Uint8Array(
    await crypto.subtle.exportKey(
      "spki",
      keyPair.publicKey,
    ),
  );

  const privateKeyBytes = new Uint8Array(
    await crypto.subtle.exportKey(
      "pkcs8",
      keyPair.privateKey,
    ),
  );

  const passphraseEnvelope =
    await encryptPrivateKey(
      privateKeyBytes,
      vaultPassphrase,
    );

  const recoveryEnvelope =
    await encryptPrivateKey(
      privateKeyBytes,
      recoveryKey,
    );

  return {
    payload: {
      publicKey: bytesToBase64(publicKeyBytes),
      encryptedPrivateKeyEnvelopes: {
        passphrase: passphraseEnvelope,
        recovery: recoveryEnvelope,
      },
      keyVersion: IDENTITY_KEY_VERSION,
    },
  };
}

export async function decryptPrivateKey(
  envelope: EncryptedPrivateKeyEnvelope,
  secret: string,
): Promise<CryptoKey> {
  if (envelope.algorithm !== PRIVATE_KEY_ALGORITHM) {
    throw new Error("UNSUPPORTED_PRIVATE_KEY_ALGORITHM");
  }

  if (envelope.kdf !== PRIVATE_KEY_KDF) {
    throw new Error("UNSUPPORTED_PRIVATE_KEY_KDF");
  }

  if (envelope.iterations !== PBKDF2_ITERATIONS) {
    throw new Error("UNSUPPORTED_PBKDF2_ITERATIONS");
  }

  const salt = base64ToBytes(envelope.salt);
  const iv = base64ToBytes(envelope.iv);
  const ciphertext = base64ToBytes(envelope.ciphertext);

  const wrappingKey = await deriveAesKey(secret, salt);

  const privateKeyBytes = await crypto.subtle.decrypt(
    {
      name: "AES-GCM",
      iv: toArrayBuffer(iv),
    },
    wrappingKey,
    toArrayBuffer(ciphertext),
  );

  return crypto.subtle.importKey(
    "pkcs8",
    privateKeyBytes,
    {
      name: "RSA-OAEP",
      hash: "SHA-256",
    },
    true,
    ["decrypt"],
  );
}

export async function encryptPrivateKeyForSecret(
  privateKeyBytes: Uint8Array,
  secret: string,
): Promise<EncryptedPrivateKeyEnvelope> {
  return encryptPrivateKey(privateKeyBytes, secret);
}

