import { RateSheetStatus } from "@prisma/client";
import { prisma } from "@/lib/db";
import { RateRow } from "@/lib/rates";

export async function getImportedRateRows(): Promise<RateRow[]> {
  const latestSheets = await prisma.rateSheet.findMany({
    where: {
      status: {
        in: [RateSheetStatus.DRAFT, RateSheetStatus.VERIFIED],
      },
      rules: {
        some: {},
      },
    },
    include: {
      bank: true,
      rules: true,
      tables: {
        orderBy: {
          order: "asc",
        },
      },
    },
    orderBy: [
      { effectiveDate: "desc" },
      { updatedAt: "desc" },
    ],
  });

  const latestByBank = new Map<string, (typeof latestSheets)[number]>();

  for (const sheet of latestSheets) {
    if (!latestByBank.has(sheet.bankId)) {
      latestByBank.set(sheet.bankId, sheet);
    }
  }

  return Array.from(latestByBank.values()).flatMap((sheet) =>
    sheet.rules
      .sort((a, b) => (a.durationMaxMonths ?? 0) - (b.durationMaxMonths ?? 0) || a.baseRateBps - b.baseRateBps)
      .map((rule) => ({
    id: `db-${rule.id}`,
    bank: sheet.bank.name,
    region: sheet.bank.region || "France",
    scale: sheet.title,
    customerType: formatCustomerType(rule.customerType),
    profile: rule.profileLabel || rule.label,
    durationLabel: readRawString(rule.rawCriteria, "durationLabel") || formatDuration(rule.durationMaxMonths),
    durationYears: rule.durationMaxMonths ? Math.round(rule.durationMaxMonths / 12) : 0,
    rate: rule.baseRateBps / 100,
    brokerBestRate: null,
    sourceDate: sheet.effectiveDate.toISOString().slice(0, 10),
    sourceFile: sheet.sourceFile,
    status: sheet.status === RateSheetStatus.VERIFIED ? "verified" : "review",
    note: sheet.status === RateSheetStatus.DRAFT ? "Brouillon importé par OCR Mistral, à relire avant publication." : undefined,
    importedMarkdown: readImportedMarkdown(sheet.tables),
      })),
  );
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
