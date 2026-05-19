import {
  AchievedRate,
  BorrowerType,
  CustomerType,
  DpeGroup,
  LoanType,
  Prisma,
  ProjectType,
  RateAdjustment,
  RateRule,
} from "@prisma/client";
import { prisma } from "@/lib/db";

export type RateSearchProfile = {
  customerType?: CustomerType;
  projectType?: ProjectType;
  loanType?: LoanType;
  borrowerType?: BorrowerType;
  borrowerCount?: number;
  durationMonths: number;
  incomeTotalCents?: number;
  projectAmountCents?: number;
  contributionAmountCents?: number;
  contributionBps?: number;
  dpeGroup?: DpeGroup;
  region?: string;
  criteria?: Record<string, unknown>;
};

export type RateRecommendation = {
  bankId: string;
  bankName: string;
  bankSlug: string;
  logoPath: string | null;
  ruleId: string;
  sheetTitle: string;
  sheetEffectiveDate: Date;
  sourceFile: string;
  profileLabel: string | null;
  baseRateBps: number;
  adjustedRateBps: number;
  adjustments: Array<{
    label: string;
    adjustmentBps: number;
  }>;
  achieved: {
    count: number;
    bestRateBps: number | null;
    averageRateBps: number | null;
    latestAt: Date | null;
  };
};

type OfficialRule = RateRule & {
  rateSheet: {
    id: string;
    title: string;
    effectiveDate: Date;
    sourceFile: string;
    bank: {
      id: string;
      name: string;
      slug: string;
      logoPath: string | null;
    };
    adjustments: RateAdjustment[];
  };
};

export async function findRateRecommendations(profile: RateSearchProfile): Promise<RateRecommendation[]> {
  const customerType = profile.customerType ?? CustomerType.ALL;
  const loanType = profile.loanType ?? LoanType.AMORTIZING;
  const dpeGroup = profile.dpeGroup ?? DpeGroup.ANY;
  const ruleFilters: Prisma.RateRuleWhereInput[] = [
    { OR: [{ durationMinMonths: null }, { durationMinMonths: { lte: profile.durationMonths } }] },
    { OR: [{ durationMaxMonths: null }, { durationMaxMonths: { gte: profile.durationMonths } }] },
    { OR: [{ dpeGroup: DpeGroup.ANY }, { dpeGroup }] },
    ...getOptionalRuleFilters(profile),
    ...getIncomeFilter(profile),
  ];

  const rules = (await prisma.rateRule.findMany({
    where: {
      rateSheet: {
        status: "VERIFIED",
      },
      customerType: {
        in: [customerType, CustomerType.ALL],
      },
      loanType,
      AND: ruleFilters,
    },
    include: {
      rateSheet: {
        include: {
          adjustments: true,
          bank: true,
        },
      },
    },
    orderBy: [{ priority: "asc" }, { baseRateBps: "asc" }],
  })) as OfficialRule[];

  const bankIds = Array.from(new Set(rules.map((rule) => rule.rateSheet.bank.id)));
  const achievedRates = await getComparableAchievedRates(bankIds, profile);
  const achievedByBank = groupAchievedByBank(achievedRates);

  return rules
    .map((rule) => {
      const appliedAdjustments = rule.rateSheet.adjustments.filter((adjustment) => adjustmentMatches(adjustment, profile));
      const adjustedRateBps = appliedAdjustments.reduce((total, adjustment) => total + adjustment.adjustmentBps, rule.baseRateBps);
      const achieved = summarizeAchievedRates(achievedByBank.get(rule.rateSheet.bank.id) ?? []);

      return {
        bankId: rule.rateSheet.bank.id,
        bankName: rule.rateSheet.bank.name,
        bankSlug: rule.rateSheet.bank.slug,
        logoPath: rule.rateSheet.bank.logoPath,
        ruleId: rule.id,
        sheetTitle: rule.rateSheet.title,
        sheetEffectiveDate: rule.rateSheet.effectiveDate,
        sourceFile: rule.rateSheet.sourceFile,
        profileLabel: rule.profileLabel,
        baseRateBps: rule.baseRateBps,
        adjustedRateBps,
        adjustments: appliedAdjustments.map((adjustment) => ({
          label: adjustment.label,
          adjustmentBps: adjustment.adjustmentBps,
        })),
        achieved,
      } satisfies RateRecommendation;
    })
    .sort((a, b) => {
      if (a.adjustedRateBps !== b.adjustedRateBps) {
        return a.adjustedRateBps - b.adjustedRateBps;
      }

      return (a.achieved.bestRateBps ?? Number.POSITIVE_INFINITY) - (b.achieved.bestRateBps ?? Number.POSITIVE_INFINITY);
    });
}

function getOptionalRuleFilters(profile: RateSearchProfile): Prisma.RateRuleWhereInput[] {
  const filters: Prisma.RateRuleWhereInput[] = [];

  if (profile.projectType) {
    filters.push({ OR: [{ projectType: null }, { projectType: profile.projectType }] });
  }

  if (profile.borrowerType) {
    filters.push({ OR: [{ borrowerType: null }, { borrowerType: profile.borrowerType }] });
  }

  if (profile.contributionBps !== undefined) {
    filters.push({ OR: [{ contributionMinBps: null }, { contributionMinBps: { lte: profile.contributionBps } }] });
    filters.push({ OR: [{ contributionMaxBps: null }, { contributionMaxBps: { gte: profile.contributionBps } }] });
  }

  if (profile.projectAmountCents !== undefined) {
    filters.push({ OR: [{ amountMinCents: null }, { amountMinCents: { lte: profile.projectAmountCents } }] });
    filters.push({ OR: [{ amountMaxCents: null }, { amountMaxCents: { gte: profile.projectAmountCents } }] });
  }

  return filters;
}

