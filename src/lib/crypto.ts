import crypto from "crypto"

function getKey(): Buffer {
  const raw = process.env.EMAIL_ENCRYPTION_KEY || process.env.ENCRYPTION_KEY || ""
  if (!raw) {
    throw new Error("Missing EMAIL_ENCRYPTION_KEY (or ENCRYPTION_KEY) env var")
  }
  // Derive a 32-byte key from the provided secret
  return crypto.createHash("sha256").update(raw).digest()
}

export function encryptString(plain: string): string {
  const key = getKey()
  const iv = crypto.randomBytes(12) // GCM recommended IV size
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv)
  const ciphertext = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()])
  const tag = cipher.getAuthTag()
  // Pack: iv (12) | tag (16) | ciphertext
  const packed = Buffer.concat([iv, tag, ciphertext])
  return packed.toString("base64")
}

export function decryptString(packedBase64: string): string {
  const key = getKey()
  const packed = Buffer.from(packedBase64, "base64")
  const iv = packed.subarray(0, 12)
  const tag = packed.subarray(12, 28)
  const ciphertext = packed.subarray(28)
  const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv)
  decipher.setAuthTag(tag)
  const plain = Buffer.concat([decipher.update(ciphertext), decipher.final()])
  return plain.toString("utf8")
}


