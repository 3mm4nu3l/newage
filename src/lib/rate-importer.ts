import { CustomerType, LoanType, Prisma, RateImportStatus, RateSheetStatus } from "@prisma/client";
import { prisma } from "@/lib/db";

type ImportResult = {
  importId: string;
  bankName: string;
  rateSheetId: string;
  markdown: string;
  extractedRules: number;
};

type ParsedRule = {
  label: string;
  profileLabel: string;
  durationMaxMonths: number | null;
  baseRateBps: number;
  rawCriteria: Prisma.InputJsonValue;
};

export async function createRateSheetDraftFromMarkdown(input: {
  fileName: string;
  fileSize: number;
  mimeType: string;
  markdown: string;
  rawResponse?: Record<string, unknown>;
  providerModel: string;
}): Promise<ImportResult> {
  const importRow = await prisma.rateImport.create({
    data: {
      fileName: input.fileName,
      fileSize: input.fileSize,
      mimeType: input.mimeType,
      providerModel: input.providerModel,
      status: RateImportStatus.PROCESSING,
    },
  });

  try {
    const bankName = inferBankName(input.markdown, input.fileName);
    const effectiveDate = inferEffectiveDate(input.markdown);
    const title = inferTitle(input.markdown, input.fileName);
    const month = effectiveDate.toISOString().slice(0, 7);

    const bank = await prisma.bank.upsert({
      where: { slug: slugify(bankName) },
      create: {
        name: bankName,
        slug: slugify(bankName),
      },
      update: {
        name: bankName,
        isActive: true,
      },
    });

    const sheet = await prisma.rateSheet.upsert({
      where: {
        bankId_month_title: {
          bankId: bank.id,
          month,
          title,
        },
      },
      create: {
        bankId: bank.id,
        title,
        month,
        effectiveDate,
        sourceFile: input.fileName,
        status: RateSheetStatus.DRAFT,
        notes: "Brouillon généré par OCR Mistral. À relire avant publication.",
      },
      update: {
        effectiveDate,
        sourceFile: input.fileName,
        status: RateSheetStatus.DRAFT,
        notes: "Brouillon mis à jour par OCR Mistral. À relire avant publication.",
      },
    });

    await prisma.rateRule.deleteMany({ where: { rateSheetId: sheet.id } });
    await prisma.rateDisplayBlock.deleteMany({ where: { rateSheetId: sheet.id } });

    await prisma.rateDisplayBlock.create({
      data: {
        rateSheetId: sheet.id,
        order: 1,
        kind: "ocr_markdown",
        title: "Extraction Markdown Mistral",
        payload: {
          markdown: input.markdown,
          sourceFile: input.fileName,
        },
      },
    });

    const rules = extractRateRulesFromMarkdown(input.markdown);

    if (rules.length) {
      await prisma.rateRule.createMany({
        data: rules.map((rule, index) => ({
          rateSheetId: sheet.id,
          label: rule.label,
          profileLabel: rule.profileLabel,
          customerType: CustomerType.ALL,
          loanType: inferLoanType(rule.label),
          durationMaxMonths: rule.durationMaxMonths,
          baseRateBps: rule.baseRateBps,
          priority: 200 + index,
          rawCriteria: rule.rawCriteria,
        })),
      });
    }

    await prisma.rateImport.update({
      where: { id: importRow.id },
      data: {
        rateSheetId: sheet.id,
        status: RateImportStatus.DRAFT_CREATED,
        markdown: input.markdown,
        extractedRules: rules.length,
        rawResponse: input.rawResponse as Prisma.InputJsonValue,
      },
    });

    return {
      importId: importRow.id,
      bankName,
      rateSheetId: sheet.id,
      markdown: input.markdown,
      extractedRules: rules.length,
    };
  } catch (error) {
    await prisma.rateImport.update({
      where: { id: importRow.id },
      data: {
        status: RateImportStatus.FAILED,
        markdown: input.markdown,
        rawResponse: input.rawResponse as Prisma.InputJsonValue,
        errorMessage: error instanceof Error ? error.message : "Erreur import inconnue.",
      },
    });
    throw error;
  }
}

