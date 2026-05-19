import { NextRequest, NextResponse } from "next/server";
import { extractPdfMarkdownWithMistral } from "@/lib/mistral-ocr";
import { normalizeRateMarkdownWithMistral } from "@/lib/mistral-normalize";
import { extractOfficeMarkdown, isOfficeRateFile } from "@/lib/office-markdown";
import { createRateSheetDraftFromMarkdown } from "@/lib/rate-importer";

export const runtime = "nodejs";
export const maxDuration = 120;

const maxFileSize = 25 * 1024 * 1024;

export async function POST(request: NextRequest) {
  const formData = await request.formData().catch(() => null);
  const file = formData?.get("file");

  if (!(file instanceof File)) {
    return NextResponse.json({ ok: false, message: "Fichier manquant." }, { status: 400 });
  }

  const isPdf = file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");

  if (!isPdf && !isOfficeRateFile(file)) {
    return NextResponse.json({ ok: false, message: "Formats acceptés : PDF, DOCX, DOC." }, { status: 400 });
  }

  if (file.size > maxFileSize) {
    return NextResponse.json({ ok: false, message: "PDF trop volumineux. Limite actuelle : 25 Mo." }, { status: 413 });
  }

  try {
    const ocr = isPdf ? await extractPdfMarkdownWithMistral(file) : await extractOfficeMarkdown(file);
    const normalized = await normalizeMarkdownSafely(ocr.markdown);
    const result = await createRateSheetDraftFromMarkdown({
      fileName: file.name,
      fileSize: file.size,
      mimeType: file.type || inferMimeType(file.name),
      markdown: normalized.markdown,
      rawResponse: {
        extraction: ocr.rawResponse,
        normalization: normalized.rawResponse,
        rawMarkdown: ocr.markdown,
        normalizationError: normalized.error,
      },
      providerModel: `${ocr.model}+${normalized.model}`,
    });

    return NextResponse.json({
      ok: true,
      message: `Brouillon créé pour ${result.bankName}. ${result.extractedRules} taux détectés.`,
      ...result,
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        message: error instanceof Error ? error.message : "Import OCR impossible.",
      },
      { status: 500 },
    );
  }
}

async function normalizeMarkdownSafely(markdown: string) {
  try {
    const normalized = await normalizeRateMarkdownWithMistral(markdown);
    return {
      ...normalized,
      error: null,
    };
  } catch (error) {
    return {
      markdown,
      model: "raw-markdown",
      rawResponse: null,
      error: error instanceof Error ? error.message : "Normalisation impossible.",
    };
  }
}

function inferMimeType(fileName: string) {
  const lower = fileName.toLowerCase();

  if (lower.endsWith(".docx")) {
    return "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
  }

  if (lower.endsWith(".doc")) {
    return "application/msword";
  }

  return "application/pdf";
}
