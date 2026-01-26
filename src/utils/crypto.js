import crypto from "crypto";

const ALGORITHM = "aes-256-gcm";
const SECRET_KEY = process.env.ENCRYPTION_KEY; // Must be 32 characters

export function encryptPassword(password) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGORITHM, Buffer.from(SECRET_KEY), iv);
  
  let encrypted = cipher.update(password, "utf8", "hex");
  encrypted += cipher.final("hex");
  
  return {
    iv: iv.toString("hex"),
    tag: cipher.getAuthTag().toString("hex"),
    data: encrypted
  };
}

export function decryptPassword(encryptedObj) {
  const decipher = crypto.createDecipheriv(
    ALGORITHM, 
    Buffer.from(SECRET_KEY), 
    Buffer.from(encryptedObj.iv, "hex")
  );
  decipher.setAuthTag(Buffer.from(encryptedObj.tag, "hex"));
  
  let decrypted = decipher.update(encryptedObj.data, "hex", "utf8");
  decrypted += decipher.final("utf8");
  return decrypted;
}