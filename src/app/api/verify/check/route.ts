import { NextRequest, NextResponse } from "next/server";
import { createLeadToken } from "@/lib/lead-token";
import { normalizeFrenchPhone } from "@/lib/phone";
import { hitRateLimit } from "@/lib/rate-limit";
import { checkSmsVerification } from "@/lib/twilio";

export async function POST(request: NextRequest) {
  const body = (await request.json().catch(() => null)) as { phone?: string; code?: string } | null;
  const phone = normalizeFrenchPhone(body?.phone || "");
  const code = (body?.code || "").replace(/\D/g, "");

  if (!phone || code.length < 4) {
    return NextResponse.json({ ok: false, message: "Code ou numéro invalide." }, { status: 400 });
  }

  if (hitRateLimit(`verify:check:${phone}`, 6, 1000 * 60 * 10)) {
    return NextResponse.json({ ok: false, message: "Trop de codes essayés. Réessayez plus tard." }, { status: 429 });
  }

  const result = await checkSmsVerification(phone, code);

  if (!result.approved) {
    return NextResponse.json(result, { status: 401 });
  }

  return NextResponse.json({
    ok: true,
    mock: result.mock,
    token: createLeadToken(phone),
  });
}
