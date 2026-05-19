import { NextRequest, NextResponse } from "next/server";
import { normalizeFrenchPhone } from "@/lib/phone";
import { hitRateLimit } from "@/lib/rate-limit";
import { startSmsVerification } from "@/lib/twilio";

export async function POST(request: NextRequest) {
  const body = (await request.json().catch(() => null)) as { phone?: string } | null;
  const phone = normalizeFrenchPhone(body?.phone || "");
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";

  if (!phone) {
    return NextResponse.json({ ok: false, message: "Numéro mobile invalide." }, { status: 400 });
  }

  if (hitRateLimit(`verify:start:${ip}`, 8, 1000 * 60 * 10) || hitRateLimit(`verify:start:${phone}`, 4, 1000 * 60 * 10)) {
    return NextResponse.json({ ok: false, message: "Trop de tentatives. Réessayez plus tard." }, { status: 429 });
  }

  const result = await startSmsVerification(phone);

  return NextResponse.json(result, { status: result.ok ? 200 : 502 });
}
