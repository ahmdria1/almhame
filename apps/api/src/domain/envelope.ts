import { createCipheriv, createDecipheriv, randomBytes } from "crypto";

const VERSION = "v1";

export function decodeMasterKey(encoded: string): Buffer {
  const key = Buffer.from(encoded, "base64");
  if (key.length !== 32) {
    throw new Error("KMS master key must decode to 32 bytes");
  }
  return key;
}

export function generateDek(): Buffer {
  return randomBytes(32);
}

export function wrapKey(dek: Buffer, master: Buffer): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", master, iv);
  const enc = Buffer.concat([cipher.update(dek), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [VERSION, iv.toString("base64"), tag.toString("base64"), enc.toString("base64")].join(".");
}

export function unwrapKey(wrapped: string, master: Buffer): Buffer {
  const [ver, ivB, tagB, encB] = wrapped.split(".");
  if (ver !== VERSION || !ivB || !tagB || !encB) throw new Error("bad wrapped key");
  const decipher = createDecipheriv("aes-256-gcm", master, Buffer.from(ivB, "base64"));
  decipher.setAuthTag(Buffer.from(tagB, "base64"));
  return Buffer.concat([decipher.update(Buffer.from(encB, "base64")), decipher.final()]);
}

export function encryptString(plain: string, dek: Buffer): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", dek, iv);
  const enc = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [VERSION, iv.toString("base64"), tag.toString("base64"), enc.toString("base64")].join(".");
}

export function decryptString(payload: string, dek: Buffer): string {
  const [ver, ivB, tagB, encB] = payload.split(".");
  if (ver !== VERSION || !ivB || !tagB || !encB) throw new Error("bad payload");
  const decipher = createDecipheriv("aes-256-gcm", dek, Buffer.from(ivB, "base64"));
  decipher.setAuthTag(Buffer.from(tagB, "base64"));
  return Buffer.concat([decipher.update(Buffer.from(encB, "base64")), decipher.final()]).toString("utf8");
}

export function encryptBytes(plain: Buffer, dek: Buffer): Buffer {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", dek, iv);
  const enc = Buffer.concat([cipher.update(plain), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([Buffer.from("E1"), iv, tag, enc]);
}

export function decryptBytes(blob: Buffer, dek: Buffer): Buffer {
  if (blob.subarray(0, 2).toString() !== "E1") throw new Error("bad file");
  const iv = blob.subarray(2, 14);
  const tag = blob.subarray(14, 30);
  const enc = blob.subarray(30);
  const decipher = createDecipheriv("aes-256-gcm", dek, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(enc), decipher.final()]);
}
