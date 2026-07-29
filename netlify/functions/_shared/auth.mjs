import crypto from "node:crypto";

// Clave para firmar tokens de sesión. Es un valor fijo dentro del código;
// suficiente para el nivel de seguridad de esta herramienta interna.
const TOKEN_SECRET = "vidri-torre-control-nejapa-2026";

export function makeSalt() {
  return crypto.randomBytes(16).toString("hex");
}

export function hashPassword(password, salt) {
  return crypto.scryptSync(password, salt, 64).toString("hex");
}

export function verifyPassword(password, salt, expectedHash) {
  const hash = hashPassword(password, salt);
  const a = Buffer.from(hash, "hex");
  const b = Buffer.from(expectedHash, "hex");
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

export function signToken(username, role) {
  const payload = JSON.stringify({ u: username, r: role, exp: Date.now() + 12 * 3600 * 1000 });
  const payloadB64 = Buffer.from(payload).toString("base64url");
  const sig = crypto.createHmac("sha256", TOKEN_SECRET).update(payloadB64).digest("hex");
  return `${payloadB64}.${sig}`;
}

export function verifyToken(token) {
  if (!token || typeof token !== "string" || !token.includes(".")) return null;
  const [payloadB64, sig] = token.split(".");
  const expectedSig = crypto.createHmac("sha256", TOKEN_SECRET).update(payloadB64).digest("hex");
  if (sig !== expectedSig) return null;
  try {
    const payload = JSON.parse(Buffer.from(payloadB64, "base64url").toString());
    if (!payload.exp || payload.exp < Date.now()) return null;
    return { username: payload.u, role: payload.r };
  } catch {
    return null;
  }
}

export function getTokenFromRequest(req) {
  const header = req.headers.get("authorization") || "";
  return header.replace(/^Bearer\s+/i, "").trim();
}

export const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PATCH, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization"
};

export function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...CORS_HEADERS }
  });
}
