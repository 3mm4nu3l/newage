import { NextRequest, NextResponse } from "next/server";
import { verifyLeadToken } from "@/lib/lead-token";
import { normalizeFrenchPhone } from "@/lib/phone";
import { hitRateLimit } from "@/lib/rate-limit";
import { LeadPayload, sendLeadToTwenty } from "@/lib/twenty";

const requiredFields: Array<keyof LeadPayload> = [
  "firstName",
  "lastName",
  "email",
  "phone",
  "city",
  "projectType",
  "projectAmount",
  "contribution",
  "duration",
];

export async function POST(request: NextRequest) {
  const body = (await request.json().catch(() => null)) as (Partial<LeadPayload> & { verificationToken?: string }) | null;
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";

  if (!body) {
    return NextResponse.json({ ok: false, message: "Demande invalide." }, { status: 400 });
  }

  const phone = normalizeFrenchPhone(body.phone || "");

  if (!phone) {
    return NextResponse.json({ ok: false, message: "Numéro mobile invalide." }, { status: 400 });
  }

  if (!verifyLeadToken(body.verificationToken, phone)) {
    return NextResponse.json({ ok: false, message: "Mobile non vérifié ou session expirée." }, { status: 401 });
  }

  if (hitRateLimit(`lead:${ip}`, 10, 1000 * 60 * 60)) {
    return NextResponse.json({ ok: false, message: "Trop de demandes. Réessayez plus tard." }, { status: 429 });
  }

  for (const field of requiredFields) {
    if (!String(body[field] || "").trim()) {
      return NextResponse.json({ ok: false, message: "Tous les champs obligatoires doivent être remplis." }, { status: 400 });
    }
  }

  const lead: LeadPayload = {
    firstName: String(body.firstName).trim(),
    lastName: String(body.lastName).trim(),
    email: String(body.email).trim(),
    phone,
    city: String(body.city).trim(),
    projectType: String(body.projectType).trim(),
    projectAmount: String(body.projectAmount).trim(),
    contribution: String(body.contribution).trim(),
    duration: String(body.duration).trim(),
    message: String(body.message || "").trim(),
  };

  const result = await sendLeadToTwenty(lead);

  if (!result.ok) {
    return NextResponse.json({ ok: false, message: result.message || "CRM indisponible." }, { status: 502 });
  }

  return NextResponse.json({
    ok: true,
    crm: result.mode,
  });
}
