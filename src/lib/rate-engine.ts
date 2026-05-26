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
  rateType: "fixed" | "variable";
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
    .filter((rule) => ruleMatchesStructuredProfile(rule, profile))
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
        rateType: getRateType(rule),
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

function ruleMatchesStructuredProfile(rule: OfficialRule, profile: RateSearchProfile) {
  if (isSwissFrancRule(rule)) {
    return false;
  }

  if (!ruleMatchesRequestedRateType(rule, profile)) {
    return false;
  }

  if (rule.rateSheet.bank.name === "CCF") {
    return ccfRuleMatchesProfile(rule, profile);
  }

  if (!profile.incomeTotalCents || !rule.profileLabel) {
    return true;
  }

  const bankName = normalizeText(rule.rateSheet.bank.name);

  if (bankName === "bnp paribas" || bankName === "hello bank!") {
    return bnpRuleMatchesIncome(rule, profile);
  }

  if (bankName === "banque populaire bourgogne franche-comte") {
    return bpbfcRuleMatchesIncome(rule, profile);
  }

  if (bankName === "credit agricole sud rhone alpes") {
    return casraRuleMatchesIncome(rule, profile);
  }

  if (bankName === "credit agricole idf") {
    return caidfRuleMatchesProfile(rule, profile);
  }

  if (bankName === "societe generale" || bankName.startsWith("societe generale ")) {
    return societeGeneraleRuleMatchesIncome(rule, profile);
  }

  if (bankName === "bred metropole") {
    return bredRuleMatchesIncome(rule, profile);
  }

  if (bankName === "caisse d'epargne idf") {
    return ceidfRuleMatchesIncome(rule, profile);
  }

  if (bankName === "banque populaire rives de paris") {
    return bprpRuleMatchesContribution(rule, profile);
  }

  return true;
}

function ruleMatchesRequestedRateType(rule: OfficialRule, profile: RateSearchProfile) {
  const requestedRateType = String(profile.criteria?.rateType ?? "both");

  if (requestedRateType === "both") {
    return true;
  }

  return getRateType(rule) === requestedRateType;
}

function getRateType(rule: OfficialRule): "fixed" | "variable" {
  const searchable = normalizeText(`${rule.rateSheet.title} ${rule.profileLabel ?? ""} ${rule.label} ${rule.rateSheet.sourceFile}`);
  return searchable.includes("revisable") || searchable.includes("variable") ? "variable" : "fixed";
}

function isSwissFrancRule(rule: OfficialRule) {
  const searchable = normalizeText(`${rule.rateSheet.title} ${rule.profileLabel ?? ""} ${rule.label} ${rule.rateSheet.sourceFile}`);
  return /\bchf\b/.test(searchable);
}

function bprpRuleMatchesContribution(rule: OfficialRule, profile: RateSearchProfile) {
  const contributionBps = profile.contributionBps;

  if (contributionBps === undefined || !rule.profileLabel) {
    return true;
  }

  const label = normalizeText(rule.profileLabel);

  if (label.includes("tap < 20")) {
    return contributionBps < 2000;
  }

  if (label.includes("20") && label.includes("30")) {
    return contributionBps >= 2000 && contributionBps < 3000;
  }

  if (label.includes("tap >= 30")) {
    return contributionBps >= 3000;
  }

  return true;
}

function societeGeneraleRuleMatchesIncome(rule: OfficialRule, profile: RateSearchProfile) {
  const income = profile.incomeTotalCents ? profile.incomeTotalCents / 100 : 0;
  const isSingle = profile.borrowerType === BorrowerType.SINGLE || profile.borrowerCount === 1;
  const label = rule.profileLabel ?? "";

  if (label.includes("> 80") || label.includes("> 100")) {
    return isSingle ? income > 80000 : income > 100000;
  }

  if (label.includes("> 32") || label.includes("> 42")) {
    return isSingle ? income > 32000 && income <= 80000 : income > 42000 && income <= 100000;
  }

  if (label.includes("< 32") || label.includes("< 42")) {
    return isSingle ? income < 32000 : income < 42000;
  }

  return true;
}

function bredRuleMatchesIncome(rule: OfficialRule, profile: RateSearchProfile) {
  const income = profile.incomeTotalCents ? profile.incomeTotalCents / 100 : 0;
  const isSingle = profile.borrowerType === BorrowerType.SINGLE || profile.borrowerCount === 1;

  switch (normalizeText(rule.profileLabel ?? "")) {
    case "bareme 1":
      return isSingle ? income < 30000 : income < 50000;
    case "bareme 2":
      return isSingle ? income >= 30000 && income < 50000 : income >= 50000 && income < 80000;
    case "bareme 3":
      return isSingle ? income >= 50000 && income < 90000 : income >= 80000 && income < 120000;
    case "bareme 4":
      return isSingle ? income >= 90000 : income >= 120000;
    default:
      return true;
  }
}

function ceidfRuleMatchesIncome(rule: OfficialRule, profile: RateSearchProfile) {
  const income = profile.incomeTotalCents ? profile.incomeTotalCents / 100 : 0;
  const isSingle = profile.borrowerType === BorrowerType.SINGLE || profile.borrowerCount === 1;

  switch (normalizeText(rule.profileLabel ?? "")) {
    case "bon":
      return isSingle ? income < 35000 : income < 45000;
    case "tres bon":
      return isSingle ? income >= 35000 && income < 70000 : income >= 45000 && income < 90000;
    case "excellent":
      return isSingle ? income >= 70000 && income < 100000 : income >= 90000 && income < 150000;
    case "exclusif":
      return isSingle ? income >= 100000 : income >= 150000;
    default:
      return true;
  }
}

