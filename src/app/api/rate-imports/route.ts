import { NextRequest, NextResponse } from "next/server";
import { extractPdfMarkdownWithMistral } from "@/lib/mistral-ocr";
import { createRateSheetDraftFromMarkdown } from "@/lib/rate-importer";

export const runtime = "nodejs";
export const maxDuration = 120;

const maxFileSize = 25 * 1024 * 1024;

export async function POST(request: NextRequest) {
  const formData = await request.formData().catch(() => null);
  const file = formData?.get("file");

  if (!(file instanceof File)) {
    return NextResponse.json({ ok: false, message: "PDF manquant." }, { status: 400 });
  }

  if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
    return NextResponse.json({ ok: false, message: "Seuls les fichiers PDF sont acceptés." }, { status: 400 });
  }

  if (file.size > maxFileSize) {
    return NextResponse.json({ ok: false, message: "PDF trop volumineux. Limite actuelle : 25 Mo." }, { status: 413 });
  }

  try {
    const ocr = await extractPdfMarkdownWithMistral(file);
    const result = await createRateSheetDraftFromMarkdown({
      fileName: file.name,
      fileSize: file.size,
      mimeType: file.type || "application/pdf",
      markdown: ocr.markdown,
      rawResponse: ocr.rawResponse,
      providerModel: ocr.model,
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
