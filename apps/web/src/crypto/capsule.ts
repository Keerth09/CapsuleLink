function toArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  const copy = new Uint8Array(bytes.byteLength);
  copy.set(bytes);
  return copy.buffer;
}
const AES_KEY_LENGTH = 256;
const AES_IV_LENGTH = 12;
const RSA_HASH = "SHA-256";

export type EncryptedCapsule = {
  ciphertext: string;
  iv: string;
  cryptoVersion: number;
  contentAlgorithm: "AES-256-GCM";
};

export type WrappedDek = {
  wrappedDek: string;
  keyWrapAlgorithm: "RSA-OAEP-SHA256";
  keyVersion: number;
};

function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";
  const chunkSize = 0x8000;

  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(
      i,
      Math.min(i + chunkSize, bytes.length),
    );

    binary += String.fromCharCode(...chunk);
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

function randomBytes(length: number): Uint8Array {
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  return bytes;
}

export async function generateCapsuleDek(): Promise<CryptoKey> {
  return crypto.subtle.generateKey(
    {
      name: "AES-GCM",
      length: AES_KEY_LENGTH,
    },
    true,
    ["encrypt", "decrypt"],
  );
}

export async function encryptCapsuleContent(
  plaintext: string,
): Promise<{
  encrypted: EncryptedCapsule;
  dek: CryptoKey;
}> {
  const dek = await generateCapsuleDek();

  const iv = randomBytes(AES_IV_LENGTH);

  const plaintextBytes =
    new TextEncoder().encode(plaintext);

  const encryptedBytes =
    await crypto.subtle.encrypt(
      {
        name: "AES-GCM",
        iv: toArrayBuffer(iv),
      },
      dek,
      plaintextBytes,
    );

  return {
    encrypted: {
      ciphertext: bytesToBase64(
        new Uint8Array(encryptedBytes),
      ),
      iv: bytesToBase64(iv),
      cryptoVersion: 1,
      contentAlgorithm: "AES-256-GCM",
    },
    dek,
  };
}

export async function exportDek(
  dek: CryptoKey,
): Promise<Uint8Array> {
  return new Uint8Array(
    await crypto.subtle.exportKey("raw", dek),
  );
}

export async function importRecipientPublicKey(
  publicKeyBase64: string,
): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    "spki",
    toArrayBuffer(base64ToBytes(publicKeyBase64)),
    {
      name: "RSA-OAEP",
      hash: RSA_HASH,
    },
    false,
    ["encrypt"],
  );
}

export async function wrapDekForRecipient(
  dek: CryptoKey,
  publicKeyBase64: string,
  keyVersion = 1,
): Promise<WrappedDek> {
  const publicKey =
    await importRecipientPublicKey(publicKeyBase64);

  const dekBytes = await exportDek(dek);

  const wrapped =
    await crypto.subtle.encrypt(
      {
        name: "RSA-OAEP",
      },
      publicKey,
      toArrayBuffer(dekBytes),
    );

  return {
    wrappedDek: bytesToBase64(
      new Uint8Array(wrapped),
    ),
    keyWrapAlgorithm: "RSA-OAEP-SHA256",
    keyVersion,
  };
}

export async function unwrapDek(
  wrappedDekBase64: string,
  privateKey: CryptoKey,
): Promise<CryptoKey> {
  const dekBytes =
    await crypto.subtle.decrypt(
      {
        name: "RSA-OAEP",
      },
      privateKey,
      toArrayBuffer(base64ToBytes(wrappedDekBase64)),
    );

  return crypto.subtle.importKey(
    "raw",
    dekBytes,
    {
      name: "AES-GCM",
      length: AES_KEY_LENGTH,
    },
    false,
    ["decrypt"],
  );
}

export async function decryptCapsuleContent(
  ciphertextBase64: string,
  ivBase64: string,
  dek: CryptoKey,
): Promise<string> {
  const decrypted =
    await crypto.subtle.decrypt(
      {
        name: "AES-GCM",
        iv: toArrayBuffer(base64ToBytes(ivBase64)),
      },
      dek,
      toArrayBuffer(base64ToBytes(ciphertextBase64)),
    );

  return new TextDecoder().decode(decrypted);
}