function extractRateRulesFromMarkdown(markdown: string): ParsedRule[] {
  const rules: ParsedRule[] = [];
  const tables = extractMarkdownTableBlocks(markdown);

  for (const table of tables) {
    const rows = normalizeMarkdownTableLines(table)
      .map((line) => line.trim())
      .filter((line) => line.startsWith("|") && line.endsWith("|"))
      .map(parseMarkdownCells)
      .filter((cells) => cells.length >= 2);

    if (rows.length < 3) {
      continue;
    }

    const tableRows = rows.filter((cells) => !isSeparatorRow(cells));
    const firstRateRowIndex = tableRows.findIndex((cells) => cells.filter((cell) => parseRateBps(cell) !== null).length >= 2);
    const headerCandidates = firstRateRowIndex > 0 ? tableRows.slice(0, firstRateRowIndex) : [tableRows[0]];
    const headerRows = headerCandidates.filter((cells) => cells.some((cell) => /durée|ans|mois|relais|taux|€/i.test(cell)));
    const headers = mergeHeaders(headerRows.length ? headerRows : [headerCandidates[headerCandidates.length - 1] || tableRows[0]]);
    const bodyRows = firstRateRowIndex >= 0 ? tableRows.slice(firstRateRowIndex) : tableRows.slice(1);

    for (const row of bodyRows) {
      const profile = row.slice(0, 3).filter(Boolean).join(" / ") || row[0] || "Profil non identifié";

      row.forEach((cell, index) => {
        const rateBps = parseRateBps(cell);
        if (rateBps === null || index === 0) {
          return;
        }

        const durationLabel = headers[index] || `Colonne ${index + 1}`;
        rules.push({
          label: `${profile} - ${durationLabel}`,
          profileLabel: profile,
          durationMaxMonths: inferDurationMaxMonths(durationLabel),
          baseRateBps: rateBps,
          rawCriteria: {
            source: "mistral_ocr_markdown",
            tableHeader: headers,
            row,
            durationLabel,
            displayRate: cell,
          },
        });
      });
    }
  }

  return dedupeRules(rules).slice(0, 250);
}

function extractMarkdownTableBlocks(markdown: string) {
  const blocks: string[] = [];
  let current: string[] = [];

  for (const line of markdown.split(/\r?\n/)) {
    const trimmed = line.trim();

    if (trimmed.startsWith("|") || (current.length && trimmed && !trimmed.startsWith("#"))) {
      current.push(line);
      continue;
    }

    if (current.length) {
      blocks.push(current.join("\n"));
      current = [];
    }
  }

  if (current.length) {
    blocks.push(current.join("\n"));
  }

  return blocks.filter((block) => block.includes("| ---"));
}

function normalizeMarkdownTableLines(table: string) {
  const lines: string[] = [];

  for (const line of table.split(/\r?\n/)) {
    const trimmed = line.trim();

    if (!trimmed) {
      continue;
    }

    if (trimmed.startsWith("|")) {
      lines.push(trimmed);
      continue;
    }

    if (lines.length) {
      lines[lines.length - 1] = `${lines[lines.length - 1]} ${trimmed}`;
    }
  }

  return lines;
}

function parseMarkdownCells(line: string) {
  return line
    .replace(/^\|/, "")
    .replace(/\|$/, "")
    .split("|")
    .map((cell) => cell.replace(/\*\*/g, "").replace(/&nbsp;/g, " ").trim());
}

function isSeparatorRow(cells: string[]) {
  return cells.every((cell) => /^:?-{3,}:?$/.test(cell.replace(/\s/g, "")));
}

function mergeHeaders(rows: string[][]) {
  const max = Math.max(...rows.map((row) => row.length));
  return Array.from({ length: max }, (_, index) =>
    rows
      .map((row) => row[index])
      .filter(Boolean)
      .join(" ")
      .replace(/\s+/g, " ")
      .trim(),
  );
}

