import { NextRequest, NextResponse } from "next/server";
import { DpeGroup, Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";

type BorrowerPayload = {
  civility?: unknown;
  lastName?: unknown;
  firstName?: unknown;
  birthDate?: unknown;
  mobile?: unknown;
  email?: unknown;
};

const isFrenchMobileNumber = (value: string) => /^(?:0[67]\d{8}|(?:\+33|0033)[67]\d{8})$/.test(value.replace(/[\s.\-()]/g, ""));
const isValidEmail = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());

export async function POST(request: NextRequest) {
  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;

  if (!body) {
    return NextResponse.json({ ok: false, message: "Simulation invalide." }, { status: 400 });
  }

  const borrowers = Array.isArray(body.borrowers) ? (body.borrowers as BorrowerPayload[]) : [];

  if (!borrowers.length) {
    return NextResponse.json({ ok: false, message: "Ajoute au moins un emprunteur avant de sauvegarder." }, { status: 400 });
  }

  const parsedBorrowers = borrowers.map((borrower) => {
    const birthDate = typeof borrower.birthDate === "string" ? parseFrenchBirthDate(borrower.birthDate) : null;
    const email = typeof borrower.email === "string" ? borrower.email.trim() : "";
    const mobile = typeof borrower.mobile === "string" ? borrower.mobile.trim() : "";

    return {
      civility: typeof borrower.civility === "string" ? borrower.civility : "",
      lastName: typeof borrower.lastName === "string" ? borrower.lastName : "",
      firstName: typeof borrower.firstName === "string" ? borrower.firstName : "",
      birthDate,
      mobile,
      email,
    };
  });

  if (parsedBorrowers.some((borrower) => !borrower.civility || !borrower.lastName || !borrower.firstName || !borrower.birthDate || !isFrenchMobileNumber(borrower.mobile) || !isValidEmail(borrower.email))) {
    return NextResponse.json({ ok: false, message: "Les informations emprunteurs sont incompletes ou invalides." }, { status: 400 });
  }

  const simulationId = typeof body.simulationId === "string" ? body.simulationId : null;
  const simulationData = {
    projectAmountCents: toCents(body.projectAmount),
    contributionCents: toCents(body.contributionAmount),
    usage: typeof body.usage === "string" ? body.usage : "MAIN_RESIDENCE",
    propertyState: typeof body.propertyState === "string" ? body.propertyState : "OLD",
    notaryFeesCents: toCents(body.notaryFees),
    annualIncomeCents: toCents(body.annualIncome),
    annualChargesCents: toCents(body.annualCharges),
    borrowerCount: toNumber(body.borrowerCount) || parsedBorrowers.length,
    ageRetained: toNumber(body.ageRetained) || 0,
    durationMonths: toDurationMonths(body.duration),
    dpeGroup: readDpeGroup(body.dpeGroup),
    rateType: typeof body.rateType === "string" ? body.rateType : "fixed",
    recommendationJson: typeof body.recommendations === "undefined" ? undefined : (body.recommendations as Prisma.InputJsonValue),
  };

  const simulation = simulationId
    ? await prisma.loanSimulation.update({
        where: { id: simulationId },
        data: simulationData,
      })
    : await prisma.loanSimulation.create({
        data: simulationData,
      });

  if (!simulationId) {
    for (const borrower of parsedBorrowers) {
      const createdBorrower = await prisma.borrower.create({
        data: {
          ...borrower,
          birthDate: borrower.birthDate as Date,
        },
      });

      await prisma.loanSimulationBorrower.create({
        data: {
          simulationId: simulation.id,
          borrowerId: createdBorrower.id,
        },
      });
    }
  }

  return NextResponse.json({ ok: true, simulationId: simulation.id });
}

export async function GET(request: NextRequest) {
  const simulationId = request.nextUrl.searchParams.get("id")?.trim();

  if (simulationId) {
    const simulation = await prisma.loanSimulation.findUnique({
      where: { id: simulationId },
      include: {
        borrowers: {
          include: {
            borrower: true,
          },
          orderBy: {
            createdAt: "asc",
          },
        },
      },
    });

    if (!simulation) {
      return NextResponse.json({ ok: false, message: "Simulation introuvable." }, { status: 404 });
    }

    return NextResponse.json({ ok: true, simulation: serializeSimulation(simulation) });
  }

  const simulations = await prisma.loanSimulation.findMany({
    orderBy: {
      createdAt: "desc",
    },
    include: {
      borrowers: {
        include: {
          borrower: true,
        },
        orderBy: {
          createdAt: "asc",
        },
      },
    },
    take: 20,
  });

  return NextResponse.json({ ok: true, simulations: simulations.map(serializeSimulation) });
}

function serializeSimulation(
  simulation: Awaited<ReturnType<typeof prisma.loanSimulation.findMany>>[number] & {
    borrowers?: { borrower: { id: string; civility: string; lastName: string; firstName: string; birthDate: Date; mobile: string; email: string } }[];
  },
) {
  return {
    id: simulation.id,
    projectAmount: simulation.projectAmountCents / 100,
    contributionAmount: simulation.contributionCents / 100,
    usage: simulation.usage,
    propertyState: simulation.propertyState,
    notaryFees: simulation.notaryFeesCents / 100,
    annualIncome: simulation.annualIncomeCents / 100,
    annualCharges: simulation.annualChargesCents / 100,
    borrowerCount: simulation.borrowerCount,
    ageRetained: simulation.ageRetained,
    durationYears: simulation.durationMonths / 12,
    dpeGroup: simulation.dpeGroup,
    rateType: simulation.rateType,
    recommendations: simulation.recommendationJson,
    createdAt: simulation.createdAt.toISOString(),
    borrowers: (simulation.borrowers ?? []).map(({ borrower }) => ({
      id: borrower.id,
      civility: borrower.civility,
      lastName: borrower.lastName,
      firstName: borrower.firstName,
      birthDate: formatFrenchBirthDate(borrower.birthDate),
      mobile: borrower.mobile,
      email: borrower.email,
    })),
  };
}

function formatFrenchBirthDate(date: Date) {
  return new Intl.DateTimeFormat("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric" }).format(date);
}

function parseFrenchBirthDate(value: string) {
  const match = value.trim().match(/^(\d{2})\/(\d{2})\/(\d{4})$/);

  if (!match) {
    return null;
  }

  const day = Number(match[1]);
  const month = Number(match[2]);
  const year = Number(match[3]);
  const date = new Date(year, month - 1, day);

  return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day ? date : null;
}

function toNumber(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value !== "string") {
    return 0;
  }

  const parsed = Number(value.replace(/\s/g, "").replace(",", "."));
  return Number.isFinite(parsed) ? parsed : 0;
}

function toCents(value: unknown) {
  return Math.round(toNumber(value) * 100);
}

function toDurationMonths(value: unknown) {
  return Math.round(toNumber(value) * 12);
}

function readDpeGroup(value: unknown) {
  return typeof value === "string" && value in DpeGroup ? (value as DpeGroup) : DpeGroup.ANY;
}