function getIncomeFilter(profile: RateSearchProfile): Prisma.RateRuleWhereInput[] {
  if (!profile.incomeTotalCents) {
    return [];
  }

  if (profile.borrowerType === BorrowerType.SINGLE || profile.borrowerCount === 1) {
    return [
      { OR: [{ incomeMinSingleCents: null }, { incomeMinSingleCents: { lte: profile.incomeTotalCents } }] },
      { OR: [{ incomeMaxSingleCents: null }, { incomeMaxSingleCents: { gt: profile.incomeTotalCents } }] },
    ];
  }

  return [
    { OR: [{ incomeMinCoupleCents: null }, { incomeMinCoupleCents: { lte: profile.incomeTotalCents } }] },
    { OR: [{ incomeMaxCoupleCents: null }, { incomeMaxCoupleCents: { gt: profile.incomeTotalCents } }] },
  ];
}

async function getComparableAchievedRates(bankIds: string[], profile: RateSearchProfile) {
  if (!bankIds.length) {
    return [];
  }
  const filters: Prisma.AchievedRateWhereInput[] = [
    { OR: [{ dpeGroup: DpeGroup.ANY }, { dpeGroup: profile.dpeGroup ?? DpeGroup.ANY }] },
  ];

  if (profile.contributionBps !== undefined) {
    filters.push({ OR: [{ contributionBps: null }, { contributionBps: { gte: profile.contributionBps - 500 } }] });
    filters.push({ OR: [{ contributionBps: null }, { contributionBps: { lte: profile.contributionBps + 500 } }] });
  }

  if (profile.projectType) {
    filters.push({ OR: [{ projectType: null }, { projectType: profile.projectType }] });
  }

  return prisma.achievedRate.findMany({
    where: {
      bankId: {
        in: bankIds,
      },
      loanType: profile.loanType ?? LoanType.AMORTIZING,
      loanDurationMonths: {
        gte: Math.max(0, profile.durationMonths - 24),
        lte: profile.durationMonths + 24,
      },
      AND: filters,
    },
    orderBy: {
      achievedAt: "desc",
    },
    take: 250,
  });
}

function groupAchievedByBank(rows: AchievedRate[]) {
  const grouped = new Map<string, AchievedRate[]>();

  for (const row of rows) {
    grouped.set(row.bankId, [...(grouped.get(row.bankId) ?? []), row]);
  }

  return grouped;
}

function summarizeAchievedRates(rows: AchievedRate[]) {
  if (!rows.length) {
    return {
      count: 0,
      bestRateBps: null,
      averageRateBps: null,
      latestAt: null,
    };
  }

  const total = rows.reduce((sum, row) => sum + row.rateObtainedBps, 0);
  const bestRateBps = Math.min(...rows.map((row) => row.rateObtainedBps));
  const latestAt = rows.reduce((latest, row) => (row.achievedAt > latest ? row.achievedAt : latest), rows[0].achievedAt);

  return {
    count: rows.length,
    bestRateBps,
    averageRateBps: Math.round(total / rows.length),
    latestAt,
  };
}

function adjustmentMatches(adjustment: RateAdjustment, profile: RateSearchProfile) {
  const value = profile.criteria?.[adjustment.conditionKey] ?? profile[adjustment.conditionKey as keyof RateSearchProfile];

  switch (adjustment.operator) {
    case "BOOLEAN":
      return Boolean(value) === readJsonBoolean(adjustment.value);
    case "EQ":
      return String(value) === String(readJsonScalar(adjustment.value));
    case "IN":
      return readJsonArray(adjustment.value).map(String).includes(String(value));
    case "GTE":
      return Number(value) >= Number(readJsonScalar(adjustment.value));
    case "LTE":
      return Number(value) <= Number(readJsonScalar(adjustment.value));
    case "RANGE": {
      const range = readJsonRange(adjustment.value);
      return Number(value) >= range.min && Number(value) <= range.max;
    }
    default:
      return false;
  }
}

function readJsonScalar(value: Prisma.JsonValue) {
  if (Array.isArray(value)) {
    return value[0];
  }

  if (value && typeof value === "object") {
    return JSON.stringify(value);
  }

  return value;
}

function readJsonArray(value: Prisma.JsonValue) {
  return Array.isArray(value) ? value : [value];
}

function readJsonBoolean(value: Prisma.JsonValue) {
  if (typeof value === "boolean") {
    return value;
  }

  return String(value) === "true";
}

function readJsonRange(value: Prisma.JsonValue) {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    const range = value as { min?: unknown; max?: unknown };
    return {
      min: Number(range.min ?? Number.NEGATIVE_INFINITY),
      max: Number(range.max ?? Number.POSITIVE_INFINITY),
    };
  }

  return {
    min: Number.NEGATIVE_INFINITY,
    max: Number.POSITIVE_INFINITY,
  };
}