function parseRateBps(value: string) {
  const match = value.match(/(\d{1,2})\s*[,.]\s*(\d{1,3})\s*%?/);

  if (!match) {
    return null;
  }

  const normalized = Number(`${match[1]}.${match[2]}`);
  return Number.isFinite(normalized) && normalized >= 0.1 && normalized <= 15 ? Math.round(normalized * 100) : null;
}

function inferDurationMaxMonths(label: string) {
  const lower = label.toLowerCase();

  if (lower.includes("relais")) {
    return 24;
  }

  const numbers = [...lower.matchAll(/(\d{1,3})\s*(?:ans|an|mois)?/g)].map((match) => Number(match[1]));

  if (!numbers.length) {
    return null;
  }

  const max = Math.max(...numbers);
  return lower.includes("mois") && max > 25 ? max : max * 12;
}

function inferLoanType(label: string) {
  const lower = label.toLowerCase();

  if (lower.includes("relais")) {
    return LoanType.BRIDGE_PARTIAL;
  }

  if (lower.includes("in fine")) {
    return LoanType.IN_FINE;
  }

  if (lower.includes("révis") || lower.includes("revis")) {
    return LoanType.VARIABLE;
  }

  return LoanType.AMORTIZING;
}

function dedupeRules(rules: ParsedRule[]) {
  const seen = new Set<string>();
  return rules.filter((rule) => {
    const key = `${rule.label}:${rule.baseRateBps}:${rule.durationMaxMonths ?? ""}`;
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
}

function inferBankName(markdown: string, fileName: string) {
  const source = `${fileName}\n${markdown.slice(0, 1500)}`;
  const knownBanks = [
    "Société Générale",
    "Banque Populaire Rives de Paris",
    "Banque Populaire Val de France",
    "Banque Populaire Bourgogne Franche-Comté",
    "BNP Paribas",
    "Hello bank!",
    "BRED Métropole",
    "Caisse d'Épargne IDF",
    "Crédit Agricole Brie Picardie",
    "Crédit Agricole IDF",
    "Crédit Agricole Sud Rhône Alpes",
    "La Banque Postale",
    "Fortuneo",
    "Palatine",
    "CCF",
    "BCP",
    "LCL",
  ];
  const normalized = normalize(source);
  const match = knownBanks.find((bank) => normalized.includes(normalize(bank)));

  if (match) {
    return match;
  }

  const title = markdown.match(/^#\s+(.+)$/m)?.[1]?.replace(/barème|bareme|taux/gi, "").trim();
  return title || fileName.replace(/\.[^.]+$/, "").replace(/bar[eè]me/gi, "").trim() || "Banque à identifier";
}

function inferTitle(markdown: string, fileName: string) {
  return markdown.match(/^#\s+(.+)$/m)?.[1]?.trim() || fileName.replace(/\.[^.]+$/, "");
}

function inferEffectiveDate(markdown: string) {
  const text = markdown.slice(0, 3000);
  const numeric = text.match(/(\d{1,2})[/-](\d{1,2})[/-](20\d{2})/);

  if (numeric) {
    return new Date(Date.UTC(Number(numeric[3]), Number(numeric[2]) - 1, Number(numeric[1])));
  }

  const monthMatch = text.match(/(\d{1,2})?\s*(janvier|février|fevrier|mars|avril|mai|juin|juillet|août|aout|septembre|octobre|novembre|décembre|decembre)\s+(20\d{2})/i);

  if (monthMatch) {
    const month = monthIndex(monthMatch[2]);
    return new Date(Date.UTC(Number(monthMatch[3]), month, Number(monthMatch[1] || 1)));
  }

  return new Date();
}

function monthIndex(month: string) {
  const months = ["janvier", "février", "fevrier", "mars", "avril", "mai", "juin", "juillet", "août", "aout", "septembre", "octobre", "novembre", "décembre", "decembre"];
  const index = months.findIndex((item) => item === month.toLowerCase());

  if (index <= 1) {
    return index;
  }

  if (index >= 2) {
    return index - 1;
  }

  return 0;
}

function slugify(value: string) {
  return normalize(value)
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function normalize(value: string) {
  return value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase();
}
