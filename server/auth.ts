import crypto from "crypto";
import express from "express";

export const SESSION_SECRET = process.env.SESSION_SECRET || (() => {
  const secret = "dev-secret-key-12345";
  console.warn("WARNING: SESSION_SECRET is not set. Using a random generated secret. Tokens will be invalidated on server restart.");
  return secret;
})();

export function hashPassword(password: string, salt: string = "gov_alloc_salt_2026", iterations: number = 1000): string {
  return crypto.pbkdf2Sync(password, salt, iterations, 64, "sha512").toString("hex");
}

export function createToken(user: any): string {
  const payload = {
    userId: user.id,
    role: user.role,
    officeId: user.officeId,
    exp: Date.now() + 8 * 60 * 60 * 1000 // 8 hours
  };
  const payloadB64 = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const signature = crypto.createHmac("sha256", SESSION_SECRET).update(payloadB64).digest("base64url");
  return `${payloadB64}.${signature}`;
}

export function verifyToken(token: string): any {
  try {
    const parts = token.split(".");
    if (parts.length !== 2) return null;
    const [payloadB64, signature] = parts;
    const expectedSignature = crypto.createHmac("sha256", SESSION_SECRET).update(payloadB64).digest("base64url");
    if (!crypto.timingSafeEqual(Buffer.from(signature, "utf8"), Buffer.from(expectedSignature, "utf8"))) return null;
    
    const payload = JSON.parse(Buffer.from(payloadB64, "base64url").toString("utf8"));
    if (payload.exp < Date.now()) return null;
    return payload;
  } catch {
    return null;
  }
}

export const requireRole = (...roles: string[]) => {
  return (req: express.Request, res: express.Response, next: express.NextFunction) => {
    const user = (req as any).user;
    if (!user) return res.status(401).json({ error: "Unauthorized" });
    if (!roles.includes(user.role)) {
      return res.status(403).json({ error: "Forbidden: Insufficient privileges" });
    }
    next();
  };
};

export const requireAuth = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  let token: string | undefined;
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith("Bearer ")) {
    token = authHeader.split(" ")[1];
  } else if (req.query.token && typeof req.query.token === "string") {
    token = req.query.token;
  }

  if (!token) {
    return res.status(401).json({ error: "Unauthorized: Missing token" });
  }
  const user = verifyToken(token);
  if (!user) {
    return res.status(401).json({ error: "Unauthorized: Invalid or expired token" });
  }
  (req as any).user = user;
  next();
};
