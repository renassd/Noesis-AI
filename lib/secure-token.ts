import { createCipheriv, createDecipheriv, createHash, randomBytes } from "crypto";

function getSecretMaterial() {
  const secret = process.env.NEXTAUTH_SECRET;
  if (!secret) {
    throw new Error("Falta NEXTAUTH_SECRET en el entorno.");
  }
  return createHash("sha256").update(secret).digest();
}

export function encryptJson(payload: unknown): string {
  const iv = randomBytes(12);
  const key = getSecretMaterial();
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const plaintext = Buffer.from(JSON.stringify(payload), "utf8");
  const encrypted = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  const tag = cipher.getAuthTag();

  return `${iv.toString("base64url")}.${tag.toString("base64url")}.${encrypted.toString("base64url")}`;
}

export function decryptJson<T>(payload: string): T | null {
  try {
    const [ivRaw, tagRaw, dataRaw] = payload.split(".");
    if (!ivRaw || !tagRaw || !dataRaw) {
      return null;
    }

    const key = getSecretMaterial();
    const decipher = createDecipheriv("aes-256-gcm", key, Buffer.from(ivRaw, "base64url"));
    decipher.setAuthTag(Buffer.from(tagRaw, "base64url"));

    const decrypted = Buffer.concat([
      decipher.update(Buffer.from(dataRaw, "base64url")),
      decipher.final(),
    ]);

    return JSON.parse(decrypted.toString("utf8")) as T;
  } catch {
    return null;
  }
}
