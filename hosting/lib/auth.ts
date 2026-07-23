import { env as cloudflareEnv } from "cloudflare:workers";
import { ApiError } from "./http";

interface RuntimeEnv {
  DB: D1Database;
  ADMIN_NAME?: string;
  ADMIN_EMAIL?: string;
  ADMIN_PASSWORD?: string;
  JWT_SECRET?: string;
}

export interface AdminIdentity {
  id: string;
  name: string;
  email: string;
}

interface TokenPayload extends AdminIdentity {
  exp: number;
}

function runtime(): RuntimeEnv {
  return cloudflareEnv as unknown as RuntimeEnv;
}

function requiredValue(name: keyof RuntimeEnv): string {
  const value = runtime()[name];
  if (typeof value !== "string" || !value.trim()) {
    throw new Error(`Missing production setting: ${name}`);
  }
  return value.trim();
}

function adminIdentity(): AdminIdentity {
  return {
    id: "trackswift-admin",
    name: runtime().ADMIN_NAME?.trim() || "TrackSwift Admin",
    email: requiredValue("ADMIN_EMAIL").toLowerCase(),
  };
}

function encodeBytes(bytes: Uint8Array) {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary)
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replace(/=+$/u, "");
}

function decodeBytes(value: string) {
  const padded = value.replaceAll("-", "+").replaceAll("_", "/");
  const binary = atob(padded + "=".repeat((4 - (padded.length % 4)) % 4));
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

async function digest(value: string) {
  return new Uint8Array(
    await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value)),
  );
}

async function secureEqual(left: string, right: string) {
  const [leftDigest, rightDigest] = await Promise.all([
    digest(left),
    digest(right),
  ]);
  let difference = 0;
  for (let index = 0; index < leftDigest.length; index += 1) {
    difference |= leftDigest[index] ^ rightDigest[index];
  }
  return difference === 0;
}

async function signingKey() {
  return crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(requiredValue("JWT_SECRET")),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"],
  );
}

export async function authenticateAdmin(email: string, password: string) {
  const admin = adminIdentity();
  const [emailMatches, passwordMatches] = await Promise.all([
    secureEqual(String(email || "").trim().toLowerCase(), admin.email),
    secureEqual(String(password || ""), requiredValue("ADMIN_PASSWORD")),
  ]);

  if (!emailMatches || !passwordMatches) {
    throw new ApiError(401, "Invalid email or password.");
  }

  return admin;
}

export async function signAccessToken(admin: AdminIdentity) {
  const payload: TokenPayload = {
    ...admin,
    exp: Math.floor(Date.now() / 1000) + 8 * 60 * 60,
  };
  const body = encodeBytes(
    new TextEncoder().encode(JSON.stringify(payload)),
  );
  const signature = new Uint8Array(
    await crypto.subtle.sign(
      "HMAC",
      await signingKey(),
      new TextEncoder().encode(body),
    ),
  );
  return `${body}.${encodeBytes(signature)}`;
}

async function verifyToken(token: string): Promise<TokenPayload> {
  const [body, signature] = token.split(".");
  if (!body || !signature) {
    throw new ApiError(401, "Administrator session is invalid.");
  }

  const valid = await crypto.subtle.verify(
    "HMAC",
    await signingKey(),
    decodeBytes(signature),
    new TextEncoder().encode(body),
  );
  if (!valid) {
    throw new ApiError(401, "Administrator session is invalid.");
  }

  try {
    const payload = JSON.parse(
      new TextDecoder().decode(decodeBytes(body)),
    ) as TokenPayload;
    const configuredAdmin = adminIdentity();
    if (
      payload.exp <= Math.floor(Date.now() / 1000) ||
      payload.email !== configuredAdmin.email ||
      payload.id !== configuredAdmin.id
    ) {
      throw new Error("Expired or mismatched token");
    }
    return payload;
  } catch {
    throw new ApiError(401, "Administrator session has expired.");
  }
}

export async function requireAdmin(request: Request): Promise<AdminIdentity> {
  const authorization = request.headers.get("authorization") || "";
  if (!authorization.startsWith("Bearer ")) {
    throw new ApiError(401, "Administrator sign-in is required.");
  }
  const { id, name, email } = await verifyToken(authorization.slice(7));
  return { id, name, email };
}

export function getDatabase() {
  const database = runtime().DB;
  if (!database) throw new Error("TrackSwift production database is unavailable.");
  return database;
}
