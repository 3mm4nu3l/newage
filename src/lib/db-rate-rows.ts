import { RateSheetStatus } from "@prisma/client";
import { prisma } from "@/lib/db";
import { RateRow } from "@/lib/rates";

export async function getImportedRateRows(): Promise<RateRow[]> {
  const rules = await prisma.rateRule.findMany({
    where: {
      rateSheet: {
        status: {
          in: [RateSheetStatus.DRAFT, RateSheetStatus.VERIFIED],
        },
      },
    },
    include: {
      rateSheet: {
        include: {
          bank: true,
          tables: {
            orderBy: {
              order: "asc",
            },
          },
        },
      },
    },
    orderBy: [
      { rateSheet: { effectiveDate: "desc" } },
      { durationMaxMonths: "asc" },
      { baseRateBps: "asc" },
    ],
  });

  return rules.map((rule) => ({
    id: `db-${rule.id}`,
    bank: rule.rateSheet.bank.name,
    region: rule.rateSheet.bank.region || "France",
    scale: rule.rateSheet.title,
    customerType: formatCustomerType(rule.customerType),
    profile: rule.profileLabel || rule.label,
    durationLabel: readRawString(rule.rawCriteria, "durationLabel") || formatDuration(rule.durationMaxMonths),
    durationYears: rule.durationMaxMonths ? Math.round(rule.durationMaxMonths / 12) : 0,
    rate: rule.baseRateBps / 100,
    brokerBestRate: null,
    sourceDate: rule.rateSheet.effectiveDate.toISOString().slice(0, 10),
    sourceFile: rule.rateSheet.sourceFile,
    status: rule.rateSheet.status === RateSheetStatus.VERIFIED ? "verified" : "review",
    note: rule.rateSheet.status === RateSheetStatus.DRAFT ? "Brouillon importé par OCR Mistral, à relire avant publication." : undefined,
    importedMarkdown: readImportedMarkdown(rule.rateSheet.tables),
  }));
}

function readImportedMarkdown(tables: Array<{ payload: unknown }>) {
  for (const table of tables) {
    if (!table.payload || typeof table.payload !== "object" || !("markdown" in table.payload)) {
      continue;
    }

    const markdown = (table.payload as Record<string, unknown>).markdown;

    if (typeof markdown === "string" && markdown.trim()) {
      return markdown;
    }
  }

  return undefined;
}

function formatCustomerType(value: string) {
  if (value === "PROSPECT") {
    return "Prospect";
  }

  if (value === "CLIENT") {
    return "Client";
  }

  return "Tous";
}

function formatDuration(months: number | null) {
  if (!months) {
    return "Durée à préciser";
  }

  return `${Math.round(months / 12)} ans`;
}

function readRawString(value: unknown, key: string) {
  if (!value || typeof value !== "object" || !(key in value)) {
    return null;
  }

  const candidate = (value as Record<string, unknown>)[key];
  return typeof candidate === "string" ? candidate : null;
}
