import { NextRequest, NextResponse } from "next/server";
import { BorrowerType, CustomerType, DpeGroup, LoanType, ProjectType } from "@prisma/client";
import { findRateRecommendations, RateSearchProfile } from "@/lib/rate-engine";

export async function POST(request: NextRequest) {
  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;

  if (!body) {
    return NextResponse.json({ ok: false, message: "Profil invalide." }, { status: 400 });
  }

  const profile = parseProfile(body);

  if (!profile.durationMonths) {
    return NextResponse.json({ ok: false, message: "Durée de financement obligatoire." }, { status: 400 });
  }

  const recommendations = await findRateRecommendations(profile);

  return NextResponse.json({
    ok: true,
    recommendations: recommendations.slice(0, 10).map((recommendation) => ({
      ...recommendation,
      rate: recommendation.adjustedRateBps / 100,
      baseRate: recommendation.baseRateBps / 100,
      achieved: {
        ...recommendation.achieved,
        bestRate: recommendation.achieved.bestRateBps ? recommendation.achieved.bestRateBps / 100 : null,
        averageRate: recommendation.achieved.averageRateBps ? recommendation.achieved.averageRateBps / 100 : null,
      },
    })),
  });
}

function parseProfile(body: Record<string, unknown>): RateSearchProfile {
  const projectAmountCents = toCents(body.projectAmount);
  const contributionAmountCents = toCents(body.contributionAmount ?? body.contribution);
  const contributionBps =
    toNumber(body.contributionBps) ??
    (projectAmountCents && contributionAmountCents ? Math.round((contributionAmountCents / projectAmountCents) * 10000) : undefined);

  return {
    customerType: readEnum(CustomerType, body.customerType),
    projectType: readEnum(ProjectType, body.projectType),
    loanType: readEnum(LoanType, body.loanType) ?? LoanType.AMORTIZING,
    borrowerType: readEnum(BorrowerType, body.borrowerType),
    borrowerCount: toNumber(body.borrowerCount),
    durationMonths: toDurationMonths(body.durationMonths ?? body.duration),
    incomeTotalCents: toCents(body.incomeTotal ?? body.income),
    projectAmountCents,
    contributionAmountCents,
    contributionBps,
    dpeGroup: readEnum(DpeGroup, body.dpeGroup) ?? DpeGroup.ANY,
    region: typeof body.region === "string" ? body.region : undefined,
    criteria: typeof body.criteria === "object" && body.criteria !== null ? (body.criteria as Record<string, unknown>) : undefined,
  };
}

function readEnum<T extends Record<string, string>>(enumObject: T, value: unknown): T[keyof T] | undefined {
  if (typeof value !== "string") {
    return undefined;
  }

  return Object.values(enumObject).includes(value) ? (value as T[keyof T]) : undefined;
}

function toDurationMonths(value: unknown) {
  const numeric = toNumber(value);

  if (!numeric) {
    return 0;
  }

  return numeric > 40 ? numeric : numeric * 12;
}

function toCents(value: unknown) {
  const numeric = toNumber(value);
  return numeric === undefined ? undefined : Math.round(numeric * 100);
}

function toNumber(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value !== "string") {
    return undefined;
  }

  const parsed = Number(value.replace(/\s/g, "").replace(",", "."));
  return Number.isFinite(parsed) ? parsed : undefined;
}
