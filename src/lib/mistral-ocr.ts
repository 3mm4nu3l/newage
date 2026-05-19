type MistralOcrPage = {
  index?: number;
  markdown?: string;
  tables?: Array<{
    id?: string;
    content?: string;
  }>;
};

type MistralOcrResponse = {
  model?: string;
  pages?: MistralOcrPage[];
  usage_info?: unknown;
};

export async function extractPdfMarkdownWithMistral(file: File) {
  const buffer = Buffer.from(await file.arrayBuffer());
  return extractDataUrlMarkdownWithMistral(`data:${file.type || "application/pdf"};base64,${buffer.toString("base64")}`, "document_url", buildRateExtractionPrompt());
}

export async function extractImageMarkdownWithMistral(buffer: Buffer, mimeType: string) {
  return extractDataUrlMarkdownWithMistral(`data:${mimeType};base64,${buffer.toString("base64")}`, "image_url", buildRateExtractionPrompt());
}

async function extractDataUrlMarkdownWithMistral(dataUrl: string, documentType: "document_url" | "image_url", prompt?: string) {
  const apiKey = process.env.MISTRAL_API_KEY;

  if (!apiKey) {
    throw new Error("MISTRAL_API_KEY manquant dans les variables d'environnement.");
  }

  const response = await fetch("https://api.mistral.ai/v1/ocr", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "mistral-ocr-latest",
      document: {
        type: documentType,
        [documentType]: dataUrl,
      },
      table_format: "markdown",
      extract_header: true,
      extract_footer: true,
      include_image_base64: false,
      ...(prompt ? { prompt } : {}),
    }),
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new Error(`Mistral OCR a échoué (${response.status})${detail ? ` : ${detail.slice(0, 600)}` : ""}`);
  }

  const payload = (await response.json()) as MistralOcrResponse;
  const markdown = (payload.pages || [])
    .sort((a, b) => (a.index ?? 0) - (b.index ?? 0))
    .map(pageToMarkdown)
    .filter(Boolean)
    .join("\n\n---\n\n");

  if (!markdown.trim()) {
    throw new Error("Mistral n'a retourné aucun Markdown exploitable.");
  }

  return {
    markdown,
    model: payload.model || "mistral-ocr-latest",
    rawResponse: payload as Record<string, unknown>,
  };
}

function buildRateExtractionPrompt() {
  return `Extrais ce barème bancaire directement en Markdown clair.

Règles :
- Retourne uniquement du Markdown.
- Mets les grilles de taux en tableaux Markdown lisibles.
- Ne renvoie pas de liens vers des fichiers tbl-x.md : insère le contenu des tableaux directement.
- Corrige les erreurs OCR évidentes de libellés, sans inventer de taux.
- Pour les taux par revenus, privilégie ce format :
| Revenus | ≤ 10 ans | ≤ 12 ans | ≤ 15 ans | ≤ 17 ans | ≤ 20 ans | ≤ 25 ans |
| --- | --- | --- | --- | --- | --- | --- |
| 1 personne | | | | | | |
| 120K€+ | 3,02% | ... |
| 2 personnes et + | | | | | | |
- Mets les prêts relais, prêts in fine, bonifications, décotes et majorations dans des tableaux séparés.
- Ajoute les notes importantes sous les tableaux.`;
}

function pageToMarkdown(page: MistralOcrPage) {
  const pageMarkdown = page.markdown?.trim() || "";
  const tableMarkdown = (page.tables || [])
    .map((table) => table.content?.trim())
    .filter(Boolean)
    .join("\n\n");

  if (!tableMarkdown) {
    return pageMarkdown;
  }

  const onlyTableLinks = pageMarkdown
    .split(/\r?\n/)
    .filter(Boolean)
    .every((line) => /^\[[^\]]+\.md\]\([^)]+\.md\)$/.test(line.trim()));

  return onlyTableLinks || !pageMarkdown ? tableMarkdown : `${pageMarkdown}\n\n${tableMarkdown}`;
}
