import { NextRequest, NextResponse } from "next/server";
import { BorrowerType, CustomerType, DpeGroup, LoanType, ProjectType } from "@prisma/client";
import { findRateRecommendations, RateSearchProfile } from "@/lib/rate-engine";

const borrowerInsuranceRateTable = [
  { label: "Moins de 30 ans", minAge: 0, maxAge: 29, minRate: 0.07, maxRate: 0.2 },
  { label: "30 - 35 ans", minAge: 30, maxAge: 35, minRate: 0.1, maxRate: 0.25 },
  { label: "35 - 40 ans", minAge: 36, maxAge: 40, minRate: 0.15, maxRate: 0.35 },
  { label: "40 - 45 ans", minAge: 41, maxAge: 45, minRate: 0.2, maxRate: 0.45 },
  { label: "45 - 50 ans", minAge: 46, maxAge: 50, minRate: 0.3, maxRate: 0.6 },
  { label: "50 - 55 ans", minAge: 51, maxAge: 55, minRate: 0.45, maxRate: 0.9 },
  { label: "55 - 60 ans", minAge: 56, maxAge: 60, minRate: 0.7, maxRate: 1.2 },
  { label: "60 ans et +", minAge: 61, maxAge: Number.POSITIVE_INFINITY, minRate: 1, maxRate: 2.5 },
];

export async function POST(request: NextRequest) {
  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;

  if (!body) {
    return NextResponse.json({ ok: false, message: "Profil invalide." }, { status: 400 });
  }

  const profile = parseProfile(body);

  if (!profile.durationMonths) {
    return NextResponse.json({ ok: false, message: "Durée de financement obligatoire." }, { status: 400 });
  }

  const recommendations = keepBestRecommendationByBank(await findRateRecommendations(profile));
  const projectAmount = toNumber(body.projectAmount) ?? 0;
  const contributionAmount = toNumber(body.contributionAmount ?? body.contribution) ?? 0;
  const propertyState = typeof body.propertyState === "string" ? body.propertyState : "OLD";
  const notaryFees = calculateNotaryFees(projectAmount, propertyState);
  const financedAmount = Math.max(0, projectAmount + notaryFees - contributionAmount);
  const age = toNumber((profile.criteria as Record<string, unknown> | undefined)?.age) ?? 0;
  const annualIncome = profile.incomeTotalCents ? profile.incomeTotalCents / 100 : 0;
  const monthlyIncome = annualIncome / 12;
  const annualCharges = toNumber((profile.criteria as Record<string, unknown> | undefined)?.annualCharges) ?? 0;
  const monthlyCharges = annualCharges / 12;
  const borrowerCount = Math.max(1, profile.borrowerCount ?? 1);
  const insuranceCoverageRate = borrowerCount;
  const insuranceRate = getBorrowerInsuranceRate(age);
  const brokerageFee = clamp(financedAmount * 0.015, 3000, 6000);
  const bankFee = 1000;
  const creditLogementFee = Math.round(financedAmount * 0.012);

  return NextResponse.json({
    ok: true,
    summary: {
      financedAmount,
      notaryFees,
      contributionRate: projectAmount > 0 ? (contributionAmount / projectAmount) * 100 : null,
      durationYears: profile.durationMonths / 12,
      brokerageFee,
      bankFee,
      creditLogementFee,
      insuranceRateTable: borrowerInsuranceRateTable,
    },
    recommendations: recommendations.slice(0, 10).map((recommendation) => {
      const rate = recommendation.adjustedRateBps / 100;
      const monthlyPayment = calculateMonthlyPayment(financedAmount, rate, profile.durationMonths);
      const totalInterest = calculateTotalInterest(financedAmount, rate, profile.durationMonths);
      const monthlyInsurance = calculateMonthlyInsurance(financedAmount, insuranceRate.averageRate, insuranceCoverageRate);
      const totalMonthlyPayment = monthlyPayment + monthlyInsurance;
      const totalInsurance = Math.round(monthlyInsurance * profile.durationMonths);
      const debtRatio = monthlyIncome > 0 ? ((monthlyCharges + totalMonthlyPayment) / monthlyIncome) * 100 : null;
      const remainingIncome = monthlyIncome - monthlyCharges - totalMonthlyPayment;
      const totalFees = brokerageFee + bankFee + creditLogementFee;

      return {
        ...recommendation,
        rate,
        baseRate: recommendation.baseRateBps / 100,
        monthlyPayment,
        totalInterest,
        durationMonths: profile.durationMonths,
        durationYears: profile.durationMonths / 12,
        financedAmount,
        simulation: {
          monthlyCredit: monthlyPayment,
          monthlyInsurance,
          totalMonthlyPayment,
          monthlyIncome: Math.round(monthlyIncome),
          monthlyCharges: Math.round(monthlyCharges),
          debtRatio: debtRatio === null ? null : Number(debtRatio.toFixed(2)),
          remainingIncome: Math.round(remainingIncome),
          totalInterest,
          totalInsurance,
          brokerageFee,
          bankFee,
          creditLogementFee,
          notaryFees,
          totalFees: totalFees + notaryFees,
          totalCost: totalInterest + totalInsurance + totalFees + notaryFees,
          insurance: insuranceRate,
          insuranceCoverageRate,
        },
        achieved: {
          ...recommendation.achieved,
          bestRate: recommendation.achieved.bestRateBps ? recommendation.achieved.bestRateBps / 100 : null,
          averageRate: recommendation.achieved.averageRateBps ? recommendation.achieved.averageRateBps / 100 : null,
        },
      };
    }),
  });
}

function keepBestRecommendationByBank<T extends { bankId: string }>(recommendations: T[]) {
  const seen = new Set<string>();
  const unique: T[] = [];

  for (const recommendation of recommendations) {
    if (seen.has(recommendation.bankId)) {
      continue;
    }

    seen.add(recommendation.bankId);
    unique.push(recommendation);
  }

  return unique;
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

function calculateMonthlyPayment(amount: number, annualRate: number, durationMonths: number) {
  if (!amount || !annualRate || !durationMonths) {
    return 0;
  }

  const monthlyRate = annualRate / 100 / 12;
  return Math.round((amount * monthlyRate) / (1 - (1 + monthlyRate) ** -durationMonths));
}

function calculateTotalInterest(amount: number, annualRate: number, durationMonths: number) {
  const monthlyPayment = calculateMonthlyPayment(amount, annualRate, durationMonths);
  return Math.max(0, Math.round(monthlyPayment * durationMonths - amount));
}

function calculateMonthlyInsurance(amount: number, annualInsuranceRate: number, coverageRate: number) {
  return Math.round((amount * coverageRate * (annualInsuranceRate / 100)) / 12);
}

function calculateNotaryFees(projectAmount: number, propertyState: string) {
  const rate = propertyState === "OLD" ? 0.075 : 0.025;
  return Math.round(projectAmount * rate);
}

function getBorrowerInsuranceRate(age: number) {
  const row = borrowerInsuranceRateTable.find((item) => age >= item.minAge && age <= item.maxAge) ?? borrowerInsuranceRateTable[0];
  return {
    ...row,
    averageRate: Number(((row.minRate + row.maxRate) / 2).toFixed(3)),
  };
}

function clamp(value: number, min: number, max: number) {
  return Math.round(Math.min(max, Math.max(min, value)));
}
