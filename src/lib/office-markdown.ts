import mammoth from "mammoth";

type WordExtractorModule = {
  default?: new () => {
    extract(buffer: Buffer): Promise<{ getBody(): string }>;
  };
};

const docxMime = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
const docMime = "application/msword";

export function isOfficeRateFile(file: File) {
  const name = file.name.toLowerCase();
  return file.type === docxMime || file.type === docMime || name.endsWith(".docx") || name.endsWith(".doc");
}

export async function extractOfficeMarkdown(file: File) {
  const buffer = Buffer.from(await file.arrayBuffer());
  const name = file.name.toLowerCase();

  if (file.type === docxMime || name.endsWith(".docx")) {
    const result = await mammoth.convertToHtml({ buffer });
    return {
      markdown: htmlToMarkdown(result.value),
      model: "mammoth-docx",
      rawResponse: {
        messages: result.messages,
      },
    };
  }

  const WordExtractor = ((await import("word-extractor")) as WordExtractorModule).default;

  if (!WordExtractor) {
    throw new Error("Extracteur .doc indisponible.");
  }

  const extractor = new WordExtractor();
  const document = await extractor.extract(buffer);

  return {
    markdown: textToMarkdown(document.getBody()),
    model: "word-extractor-doc",
    rawResponse: {
      mode: "legacy-doc-text",
    },
  };
}

function htmlToMarkdown(html: string) {
  return html
    .replace(/<table[^>]*>([\s\S]*?)<\/table>/gi, (_, table) => tableToMarkdown(table))
    .replace(/<h([1-6])[^>]*>([\s\S]*?)<\/h\1>/gi, (_, level, content) => `${"#".repeat(Number(level))} ${cleanHtml(content)}\n\n`)
    .replace(/<p[^>]*>([\s\S]*?)<\/p>/gi, (_, content) => `${cleanHtml(content)}\n\n`)
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function tableToMarkdown(tableHtml: string) {
  const rows = [...tableHtml.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/gi)]
    .map((match) =>
      [...match[1].matchAll(/<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi)]
        .map((cell) => cleanHtml(cell[1]))
        .map((cell) => cell.replace(/\|/g, "/").trim()),
    )
    .filter((row) => row.length);

  if (!rows.length) {
    return "";
  }

  const width = Math.max(...rows.map((row) => row.length));
  const normalizedRows = rows.map((row) => [...row, ...Array.from({ length: width - row.length }, () => "")]);
  const separator = Array.from({ length: width }, () => "---");

  return [normalizedRows[0], separator, ...normalizedRows.slice(1)].map((row) => `| ${row.join(" | ")} |`).join("\n") + "\n\n";
}

function cleanHtml(value: string) {
  return value
    .replace(/<br\s*\/?>/gi, " ")
    .replace(/<\/p>\s*<p[^>]*>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/\s+/g, " ")
    .trim();
}

function textToMarkdown(text: string) {
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .join("\n")
    .replace(/\n{3,}/g, "\n\n");
}
