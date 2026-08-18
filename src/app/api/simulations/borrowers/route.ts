import { NextRequest, NextResponse } from "next/server";
import { DpeGroup } from "@prisma/client";
import { prisma } from "@/lib/db";

const isFrenchMobileNumber = (value: string) => /^(?:0[67]\d{8}|(?:\+33|0033)[67]\d{8})$/.test(value.replace(/[\s.\-()]/g, ""));
const isValidEmail = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());

export async function GET(request: NextRequest) {
  const email = request.nextUrl.searchParams.get("email")?.trim();

  if (!email || email.length < 2) {
    return NextResponse.json({ ok: true, borrowers: [] });
  }

  const borrowers = await prisma.borrower.findMany({
    where: {
      email: {
        contains: email,
        mode: "insensitive",
      },
    },
    orderBy: {
      email: "asc",
    },
    select: {
      id: true,
      civility: true,
      lastName: true,
      firstName: true,
      birthDate: true,
      mobile: true,
      email: true,
    },
    take: 8,
  });

  return NextResponse.json({
    ok: true,
    borrowers: borrowers.map((borrower) => ({
      ...borrower,
      birthDate: formatFrenchBirthDate(borrower.birthDate),
    })),
  });
}

export async function POST(request: NextRequest) {
  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  const borrower = body?.borrower as Record<string, unknown> | undefined;

  if (!body || !borrower) {
    return NextResponse.json({ ok: false, message: "Emprunteur invalide." }, { status: 400 });
  }

  const borrowerId = typeof body.borrowerId === "string" ? body.borrowerId : "";
  const email = typeof borrower.email === "string" ? borrower.email.trim() : "";
  const mobile = typeof borrower.mobile === "string" ? borrower.mobile.trim() : "";
  const birthDate = typeof borrower.birthDate === "string" ? parseFrenchBirthDate(borrower.birthDate) : null;

  if (!borrowerId && (!email || !isValidEmail(email) || !isFrenchMobileNumber(mobile) || !birthDate)) {
    return NextResponse.json({ ok: false, message: "Informations emprunteur invalides." }, { status: 400 });
  }

  const existingBorrower = borrowerId ? await prisma.borrower.findUnique({ where: { id: borrowerId } }) : await prisma.borrower.findFirst({
    where: {
      email: {
        equals: email,
        mode: "insensitive",
      },
    },
  });

  if (!borrowerId && existingBorrower) {
    return NextResponse.json({ ok: false, message: "Cet email existe deja en base." }, { status: 409 });
  }

  const simulationId = typeof body.simulationId === "string" ? body.simulationId : null;
  const simulation =
    simulationId
      ? await prisma.loanSimulation.findUnique({ where: { id: simulationId } })
      : await prisma.loanSimulation.create({
          data: {
            projectAmountCents: toCents(body.projectAmount),
            contributionCents: toCents(body.contributionAmount),
            usage: typeof body.usage === "string" ? body.usage : "MAIN_RESIDENCE",
            propertyState: typeof body.propertyState === "string" ? body.propertyState : "OLD",
            notaryFeesCents: toCents(body.notaryFees),
            annualIncomeCents: toCents(body.annualIncome),
            annualChargesCents: toCents(body.annualCharges),
            borrowerCount: 0,
            ageRetained: toNumber(body.ageRetained) || 0,
            durationMonths: toDurationMonths(body.duration),
            dpeGroup: readDpeGroup(body.dpeGroup),
            rateType: typeof body.rateType === "string" ? body.rateType : "fixed",
          },
        });

  if (!simulation) {
    return NextResponse.json({ ok: false, message: "Simulation introuvable." }, { status: 404 });
  }

  const createdBorrower = existingBorrower ?? await prisma.borrower.create({
    data: {
      civility: typeof borrower.civility === "string" ? borrower.civility : "",
      lastName: typeof borrower.lastName === "string" ? borrower.lastName : "",
      firstName: typeof borrower.firstName === "string" ? borrower.firstName : "",
      birthDate: birthDate as Date,
      mobile,
      email,
    },
  });

  await prisma.loanSimulationBorrower.upsert({
    where: {
      simulationId_borrowerId: {
        simulationId: simulation.id,
        borrowerId: createdBorrower.id,
      },
    },
    update: {},
    create: {
      simulationId: simulation.id,
      borrowerId: createdBorrower.id,
    },
  });

  const borrowerCount = await prisma.loanSimulationBorrower.count({ where: { simulationId: simulation.id } });

  await prisma.loanSimulation.update({
    where: { id: simulation.id },
    data: { borrowerCount },
  });

  return NextResponse.json({
    ok: true,
    simulationId: simulation.id,
    borrower: {
      id: createdBorrower.id,
      civility: createdBorrower.civility,
      lastName: createdBorrower.lastName,
      firstName: createdBorrower.firstName,
      birthDate: formatFrenchBirthDate(createdBorrower.birthDate),
      mobile: createdBorrower.mobile,
      email: createdBorrower.email,
    },
  });
}

export async function PATCH(request: NextRequest) {
  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  const borrower = body?.borrower as Record<string, unknown> | undefined;
  const borrowerId = typeof body?.borrowerId === "string" ? body.borrowerId : "";

  if (!borrowerId || !borrower) {
    return NextResponse.json({ ok: false, message: "Emprunteur invalide." }, { status: 400 });
  }

  const email = typeof borrower.email === "string" ? borrower.email.trim() : "";
  const mobile = typeof borrower.mobile === "string" ? borrower.mobile.trim() : "";
  const birthDate = typeof borrower.birthDate === "string" ? parseFrenchBirthDate(borrower.birthDate) : null;

  if (!email || !isValidEmail(email) || !isFrenchMobileNumber(mobile) || !birthDate) {
    return NextResponse.json({ ok: false, message: "Informations emprunteur invalides." }, { status: 400 });
  }

  const existingBorrower = await prisma.borrower.findFirst({
    where: {
      id: {
        not: borrowerId,
      },
      email: {
        equals: email,
        mode: "insensitive",
      },
    },
  });

  if (existingBorrower) {
    return NextResponse.json({ ok: false, message: "Cet email existe deja en base." }, { status: 409 });
  }

  const updatedBorrower = await prisma.borrower.update({
    where: { id: borrowerId },
    data: {
      civility: typeof borrower.civility === "string" ? borrower.civility : "",
      lastName: typeof borrower.lastName === "string" ? borrower.lastName : "",
      firstName: typeof borrower.firstName === "string" ? borrower.firstName : "",
      birthDate,
      mobile,
      email,
    },
  });

  return NextResponse.json({
    ok: true,
    borrower: {
      id: updatedBorrower.id,
      civility: updatedBorrower.civility,
      lastName: updatedBorrower.lastName,
      firstName: updatedBorrower.firstName,
      birthDate: formatFrenchBirthDate(updatedBorrower.birthDate),
      mobile: updatedBorrower.mobile,
      email: updatedBorrower.email,
    },
  });
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

function formatFrenchBirthDate(date: Date) {
  return new Intl.DateTimeFormat("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric" }).format(date);
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
