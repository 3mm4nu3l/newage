type MistralChatResponse = {
  choices?: Array<{
    message?: {
      content?: MistralMessageContent;
    };
  }>;
};

type MistralMessageContent = string | Array<{ type?: string; text?: string }> | undefined;

export async function normalizeRateMarkdownWithMistral(markdown: string) {
  const apiKey = process.env.MISTRAL_API_KEY;

  if (!apiKey) {
    throw new Error("MISTRAL_API_KEY manquant dans les variables d'environnement.");
  }

  const model = process.env.MISTRAL_NORMALIZE_MODEL || "mistral-small-latest";
  const response = await fetch("https://api.mistral.ai/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      temperature: 0,
      max_tokens: 4000,
      messages: [
        {
          role: "system",
          content:
            "Tu restructures des barèmes bancaires OCR en Markdown propre. Tu ne dois pas inventer de taux. Tu conserves uniquement les informations visibles dans l'entrée. Réponds uniquement en Markdown, sans commentaire.",
        },
        {
          role: "user",
          content: buildNormalizationPrompt(markdown),
        },
      ],
    }),
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new Error(`Normalisation Mistral échouée (${response.status})${detail ? ` : ${detail.slice(0, 600)}` : ""}`);
  }

  const payload = (await response.json()) as MistralChatResponse;
  const content = payload.choices?.[0]?.message?.content;
  const normalized = extractTextContent(content).trim();

  if (!normalized.includes("|") || !normalized.includes("---")) {
    throw new Error("Mistral n'a pas retourné de tableau Markdown exploitable.");
  }

  return {
    markdown: stripMarkdownFence(normalized),
    model,
    rawResponse: payload as Record<string, unknown>,
  };
}

function buildNormalizationPrompt(markdown: string) {
  return `Convertis ce barème OCR en Markdown standardisé.

Règles obligatoires :
- Mets la grille principale dans un tableau clair.
- Si le document contient des revenus 1 personne et 2 personnes et +, sépare-les comme ceci :
  | Revenus | ≤ 10 ans | ≤ 12 ans | ... |
  | 1 personne | | | |
  | 120K€+ | 3,02% | ... |
  | 2 personnes et + | | | |
  | 120K€+ | 3,02% | ... |
- Mets les prêts relais, prêts in fine, majorations et décotes dans un tableau séparé : | Type | Taux |
- Garde les notes utiles sous les tableaux en Markdown.
- Corrige seulement les erreurs OCR évidentes de libellé, pas les taux.
- Ne duplique pas les lignes.
- Ne renvoie aucun texte d'explication hors Markdown.

OCR brut :

${markdown.slice(0, 18000)}`;
}

function extractTextContent(content: MistralMessageContent) {
  if (typeof content === "string") {
    return content;
  }

  if (Array.isArray(content)) {
    return content.map((chunk) => (chunk.type === "text" || !chunk.type ? chunk.text || "" : "")).join("");
  }

  return "";
}

function stripMarkdownFence(value: string) {
  return value
    .replace(/^```(?:markdown|md)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();
}
