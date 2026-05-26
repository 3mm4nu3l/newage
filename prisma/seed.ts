import { CustomerType, LoanType, PrismaClient, RateSheetStatus } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { rateRows } from "../src/lib/rates";
import { getDatabaseUrl } from "../src/lib/database-url";

const adapter = new PrismaPg(getDatabaseUrl());
const prisma = new PrismaClient({ adapter });

const extraDraftSheets: Array<{
  bank: string;
  slug: string;
  logoPath: string;
  title: string;
  effectiveDate: string;
  sourceFile: string;
}> = [];

async function main() {
  await prisma.rateSheet.deleteMany();

  const bankCache = new Map<string, string>();

  for (const row of rateRows.filter((item) => item.rate !== null)) {
    const bankId = await upsertBank({
      name: row.bank,
      slug: slugify(row.bank),
      region: row.region,
      logoPath: getLogoPath(row.bank),
    });
    bankCache.set(row.bank, bankId);

    const sheet = await prisma.rateSheet.upsert({
      where: {
        bankId_month_title: {
          bankId,
          month: row.sourceDate.slice(0, 7),
          title: row.scale,
        },
      },
      create: {
        bankId,
        title: row.scale,
        month: row.sourceDate.slice(0, 7),
        effectiveDate: new Date(row.sourceDate),
        sourceFile: row.sourceFile,
        status: RateSheetStatus.VERIFIED,
      },
      update: {
        effectiveDate: new Date(row.sourceDate),
        sourceFile: row.sourceFile,
        status: RateSheetStatus.VERIFIED,
      },
    });

    await prisma.rateRule.create({
      data: {
        rateSheetId: sheet.id,
        label: `${row.profile} - ${row.durationLabel}`,
        profileLabel: row.profile,
        customerType: mapCustomerType(row.customerType),
        loanType: row.scale.toLowerCase().includes("relais") ? LoanType.BRIDGE_PARTIAL : LoanType.AMORTIZING,
        durationMaxMonths: row.durationYears ? row.durationYears * 12 : null,
        baseRateBps: Math.round((row.rate ?? 0) * 100),
        rawCriteria: {
          durationLabel: row.durationLabel,
          displayRate: row.rate,
          note: row.note,
          scale: row.scale,
        },
      },
    });
  }

  for (const sheet of extraDraftSheets) {
    const bankId = await upsertBank({
      name: sheet.bank,
      slug: sheet.slug,
      logoPath: sheet.logoPath,
    });

    await prisma.rateSheet.upsert({
      where: {
        bankId_month_title: {
          bankId,
          month: sheet.effectiveDate.slice(0, 7),
          title: sheet.title,
        },
      },
      create: {
        bankId,
        title: sheet.title,
        month: sheet.effectiveDate.slice(0, 7),
        effectiveDate: new Date(sheet.effectiveDate),
        sourceFile: sheet.sourceFile,
        status: RateSheetStatus.DRAFT,
        notes: "PDF ajouté, règles de taux à structurer.",
      },
      update: {
        sourceFile: sheet.sourceFile,
        status: RateSheetStatus.DRAFT,
      },
    });
  }

  console.log(`Seed terminé : ${bankCache.size + extraDraftSheets.length} banques préparées.`);
}

async function upsertBank(input: { name: string; slug: string; region?: string; logoPath?: string | null }) {
  const bank = await prisma.bank.upsert({
    where: {
      slug: input.slug,
    },
    create: {
      slug: input.slug,
      name: input.name,
      region: input.region,
      logoPath: input.logoPath,
    },
    update: {
      name: input.name,
      region: input.region,
      logoPath: input.logoPath,
      isActive: true,
    },
  });

  return bank.id;
}

function mapCustomerType(value: string) {
  if (value.toLowerCase().includes("prospect")) {
    return CustomerType.PROSPECT;
  }

  if (value.toLowerCase().includes("client")) {
    return CustomerType.CLIENT;
  }

  return CustomerType.ALL;
}

function slugify(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function getLogoPath(bank: string) {
  const logos: Record<string, string> = {
    "Banque Populaire Rives de Paris": "/banks/banque_populaire_circle_white_logo.png",
    "Banque Populaire Val de France": "/banks/banque_populaire_circle_white_logo.png",
    "Banque Populaire Bourgogne Franche-Comté": "/banks/banque_populaire_circle_white_logo.png",
    BCP: "/banks/bcp_circle.png",
    "BNP Paribas": "/banks/bnp_paribas_square.png",
    "BRED Métropole": "/banks/bred_square.png",
    "Caisse d'Épargne IDF": "/banks/caisse_d_epargne_square.png",
    CCF: "/banks/hsbc_square.png",
    "Crédit Agricole Brie Picardie": "/banks/credit_agricole_square.png",
    "Crédit Agricole IDF": "/banks/credit_agricole_square.png",
    "Crédit Agricole Sud Rhône Alpes": "/banks/credit_agricole_square.png",
    Fortuneo: "/banks/fortuneo_square.png",
    "Hello bank!": "/banks/hello_bank_circle_v2.png",
    "La Banque Postale": "/banks/la_banque_postale_square.png",
    LCL: "/banks/lcl_circle_prismic_v2.png",
    Palatine: "/banks/palatine_square.png",
    "Société Générale": "/banks/societe_generale_square.png",
    "Société Générale IDF": "/banks/societe_generale_square.png",
    "Société Générale Province": "/banks/societe_generale_square.png",
  };

  return logos[bank] ?? null;
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
