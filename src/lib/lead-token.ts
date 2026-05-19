import { createHmac, timingSafeEqual } from "node:crypto";

const tokenTtlMs = 1000 * 60 * 30;

function getSecret() {
  return process.env.LEAD_TOKEN_SECRET || "ezto-local-development-secret";
}

function signPayload(payload: string) {
  return createHmac("sha256", getSecret()).update(payload).digest("base64url");
}

export function createLeadToken(phone: string) {
  const payload = JSON.stringify({
    phone,
    exp: Date.now() + tokenTtlMs,
  });
  const encodedPayload = Buffer.from(payload).toString("base64url");
  const signature = signPayload(encodedPayload);

  return `${encodedPayload}.${signature}`;
}

export function verifyLeadToken(token: string | undefined, expectedPhone: string) {
  if (!token || !token.includes(".")) {
    return false;
  }

  const [payload, signature] = token.split(".");
  const expectedSignature = signPayload(payload);

  try {
    if (!timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature))) {
      return false;
    }

    const parsed = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as {
      phone?: string;
      exp?: number;
    };

    return parsed.phone === expectedPhone && typeof parsed.exp === "number" && parsed.exp > Date.now();
  } catch {
    return false;
  }
}
