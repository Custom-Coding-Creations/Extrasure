import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";

const ALGORITHM = "aes-256-gcm";

type EncryptedSecret = {
  encryptedValue: string;
  iv: string;
  authTag: string;
};

function getEncryptionKey() {
  const keyMaterial = process.env.ADMIN_MANUAL_ENCRYPTION_KEY?.trim();

  if (!keyMaterial) {
    throw new Error("Missing ADMIN_MANUAL_ENCRYPTION_KEY environment variable.");
  }

  return createHash("sha256").update(keyMaterial).digest();
}

export function encryptManualSecret(value: string): EncryptedSecret {
  if (!value.trim()) {
    throw new Error("Secret value is required.");
  }

  const ivBuffer = randomBytes(12);
  const cipher = createCipheriv(ALGORITHM, getEncryptionKey(), ivBuffer);
  const encrypted = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();

  return {
    encryptedValue: encrypted.toString("base64"),
    iv: ivBuffer.toString("base64"),
    authTag: authTag.toString("base64"),
  };
}

export function decryptManualSecret(secret: EncryptedSecret): string {
  const decipher = createDecipheriv(
    ALGORITHM,
    getEncryptionKey(),
    Buffer.from(secret.iv, "base64"),
  );

  decipher.setAuthTag(Buffer.from(secret.authTag, "base64"));
  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(secret.encryptedValue, "base64")),
    decipher.final(),
  ]);

  return decrypted.toString("utf8");
}