function bnpRuleMatchesIncome(rule: OfficialRule, profile: RateSearchProfile) {
  const income = profile.incomeTotalCents ? profile.incomeTotalCents / 100 : 0;
  const isSingle = profile.borrowerType === BorrowerType.SINGLE || profile.borrowerCount === 1;

  switch (normalizeText(rule.profileLabel ?? "")) {
    case "moins de 30 ke / moins de 60 ke":
      return isSingle ? income < 30000 : income < 60000;
    case "30 ke a moins de 65 ke / 60 ke a moins de 75 ke":
      return isSingle ? income >= 30000 && income < 65000 : income >= 60000 && income < 75000;
    case "65 ke a moins de 90 ke / 75 ke a moins de 120 ke":
      return isSingle ? income >= 65000 && income < 90000 : income >= 75000 && income < 120000;
    case "plus de 90 ke / plus de 120 ke":
      return isSingle ? income >= 90000 : income >= 120000;
    default:
      return true;
  }
}

function bpbfcRuleMatchesIncome(rule: OfficialRule, profile: RateSearchProfile) {
  const income = profile.incomeTotalCents ? profile.incomeTotalCents / 100 : 0;
  const isSingle = profile.borrowerType === BorrowerType.SINGLE || profile.borrowerCount === 1;
  const label = normalizeText(rule.profileLabel ?? "");

  if (label === "premium chf") {
    return isSingle ? income >= 30000 : income >= 45000;
  }

  if (label === "standard chf") {
    return isSingle ? income < 30000 : income < 45000;
  }

  if (label === "excellium") {
    return isSingle ? income >= 60000 : income >= 80000;
  }

  if (label === "premium") {
    return isSingle ? income > 45000 : income > 60000;
  }

  if (label === "standard") {
    return isSingle ? income <= 45000 : income <= 60000;
  }

  return true;
}

function casraRuleMatchesIncome(rule: OfficialRule, profile: RateSearchProfile) {
  const income = profile.incomeTotalCents ? profile.incomeTotalCents / 100 : 0;
  const isSingle = profile.borrowerType === BorrowerType.SINGLE || profile.borrowerCount === 1;
  const label = rule.profileLabel ?? "";

  if (label.includes(">150")) {
    return income > 150000;
  }

  if (label.includes(">50") || label.includes(">80")) {
    return isSingle ? income > 50000 : income > 80000;
  }

  if (label.includes(">40-50") || label.includes(">60-80")) {
    return isSingle ? income > 40000 && income <= 50000 : income > 60000 && income <= 80000;
  }

  if (label.includes("0-40") || label.includes("0-60")) {
    return isSingle ? income <= 40000 : income <= 60000;
  }

  return true;
}

function caidfRuleMatchesProfile(rule: OfficialRule, profile: RateSearchProfile) {
  const income = profile.incomeTotalCents ? profile.incomeTotalCents / 100 : 0;
  const contributionBps = profile.contributionBps ?? 0;
  const isSingle = profile.borrowerType === BorrowerType.SINGLE || profile.borrowerCount === 1;
  const label = normalizeText(rule.profileLabel ?? "");

  if (label === "premium") {
    return contributionBps >= 1000 && (isSingle ? income >= 70000 : income >= 100000);
  }

  if (label === "particulier") {
    return contributionBps >= 1500 && (isSingle ? income < 70000 : income < 100000);
  }

  return true;
}

function ccfRuleMatchesProfile(rule: OfficialRule, profile: RateSearchProfile) {
  if (!profile.incomeTotalCents || !rule.profileLabel) {
    return true;
  }

  const income = profile.incomeTotalCents / 100;
  const isSingle = profile.borrowerType === BorrowerType.SINGLE || profile.borrowerCount === 1;
  const isIdf = profile.region?.toLowerCase().includes("idf") || profile.region?.toLowerCase().includes("ile-de-france");
  const age = Number(profile.criteria?.age);
  const minIncome = getCcfMinIncome(rule.profileLabel, isSingle, Boolean(isIdf));

  if (minIncome === null || income < minIncome) {
    return false;
  }

  if (rule.profileLabel === "T2" && Number.isFinite(age)) {
    return age <= 40;
  }

  if (rule.profileLabel === "T2 bis" && Number.isFinite(age)) {
    return age > 40;
  }

  return true;
}

function getCcfMinIncome(profileLabel: string, isSingle: boolean, isIdf: boolean) {
  switch (profileLabel) {
    case "T0":
      return isSingle ? (isIdf ? 90000 : 80000) : isIdf ? 140000 : 110000;
    case "T1":
      return isSingle ? (isIdf ? 70000 : 60000) : isIdf ? 90000 : 80000;
    case "T2":
    case "T2 bis":
      return isSingle ? (isIdf ? 50000 : 40000) : isIdf ? 70000 : 60000;
    default:
      return null;
  }
}

function normalizeText(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/€/g, "e")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
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
