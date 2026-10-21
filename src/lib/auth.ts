// Signed-cookie session auth for /admin. No external service: a single shared
// admin password (env var) plus an HMAC-signed, expiring session token. Uses
// Web Crypto so the same code runs in the Edge middleware and in server actions.

export const SESSION_COOKIE = "mossannah_admin_session";
const SESSION_TTL_MS = 1000 * 60 * 60 * 12; // 12 hours

function toBase64Url(bytes: Uint8Array): string {
  let binary = "";
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromBase64Url(s: string): Uint8Array {
  const padded = s.replace(/-/g, "+").replace(/_/g, "/");
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

async function hmacKey(secret: string) {
  return crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"]
  );
}

export async function createSessionToken(secret: string): Promise<string> {
  const payload = String(Date.now() + SESSION_TTL_MS);
  const key = await hmacKey(secret);
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(payload));
  return `${payload}.${toBase64Url(new Uint8Array(sig))}`;
}

export async function verifySessionToken(token: string | undefined | null, secret: string): Promise<boolean> {
  if (!token) return false;
  const [payload, sig] = token.split(".");
  if (!payload || !sig) return false;
  const exp = Number(payload);
  if (!Number.isFinite(exp) || Date.now() > exp) return false;
  try {
    const key = await hmacKey(secret);
    return await crypto.subtle.verify("HMAC", key, fromBase64Url(sig) as BufferSource, new TextEncoder().encode(payload));
  } catch {
    return false;
  }
}
