"use client";

import Image from "next/image";
import { Plus, Search, SlidersHorizontal } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { getBankInitials, getBankLogo } from "@/lib/bank-logos";
import { formatRate, RateRow } from "@/lib/rates";

type RatesTableProps = {
  rows: RateRow[];
};

type PostalMatrixRow = {
  durationLabel: string;
  durationYears: number;
  clientMin: number | null;
  clientAverage: number | null;
  prospectMin: number | null;
  prospectAverage: number | null;
};

type SgDurationKey = "relais" | "threeToSeven" | "sevenToTen" | "tenToTwelve" | "twelveToFifteen" | "fifteenToSeventeen" | "seventeenToTwenty" | "twentyToTwentyFive";

type SgMatrixRow = {
  profile: string;
  singleBorrowerIncome: string;
  twoBorrowerIncome: string;
  rates: Record<SgDurationKey, number | null>;
};

type SgInsuranceRow = {
  age: string;
  acquirerShort: string;
  acquirerLong: string;
  investorShort: string;
  investorLong: string;
};

type PalatineMatrixRow = {
  durationLabel: string;
  durationYears: number;
  rpRs: number | null;
  il: number | null;
  pmPat: number | null;
};

type CaidfMatrixRow = {
  durationLabel: string;
  durationYears: number;
  premium: number | null;
  particulier: number | null;
};

type FortuneoMatrixRow = {
  durationLabel: string;
  durationYears: number;
  profileA: number | null;
  profileB: number | null;
  profileC: number | null;
};

type CasraMatrixRow = {
  profile: string;
  singleBorrowerIncome: string;
  twoBorrowerIncome: string;
  rates: Record<string, number | null>;
};

type CeidfMatrixRow = {
  profile: string;
  dpe: string;
  rates: Record<string, number | null>;
};

type BredMatrixRow = {
  durationLabel: string;
  durationYears: number;
  bareme1: number | null;
  bareme2: number | null;
  bareme3: number | null;
  bareme4: number | null;
};

type GenericMatrixRow = {
  label: string;
  sortValue: number;
  rates: Record<string, number | null>;
};

type CeidfCustomerKey = "prospect" | "client";

type PalatineScaleKey = "patrimoniale" | "banquePrivee";

type BprpTapKey = "tapLt20" | "tap20To30" | "tapGte30";

type BprpMatrixRow = {
  durationLabel: string;
  durationYears: number;
  incomeLt30: number | null;
  incomeGte30: number | null;
  incomeGte60: number | null;
};

type CcfDurationKey = "relais" | "twoToSeven" | "sevenToTen" | "tenToFifteen" | "fifteenToTwenty" | "twentyToTwentyFive";

type CcfMatrixRow = {
  profile: string;
  note?: string;
  rates: Record<CcfDurationKey, number | null>;
};

export function RatesTable({ rows }: RatesTableProps) {
  const [query, setQuery] = useState("");
  const partners = useMemo(() => Array.from(new Set(rows.map((row) => row.bank))).sort(), [rows]);
  const [activeBank, setActiveBank] = useState(partners[0] || "");
  const [importStatus, setImportStatus] = useState<"idle" | "uploading" | "success" | "error">("idle");
  const [importMessage, setImportMessage] = useState("");
  const [activeBprpTab, setActiveBprpTab] = useState<BprpTapKey>("tapLt20");
  const [activePalatineTab, setActivePalatineTab] = useState<PalatineScaleKey>("patrimoniale");
  const [activeCeidfTab, setActiveCeidfTab] = useState<CeidfCustomerKey>("prospect");
  const bankTabsRef = useRef<HTMLDivElement>(null);
  const [bankTabsScroll, setBankTabsScroll] = useState(0);
  const [bankTabsMaxScroll, setBankTabsMaxScroll] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const bankTabs = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return partners.filter((partner) => {
      if (!normalizedQuery) {
        return true;
      }

      const partnerRows = rows.filter((row) => row.bank === partner);
      return [partner, ...partnerRows.flatMap((row) => [row.region, row.profile, row.scale, row.customerType])]
        .join(" ")
        .toLowerCase()
        .includes(normalizedQuery);
    });
  }, [query, rows]);

  const selectedBank = bankTabs.includes(activeBank) ? activeBank : bankTabs[0] || activeBank;
  const bankTabsPages = Math.max(1, Math.ceil(bankTabs.length / 8));
  const activeBankTabsPage = bankTabsMaxScroll ? Math.round((bankTabsScroll / bankTabsMaxScroll) * (bankTabsPages - 1)) : 0;
  const updateBankTabsScroll = useCallback(() => {
    const node = bankTabsRef.current;

    if (!node) {
      return;
    }

    setBankTabsScroll(node.scrollLeft);
    setBankTabsMaxScroll(Math.max(0, node.scrollWidth - node.clientWidth));
  }, []);

  useEffect(() => {
    updateBankTabsScroll();

    window.addEventListener("resize", updateBankTabsScroll);
    return () => window.removeEventListener("resize", updateBankTabsScroll);
  }, [bankTabs.length, updateBankTabsScroll]);

  const selectedRows = useMemo(() => {
    return rows
      .filter((row) => row.bank === selectedBank)
      .sort((a, b) => {
        if (a.durationYears !== b.durationYears) {
          return a.durationYears - b.durationYears;
        }

        return (a.rate ?? Number.POSITIVE_INFINITY) - (b.rate ?? Number.POSITIVE_INFINITY);
      });
  }, [rows, selectedBank]);
  const importedMarkdown = selectedRows.find((row) => row.importedMarkdown)?.importedMarkdown;

  const isSocieteGeneraleBank = selectedBank === "Société Générale";
  const isBprpBank = selectedBank === "Banque Populaire Rives de Paris";
  const isBpvfBank = selectedBank === "Banque Populaire Val de France";
  const isBnpBank = selectedBank === "BNP Paribas" || selectedBank === "Hello bank!";
  const isBpbfcBank = selectedBank === "Banque Populaire Bourgogne Franche-Comté";
  const isBredBank = selectedBank === "BRED Métropole";
  const isBcpBank = selectedBank === "BCP";
  const isCeidfBank = selectedBank === "Caisse d'Épargne IDF";
  const isCaidfBank = selectedBank === "Crédit Agricole IDF";
  const isCabpBank = selectedBank === "Crédit Agricole Brie Picardie";
  const isCasraBank = selectedBank === "Crédit Agricole Sud Rhône Alpes";
  const isFortuneoBank = selectedBank === "Fortuneo";
  const isPalatineBank = selectedBank === "Palatine";
  const isPostalBank = selectedBank === "La Banque Postale";
  const isCcfBank = selectedBank === "CCF";
  const sgRows = useMemo(() => createSgMatrix(selectedRows), [selectedRows]);
  const bnpRows = useMemo(() => createGenericMatrix(selectedRows, "profile"), [selectedRows]);
  const bpbfcTables = useMemo(() => createScaleTables(selectedRows, "profile"), [selectedRows]);
  const bprpRows = useMemo(() => createBprpMatrix(selectedRows, activeBprpTab), [selectedRows, activeBprpTab]);
  const bredRows = useMemo(() => createBredMatrix(selectedRows), [selectedRows]);
  const bcpRows = useMemo(() => createGenericMatrix(selectedRows, "duration"), [selectedRows]);
  const ceidfRows = useMemo(() => createCeidfMatrix(selectedRows, activeCeidfTab), [selectedRows, activeCeidfTab]);
  const caidfRows = useMemo(() => createCaidfMatrix(selectedRows), [selectedRows]);
  const cabpTables = useMemo(() => createScaleTables(selectedRows, "profile"), [selectedRows]);
  const casraTables = useMemo(() => createCasraMatrixTables(selectedRows), [selectedRows]);
  const fortuneoRows = useMemo(() => createFortuneoMatrix(selectedRows), [selectedRows]);
  const palatineRows = useMemo(() => createPalatineMatrix(selectedRows, activePalatineTab), [selectedRows, activePalatineTab]);
  const postalRows = useMemo(() => createPostalMatrix(selectedRows), [selectedRows]);
  const ccfRows = useMemo(() => createCcfMatrix(selectedRows), [selectedRows]);
  const latestUpdate = getLatestUpdateDate(selectedRows);
  const rowCountLabel = isSocieteGeneraleBank
    ? `${sgRows.length} tranches de revenus pour ${selectedBank}`
    : isBprpBank
      ? `${bprpRows.length} durées pour ${selectedBank}`
    : isBpvfBank
      ? `${selectedRows.length} durées pour ${selectedBank}`
    : isBnpBank
      ? `${bnpRows.length} tranches de revenus pour ${selectedBank}`
    : isBpbfcBank
      ? `${selectedRows.length} taux pour ${selectedBank}`
    : isBredBank
      ? `${bredRows.length} durées pour ${selectedBank}`
    : isBcpBank
      ? `${bcpRows.length} lignes pour ${selectedBank}`
    : isCeidfBank
      ? `${ceidfRows.length} lignes de taux pour ${selectedBank}`
    : isCaidfBank
      ? `${caidfRows.length} durées pour ${selectedBank}`
    : isCabpBank
      ? `${selectedRows.length} taux pour ${selectedBank}`
    : isCasraBank
      ? `${selectedRows.length} taux pour ${selectedBank}`
    : isFortuneoBank
      ? `${fortuneoRows.length} durées pour ${selectedBank}`
    : isPalatineBank
      ? `${palatineRows.length} durées amortissables pour ${selectedBank}`
    : isPostalBank
    ? `${postalRows.length} lignes de durées pour ${selectedBank}`
    : isCcfBank
      ? `${ccfRows.length} tranches pour ${selectedBank}`
      : `${selectedRows.length} lignes pour ${selectedBank}`;

  const handleRateImport = async (file: File | undefined) => {
    if (!file) {
      return;
    }

    setImportStatus("uploading");
    setImportMessage(`Extraction de ${file.name} en cours...`);

    const formData = new FormData();
    formData.append("file", file);

    try {
      const response = await fetch("/api/rate-imports", {
        method: "POST",
        body: formData,
      });
      const payload = (await response.json().catch(() => null)) as { ok?: boolean; message?: string; bankName?: string; extractedRules?: number } | null;

      if (!response.ok || !payload?.ok) {
        throw new Error(payload?.message || "Import impossible.");
      }

      setImportStatus("success");
      setImportMessage(payload.message || `Brouillon créé pour ${payload.bankName}.`);
    } catch (error) {
      setImportStatus("error");
      setImportMessage(error instanceof Error ? error.message : "Import impossible.");
    } finally {
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  return (
    <div className="rates-workspace">
      <div className="bank-tabs-toolbar">
        <label className="search-field">
          <Search size={17} aria-hidden="true" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Rechercher une banque ou un profil..."
            type="search"
          />
        </label>
        <input
          ref={fileInputRef}
          className="sr-only"
          type="file"
          accept="application/pdf,.pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,.docx,application/msword,.doc"
          onChange={(event) => {
            void handleRateImport(event.target.files?.[0]);
          }}
        />
        <button
          className="rate-import-button"
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={importStatus === "uploading"}
          title="Importer un barème PDF"
          aria-label="Importer un barème PDF"
        >
          <Plus size={20} aria-hidden="true" />
        </button>
      </div>
      {importMessage ? <div className={`rate-import-status ${importStatus}`}>{importMessage}</div> : null}

      <div className="bank-tabs-shell">
        <div
          className="bank-tabs"
          onScroll={updateBankTabsScroll}
          ref={bankTabsRef}
          role="tablist"
          aria-label="Banques partenaires"
        >
          {bankTabs.map((bank) => (
            <button
              aria-label={bank}
              aria-selected={bank === selectedBank}
              className={`bank-tab ${bank === selectedBank ? "active" : ""}`}
              key={bank}
              onClick={() => {
                setActiveBank(bank);
                window.requestAnimationFrame(updateBankTabsScroll);
              }}
              role="tab"
              type="button"
            >
              <BankLogo bank={bank} />
              <span>{bank}</span>
            </button>
          ))}
        </div>
        {bankTabsPages > 1 ? (
          <div className="bank-tabs-dots" aria-label="Navigation banques">
            {Array.from({ length: bankTabsPages }).map((_, index) => (
              <button
                aria-label={`Afficher le groupe de banques ${index + 1}`}
                aria-current={index === activeBankTabsPage ? "true" : undefined}
                className={index === activeBankTabsPage ? "active" : ""}
                key={index}
                onClick={() => {
                  const node = bankTabsRef.current;
                  const maxScroll = node ? Math.max(0, node.scrollWidth - node.clientWidth) : bankTabsMaxScroll;
                  const nextScroll = bankTabsPages === 1 ? 0 : (maxScroll / (bankTabsPages - 1)) * index;
                  setBankTabsScroll(nextScroll);
                  setBankTabsMaxScroll(maxScroll);
                  node?.scrollTo({ left: nextScroll, behavior: "smooth" });
                }}
                type="button"
              />
            ))}
          </div>
        ) : null}
      </div>

      <div className="table-meta">
        <span>
          <SlidersHorizontal size={16} aria-hidden="true" />
          {rowCountLabel}
        </span>
        <span>{latestUpdate ? `Mise à jour : ${latestUpdate}` : "Mise à jour à compléter"}</span>
      </div>

      {importedMarkdown ? (
        <ImportedMarkdownRateTable markdown={importedMarkdown} rows={selectedRows} />
      ) : isSocieteGeneraleBank ? (
        <SgRateTable rows={sgRows} />
      ) : isBprpBank ? (
        <BprpRateTable activeTab={activeBprpTab} onTabChange={setActiveBprpTab} rows={bprpRows} />
      ) : isBpvfBank ? (
        <BpvfRateTable rows={selectedRows} />
      ) : isBnpBank ? (
        <BnpRateTable bank={selectedBank} rows={bnpRows} />
      ) : isBpbfcBank ? (
        <BpbfcRateTable tables={bpbfcTables} />
      ) : isBredBank ? (
        <BredRateTable rows={bredRows} />
      ) : isBcpBank ? (
        <BcpRateTable rows={bcpRows} />
      ) : isCeidfBank ? (
        <CeidfRateTable activeTab={activeCeidfTab} onTabChange={setActiveCeidfTab} rows={ceidfRows} />
      ) : isCaidfBank ? (
        <CaidfRateTable rows={caidfRows} />
      ) : isCabpBank ? (
        <CabpRateTable tables={cabpTables} />
      ) : isCasraBank ? (
        <CasraRateTable tables={casraTables} />
      ) : isFortuneoBank ? (
        <FortuneoRateTable rows={fortuneoRows} />
      ) : isPalatineBank ? (
        <PalatineRateTable activeTab={activePalatineTab} onTabChange={setActivePalatineTab} rows={palatineRows} />
      ) : isPostalBank ? (
        <PostalRateTable rows={postalRows} />
      ) : isCcfBank ? (
        <CcfRateTable rows={ccfRows} />
      ) : (
        <DefaultRateTable rows={selectedRows} />
      )}
    </div>
  );
}

function ImportedMarkdownRateTable({ markdown, rows }: { markdown: string; rows: RateRow[] }) {
  const tables = parseMarkdownTables(markdown);

  if (!tables.length) {
    return <DefaultRateTable rows={rows} />;
  }

  return (
    <>
      <div className="imported-table-stack">
        {tables.map((table, index) => (
          <div className="table-scroll imported-table-wrap" key={`${table.title}-${index}`}>
            {table.title ? <h3>{table.title}</h3> : null}
            <table className="imported-rate-table">
              <thead>
                {table.headers.map((headerRow, headerIndex) => (
                  <tr key={headerIndex}>
                    {headerRow.map((cell, cellIndex) => (
                      <th key={`${headerIndex}-${cellIndex}`}>{cell || ""}</th>
                    ))}
                  </tr>
                ))}
              </thead>
              <tbody>
                {table.rows.map((row, rowIndex) => (
                  <tr key={rowIndex}>
                    {row.map((cell, cellIndex) => (
                      <td className={parseRateValue(cell) !== null ? "rate-cell" : ""} key={`${rowIndex}-${cellIndex}`}>
                        {parseRateValue(cell) !== null ? formatRate(parseRateValue(cell)) : cell}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ))}
      </div>

      <div className="rate-notes">
        <strong>À noter</strong>
        <p>Tableau généré depuis l'extraction OCR Mistral. Les libellés OCR doivent être relus avant validation définitive du barème.</p>
      </div>
    </>
  );
}

function parseMarkdownTables(markdown: string) {
  const blocks = extractMarkdownTableBlocks(markdown);

  return blocks
    .map((block, index) => {
      const lines = normalizeMarkdownTableLines(block);
      const separatorIndex = lines.findIndex((line) => isMarkdownSeparatorRow(parseMarkdownCells(line)));

      if (separatorIndex < 1) {
        return null;
      }

      const title = findTitleBeforeTable(markdown, block) || (blocks.length > 1 ? `Tableau ${index + 1}` : "");
      const headers = lines.slice(0, separatorIndex).map(parseMarkdownCells);
      const rows = lines
        .slice(separatorIndex + 1)
        .map(parseMarkdownCells)
        .filter((row) => row.some(Boolean));

      return { title, headers, rows };
    })
    .filter((table): table is { title: string; headers: string[][]; rows: string[][] } => Boolean(table));
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
    .map((cell) => cell.replace(/\*\*/g, "").replace(/&nbsp;/g, " ").replace(/\s+/g, " ").trim());
}

function isMarkdownSeparatorRow(cells: string[]) {
  return cells.every((cell) => /^:?-{3,}:?$/.test(cell.replace(/\s/g, "")));
}

function findTitleBeforeTable(markdown: string, tableBlock: string) {
  const before = markdown.slice(0, markdown.indexOf(tableBlock)).trimEnd();
  const lastLine = before.split(/\r?\n/).reverse().find((line) => line.trim() && !line.trim().startsWith("|"));

  return lastLine?.replace(/^#+\s*/, "").trim() || "";
}

function parseRateValue(value: string) {
  const match = value.match(/^(\d{1,2})\s*[,.]\s*(\d{1,3})\s*%?$/);

  if (!match) {
    return null;
  }

  return Number(`${match[1]}.${match[2]}`);
}

function getLatestUpdateDate(rows: RateRow[]) {
  const timestamps = rows
    .map((row) => new Date(row.sourceDate).getTime())
    .filter((timestamp) => Number.isFinite(timestamp));

  if (!timestamps.length) {
    return null;
  }

  return new Date(Math.max(...timestamps)).toLocaleDateString("fr-FR");
}

function DefaultRateTable({ rows }: { rows: RateRow[] }) {
  return (
    <div className="table-scroll">
      <table>
        <thead>
          <tr>
            <th>Durée</th>
            <th>Taux barème</th>
            <th>Meilleur courtier</th>
            <th>Type</th>
            <th>Profil</th>
            <th>Région</th>
            <th>Barème</th>
            <th>Mise à jour</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id}>
              <td>
                <strong>{row.durationLabel}</strong>
                {row.durationYears > 0 && <span>{row.durationYears} ans</span>}
              </td>
              <td className="rate-cell">{formatRate(row.rate)}</td>
              <td className="rate-cell">{formatRate(row.brokerBestRate)}</td>
              <td>
                <strong>{row.customerType}</strong>
              </td>
              <td>
                <strong>{row.profile}</strong>
                {row.note && <span>{row.note}</span>}
              </td>
              <td>{row.region}</td>
              <td>{row.scale}</td>
              <td>{new Date(row.sourceDate).toLocaleDateString("fr-FR")}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

const sgDurationColumns: { key: SgDurationKey; label: string }[] = [
  { key: "relais", label: "Crédit relais" },
  { key: "threeToSeven", label: "3 à 7 ans" },
  { key: "sevenToTen", label: "> 7 à 10 ans" },
  { key: "tenToTwelve", label: "> 10 à 12 ans" },
  { key: "twelveToFifteen", label: "> 12 à 15 ans" },
  { key: "fifteenToSeventeen", label: "> 15 à 17 ans" },
  { key: "seventeenToTwenty", label: "> 17 à 20 ans" },
  { key: "twentyToTwentyFive", label: "> 20 à 25 ans" },
];

const sgInsuranceStandardRows: SgInsuranceRow[] = [
  { age: "18 à 36 ans", acquirerShort: "0,260 %", acquirerLong: "0,412 %", investorShort: "0,222 %", investorLong: "0,340 %" },
  { age: "36 à 46 ans", acquirerShort: "0,368 %", acquirerLong: "0,584 %", investorShort: "0,301 %", investorLong: "0,471 %" },
  { age: "46 à 56 ans", acquirerShort: "0,476 %", acquirerLong: "0,755 %", investorShort: "0,392 %", investorLong: "0,628 %" },
  { age: "56 à 65 ans", acquirerShort: "0,533 %", acquirerLong: "0,838 %", investorShort: "0,445 %", investorLong: "0,693 %" },
  { age: "65 à 83 ans (Senior DC/PTIA)", acquirerShort: "0,695 %", acquirerLong: "0,980 %", investorShort: "0,695 %", investorLong: "0,980 %" },
];

const sgInsuranceBfmRows: SgInsuranceRow[] = [
  { age: "18 à 36 ans", acquirerShort: "0,257 %", acquirerLong: "0,408 %", investorShort: "0,220 %", investorLong: "0,337 %" },
  { age: "36 à 46 ans", acquirerShort: "0,364 %", acquirerLong: "0,578 %", investorShort: "0,298 %", investorLong: "0,466 %" },
  { age: "46 à 56 ans", acquirerShort: "0,471 %", acquirerLong: "0,747 %", investorShort: "0,388 %", investorLong: "0,622 %" },
  { age: "56 à 65 ans", acquirerShort: "0,528 %", acquirerLong: "0,830 %", investorShort: "0,441 %", investorLong: "0,686 %" },
  { age: "65 à 83 ans (Senior DC/PTIA)", acquirerShort: "0,688 %", acquirerLong: "0,970 %", investorShort: "0,688 %", investorLong: "0,970 %" },
];

function SgRateTable({ rows }: { rows: SgMatrixRow[] }) {
  return (
    <>
      <div className="table-scroll">
        <table className="sg-rate-table">
          <thead>
            <tr>
              <th colSpan={2}>Total des revenus</th>
              <th rowSpan={2}>Crédit relais indépendant</th>
              <th colSpan={7}>Crédit amortissable</th>
            </tr>
            <tr>
              <th>1 emprunteur</th>
              <th>2 emprunteurs</th>
              {sgDurationColumns.slice(1).map((column) => (
                <th key={column.key}>{column.label}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.profile}>
                <td>
                  <strong>{row.singleBorrowerIncome}</strong>
                </td>
                <td>
                  <strong>{row.twoBorrowerIncome}</strong>
                </td>
                {sgDurationColumns.map((column) => (
                  <td className="rate-cell" key={column.key}>
                    {formatRate(row.rates[column.key])}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="rate-notes sg-notes">
        <strong>À noter</strong>
        <div className="rate-note-groups">
          <section>
            <h4>Barème</h4>
            <p>Barème prescripteur IDF, taux nominaux, en vigueur au 01/05/2026. Taux sous réserve d'acceptation du dossier par Société Générale et du respect de la réglementation sur l'usure.</p>
            <p>Financement par une personne physique ou une SCI composée de personnes physiques uniquement, pour un bien immobilier à usage d'habitation : résidence principale, secondaire, locative ou travaux éligibles au prêt immobilier.</p>
          </section>
          <section>
            <h4>Majorations</h4>
            <p>Différé supérieur à 12 mois : +0,10, hors crédit relais, prêts in fine et offre promotionnelle en cours.</p>
            <p>Prêts in fine : +0,50, hors crédit relais.</p>
          </section>
          <section>
            <h4>Conditions</h4>
            <p>Les emprunteurs de moins de 35 ans sont éligibles au barème intermédiaire dès 25 k€ de revenus pour 1 emprunteur et 40 k€ pour un couple, si au moins un des deux est âgé de moins de 35 ans.</p>
            <p>Le taux Neiertz des dossiers présentés ne doit pas dépasser 35 %. La durée totale maximale est de 25 ans, avec possibilité d'ajouter 2 ans de différé pour VEFA, construction ou acquisition avec travaux supérieurs à 10 % du coût total.</p>
          </section>
          <section>
            <h4>Garantie aide à la famille</h4>
            <p>Depuis le 23/06/2025, SG propose au sein des contrats ADE Sogecap et Sogecap BFM la Garantie Aide à la Famille. Elle soutient l'assuré contraint de cesser partiellement ou totalement son activité professionnelle pour assister son enfant atteint d'une maladie grave ou victime d'un accident grave de la vie : prise en charge de 100 % de la mensualité jusqu'à 5 000 €/mois après quotité, pendant 14 mois maximum, renouvelable 1 fois.</p>
          </section>
          <section className="wide-note">
            <h4>Assurance, taux annuels sur capital initial</h4>
            <div className="insurance-tables">
              <InsuranceMiniTable rows={sgInsuranceStandardRows} title="Hors contexte BFM" />
              <InsuranceMiniTable rows={sgInsuranceBfmRows} title="Contexte BFM" />
            </div>
            <p>Colonnes : acquéreurs avec différé partiel ou total &lt;= 36 mois, acquéreurs avec différé partiel &gt; 36 mois et in fine, investisseurs avec différé partiel ou total &lt;= 36 mois, investisseurs avec différé partiel &gt; 36 mois et in fine.</p>
            <p>La tranche 65 à 83 ans concerne aussi les assurés de plus de 55 ans souhaitant étendre la garantie décès au-delà de 75 ans.</p>
            <p>Contrats associés : acquéreurs Standard DIT PPI 90197 / Senior DC/PTIA 90198, ou BFM 90271 / 90272. Investisseurs API 90199 / Senior DC/PTIA 90198, ou BFM 90273 / 90272.</p>
          </section>
        </div>
      </div>
    </>
  );
}

function InsuranceMiniTable({ rows, title }: { rows: SgInsuranceRow[]; title: string }) {
  return (
    <div className="insurance-table-wrap">
      <span>{title}</span>
      <table className="insurance-mini-table">
        <thead>
          <tr>
            <th>Âge</th>
            <th>Acq. &lt;= 36 mois</th>
            <th>Acq. &gt; 36 mois</th>
            <th>Inv. &lt;= 36 mois</th>
            <th>Inv. &gt; 36 mois</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.age}>
              <td>{row.age}</td>
              <td>{row.acquirerShort}</td>
              <td>{row.acquirerLong}</td>
              <td>{row.investorShort}</td>
              <td>{row.investorLong}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

const bprpTabs: { key: BprpTapKey; label: string }[] = [
  { key: "tapLt20", label: "TAP < 20%" },
  { key: "tap20To30", label: "20% <= TAP < 30%" },
  { key: "tapGte30", label: "TAP >= 30%" },
];

function BprpRateTable({
  activeTab,
  onTabChange,
  rows,
}: {
  activeTab: BprpTapKey;
  onTabChange: (tab: BprpTapKey) => void;
  rows: BprpMatrixRow[];
}) {
  return (
    <>
      <div className="inner-tabs" role="tablist" aria-label="Taux d'apport personnel Banque Populaire Rives de Paris">
        {bprpTabs.map((tab) => (
          <button
            aria-selected={tab.key === activeTab}
            className={tab.key === activeTab ? "active" : ""}
            key={tab.key}
            onClick={() => onTabChange(tab.key)}
            role="tab"
            type="button"
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="table-scroll">
        <table className="bprp-rate-table">
          <thead>
            <tr>
              <th>Durée</th>
              <th>Revenus &lt; 30 k€</th>
              <th>Revenus &gt;= 30 k€</th>
              <th>Revenus &gt;= 60 k€</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.durationLabel}>
                <td>
                  <strong>{row.durationLabel}</strong>
                </td>
                <td className="rate-cell">{formatRate(row.incomeLt30)}</td>
                <td className="rate-cell">{formatRate(row.incomeGte30)}</td>
                <td className="rate-cell">{formatRate(row.incomeGte60)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="rate-notes bprp-notes">
        <strong>À noter</strong>
        <div className="rate-note-groups">
          <section>
            <h4>Périmètre affiché</h4>
            <p>Barème Prescription Immobilière, taux hors assurance, applicable à compter du 04/05/2026.</p>
            <p>Seules les durées 5, 10, 15, 20 et 25 ans du prêt Riv'Immo Modulation sont reprises dans les tableaux.</p>
          </section>
          <section>
            <h4>TAP et revenus</h4>
            <p>TAP : taux d'apport personnel, soit montant de l'apport divisé par le coût du projet, multiplié par 100.</p>
            <p>Coût du projet : achat + frais d'agence + frais de notaire. Les revenus correspondent aux revenus annuels moyens par emprunteur.</p>
          </section>
          <section>
            <h4>Modulation</h4>
            <p>Riv'Immo Modulation : allongement maximum de 3 ans.</p>
            <p>Pas de modularité des échéances à la baisse pour les prêts supérieurs à 22 ans.</p>
          </section>
          <section>
            <h4>Décote et frais</h4>
            <p>Décote additionnelle sur taux barème si fonction publique ou profession libérale : -0,10 % sur les colonnes concernées, sauf colonne revenus &gt;= 60 k€ du tableau TAP &gt;= 30 % où la décote est de 0,00 %.</p>
            <p>Frais de dossier : tous les dossiers de prêt immobilier reçus se verront appliquer des frais de dossier de 1 000 € a minima.</p>
          </section>
        </div>
      </div>
    </>
  );
}

function BpvfRateTable({ rows }: { rows: RateRow[] }) {
  return (
    <>
      <div className="table-scroll">
        <table className="bpvf-rate-table">
          <thead>
            <tr>
              <th>Barème unique</th>
              {rows.map((row) => (
                <th key={row.id}>{row.durationLabel}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>
                <strong>Grille unique IDF et Province</strong>
              </td>
              {rows.map((row) => (
                <td className="rate-cell" key={row.id}>
                  {formatRate(row.rate)}
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>

      <div className="rate-notes bpvf-notes">
        <strong>À noter</strong>
        <div className="rate-note-groups">
          <section>
            <h4>Périmètre</h4>
            <p>Barème courtiers unique IDF et Province, conditions au 04/05/2026, taux hors assurance.</p>
            <p>Prêt relais sur 12 mois, 24 mois si VEFA : 3,60 %. Prêt locatif : durée maximum 240 mois.</p>
          </section>
          <section>
            <h4>Revenus éligibles à la rémunération</h4>
            <p>Toutes fonctions publiques. Tous les revenus correspondant à la grille sont d'office Argent ou Or.</p>
            <p>Jeunes de moins de 35 ans : revenus &gt; 40 k€ pour un couple ou &gt; 25 k€ pour un célibataire.</p>
          </section>
          <section>
            <h4>Décote de taux possible</h4>
            <p>Selon la qualité du dossier : IDF célibataire &gt; 35 000 €, IDF couple &gt; 50 000 €, hors IDF célibataire &gt; 30 000 €, hors IDF couple &gt; 40 000 €.</p>
          </section>
          <section>
            <h4>Garanties et assurance</h4>
            <p>Garanties : CEGC, CASDEN pour toute la fonction publique, HLS de PPD.</p>
            <p>Depuis le 18/10/2021, BPVF propose une offre assurance emprunteurs combinant une garantie socle avec des garanties additionnelles. Chaque étude fait l'objet d'une proposition tarifaire personnalisée.</p>
          </section>
          <section>
            <h4>Frais</h4>
            <p>Indemnités de remboursement anticipé : exonération 100 % sauf rachat concurrence.</p>
            <p>Frais de dossier : minimum 1 000 €, dans la limite de 1 % du montant du prêt.</p>
          </section>
          <section>
            <h4>Validité</h4>
            <p>Conditions confidentielles au 04/05/2026, annulent et remplacent les précédentes mises à jour. Conditions susceptibles d'être modifiées à tout moment.</p>
          </section>
        </div>
      </div>
    </>
  );
}

function BnpRateTable({ bank, rows }: { bank: string; rows: GenericMatrixRow[] }) {
  const columns = ["Relais", "Moins de 5 ans", "6 à 9 ans", "10 à 15 ans", "16 à 19 ans", "20 à 25 ans"];

  return (
    <>
      <GenericRateMatrix className="bnp-rate-table" columns={columns} firstColumn="Revenus" rows={rows} />
      <div className="rate-notes bnp-notes">
        <strong>À noter</strong>
        <div className="rate-note-groups">
          <section>
            <h4>Périmètre</h4>
            <p>Barème Prescription Immobilière applicable à compter du 20/04/2026, repris depuis le PDF BNP Paribas / Hello bank.</p>
            <p>{bank === "Hello bank!" ? "Hello bank! utilise la même grille communiquée dans le document BNPP / Hello bank." : "Grille BNP Paribas avec tranches de revenus 1 et 2 emprunteurs."}</p>
          </section>
          <section className="wide-note">
            <h4>Tranches de revenus</h4>
            <div className="table-scroll">
              <table className="profile-mini-table source-detail-table">
                <thead>
                  <tr>
                    <th>Profil</th>
                    <th>1 emprunteur</th>
                    <th>2 emprunteurs</th>
                  </tr>
                </thead>
                <tbody>
                  <tr><td>Palier 1</td><td>Moins de 30 k€</td><td>Moins de 60 k€</td></tr>
                  <tr><td>Palier 2</td><td>30 k€ à moins de 65 k€</td><td>60 k€ à moins de 75 k€</td></tr>
                  <tr><td>Palier 3</td><td>65 k€ à moins de 90 k€</td><td>75 k€ à moins de 120 k€</td></tr>
                  <tr><td>Palier 4</td><td>Plus de 90 k€</td><td>Plus de 120 k€</td></tr>
                </tbody>
              </table>
            </div>
          </section>
        </div>
      </div>
    </>
  );
}

function BpbfcRateTable({ tables }: { tables: { scale: string; columns: string[]; rows: GenericMatrixRow[] }[] }) {
  return (
    <>
      <div className="stacked-table">
        {tables.map((table) => (
          <GenericRateMatrix className="bpbfc-rate-table" columns={table.columns} firstColumn={table.scale} key={table.scale} rows={table.rows} />
        ))}
      </div>
      <div className="rate-notes bpbfc-notes">
        <strong>À noter</strong>
        <div className="rate-note-groups">
          <section>
            <h4>Prêts en euros</h4>
            <p>Standard : CASDEN ou revenus inférieurs à 45 k€ célibataire et 60 k€ couple.</p>
            <p>Premium : revenus supérieurs à 45 k€ célibataire et 60 k€ couple. Excellium : revenus supérieurs à 60 k€ célibataire et 80 k€ couple.</p>
          </section>
          <section>
            <h4>Prêt relais</h4>
            <p>Prêt relais / prêt relais rachat : barème sur durée 7 ans + 0,25 %.</p>
          </section>
          <section>
            <h4>Prêts en CHF</h4>
            <p>Standard CHF : revenus inférieurs à 30 k€ célibataire ou 45 k€ couple. Premium CHF : revenus supérieurs à ces seuils.</p>
          </section>
          <section>
            <h4>Frais</h4>
            <p>Frais de dossier : 0,5 %, minimum 600 €. Offre jeunes actifs 18-28 ans : 200 €.</p>
          </section>
        </div>
      </div>
    </>
  );
}

function BredRateTable({ rows }: { rows: BredMatrixRow[] }) {
  return (
    <>
      <div className="table-scroll">
        <table className="bred-rate-table">
          <thead>
            <tr>
              <th>Durée</th>
              <th>Barème 1</th>
              <th>Barème 2</th>
              <th>Barème 3</th>
              <th>Barème 4</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.durationLabel}>
                <td>
                  <strong>{row.durationLabel}</strong>
                </td>
                <td className="rate-cell">{formatRate(row.bareme1)}</td>
                <td className="rate-cell">{formatRate(row.bareme2)}</td>
                <td className="rate-cell">{formatRate(row.bareme3)}</td>
                <td className="rate-cell">{formatRate(row.bareme4)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="rate-notes bred-notes">
        <strong>Tranches de revenus et avoirs</strong>
        <div className="table-scroll">
          <table className="profile-mini-table bred-profile-table">
            <thead>
              <tr>
                <th>Barème</th>
                <th>1 emprunteur</th>
                <th>2 emprunteurs</th>
                <th>Avoirs dans les comptes clients avant dépôt</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Barème 1</td>
                <td>&lt; 30 k€</td>
                <td>&lt; 50 k€</td>
                <td>-</td>
              </tr>
              <tr>
                <td>Barème 2</td>
                <td>&gt; 30 k€ et &lt; 50 k€</td>
                <td>&gt; 50 k€ et &lt; 80 k€</td>
                <td>&gt; 50 k€</td>
              </tr>
              <tr>
                <td>Barème 3</td>
                <td>&gt; 50 k€ et &lt; 90 k€</td>
                <td>&gt; 80 k€ et &lt; 120 k€</td>
                <td>&gt; 75 k€</td>
              </tr>
              <tr>
                <td>Barème 4</td>
                <td>&gt; 90 k€</td>
                <td>&gt; 120 k€</td>
                <td>&gt; 150 k€</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div className="rate-note-groups">
          <section>
            <h4>Éligibilité</h4>
            <p>Personnes physiques, commerçants, artisans, chefs d'entreprise, professions libérales réglementées et fonctionnaires.</p>
            <p>Acquisition résidence principale ou résidence secondaire avec garantie CEGC ou CASDEN.</p>
          </section>
          <section>
            <h4>Conditions</h4>
            <p>Casden éligible : utiliser le barème 1. Décote clients BRED prescrits : -5 cts.</p>
            <p>Majoration de 15 cts pour les emprunteurs et projets hors coeur de cible.</p>
          </section>
          <section>
            <h4>Non-résidents</h4>
            <p>BRED Espace Clientèle non-résidente : majoration de 30 cts par rapport au barème coeur de cible. Application du barème 4 de façon exceptionnelle et dérogatoire.</p>
          </section>
        </div>
      </div>
    </>
  );
}

function BcpRateTable({ rows }: { rows: GenericMatrixRow[] }) {
  return (
    <>
      <GenericRateMatrix className="bcp-rate-table" columns={["Clients / prospects"]} firstColumn="Durée" rows={rows} />
      <div className="rate-notes bcp-notes">
        <strong>À noter</strong>
        <div className="rate-note-groups">
          <section>
            <h4>Périmètre</h4>
            <p>Barème prescripteurs crédits aux particuliers au 15/05/2026. Durée de validité de la proposition commerciale limitée à 15 jours.</p>
            <p>Barème pour les dossiers Portugal : consulter la banque.</p>
          </section>
          <section>
            <h4>Frais de dossier</h4>
            <p>Dossier simple : minimum 950 €. Dossier avec ligne de prêt relais : minimum 1 000 €.</p>
            <p>Dossier complexe et dossier Portugal : minimum 1 250 €.</p>
          </section>
          <section>
            <h4>Prêt à impact et primo-accédant</h4>
            <p>DPE E, F ou G : le client est incité à réaliser des travaux sous 40 mois et à présenter un DPE amélioré de 2 lettres minimum. Avantage financier : baisse de taux de 0,20 %.</p>
            <p>Prêt primo-accédant moins de 35 ans : 1,49 %, plafonné à 10 % du financement dans la limite de 20 k€.</p>
          </section>
          <section>
            <h4>Recevabilité</h4>
            <p>Financement maximum 600 k€ hors relais. Exclusion des encours persistants, financements via SCI et financements en Espagne pour le prêt primo-accédant.</p>
            <p>Reste à vivre : 850 € personne seule, 750 € par personne pour 2, 600 € pour 3, 525 € pour 4 et plus.</p>
          </section>
          <section>
            <h4>Options</h4>
            <p>Modulation possible à partir du 13e mois, une fois par an à la date anniversaire, avec délai de 45 jours.</p>
            <p>Aménagement temporaire d'échéance possible à partir du 13e mois, limité à 12 échéances sur la durée du crédit.</p>
          </section>
        </div>
      </div>
    </>
  );
}

function GenericRateMatrix({
  className,
  columns,
  firstColumn,
  rows,
}: {
  className: string;
  columns: string[];
  firstColumn: string;
  rows: GenericMatrixRow[];
}) {
  return (
    <div className="table-scroll">
      <table className={className}>
        <thead>
          <tr>
            <th>{firstColumn}</th>
            {columns.map((column) => (
              <th key={column}>{column}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.label}>
              <td>
                <strong>{row.label}</strong>
              </td>
              {columns.map((column) => (
                <td className="rate-cell" key={column}>
                  {formatRate(row.rates[column] ?? null)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function CeidfRateTable({
  activeTab,
  onTabChange,
  rows,
}: {
  activeTab: CeidfCustomerKey;
  onTabChange: (tab: CeidfCustomerKey) => void;
  rows: CeidfMatrixRow[];
}) {
  const durationColumns = [
    "<= 7 ans",
    "<= 10 ans",
    "<= 12 ans",
    "<= 15 ans",
    "<= 18 ans",
    "<= 20 ans",
    "<= 25 ans",
    "<= 30 ans",
  ];

  return (
    <>
      <div className="inner-tabs" role="tablist" aria-label="Barèmes Caisse d'Épargne IDF">
        <button className={activeTab === "prospect" ? "active" : ""} onClick={() => onTabChange("prospect")} type="button">
          Prospects
        </button>
        <button className={activeTab === "client" ? "active" : ""} onClick={() => onTabChange("client")} type="button">
          Clients
        </button>
      </div>

      <div className="table-scroll">
        <table className="ceidf-rate-table">
          <thead>
            <tr>
              <th>Barème</th>
              <th>DPE</th>
              {durationColumns.map((duration) => (
                <th key={duration}>{duration}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={`${row.profile}-${row.dpe}`}>
                <td>
                  <strong>{row.profile}</strong>
                </td>
                <td>{row.dpe}</td>
                {durationColumns.map((duration) => (
                  <td className="rate-cell" key={duration}>
                    {formatRate(row.rates[duration])}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="rate-notes ceidf-notes">
        <strong>Tranches de revenus</strong>
        <div className="table-scroll">
          <table className="profile-mini-table ceidf-income-table">
            <thead>
              <tr>
                <th>Emprunteur</th>
                <th>BON</th>
                <th>TRES BON</th>
                <th>EXCELLENT</th>
                <th>EXCLUSIF</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Personne seule</td>
                <td>&lt; 35 k€</td>
                <td>&gt;= 35 k€ et &lt; 70 k€</td>
                <td>&gt;= 70 k€ et &lt; 100 k€</td>
                <td>&gt;= 100 k€</td>
              </tr>
              <tr>
                <td>Couple</td>
                <td>&lt; 45 k€</td>
                <td>&gt;= 45 k€ et &lt; 90 k€</td>
                <td>&gt;= 90 k€ et &lt; 150 k€</td>
                <td>&gt;= 150 k€</td>
              </tr>
            </tbody>
          </table>
        </div>

        <strong>Bonification</strong>
        <div className="table-scroll">
          <table className="profile-mini-table ceidf-bonus-table">
            <thead>
              <tr>
                <th>Barème</th>
                <th>Jeunes</th>
                <th>Pro hors PLS</th>
                <th>Pro PLS</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>BON</td>
                <td>-0,20 %</td>
                <td>-0,10 %</td>
                <td>-0,10 %</td>
              </tr>
              <tr>
                <td>TRES BON</td>
                <td>-0,15 %</td>
                <td>-0,10 %</td>
                <td>-0,10 %</td>
              </tr>
              <tr>
                <td>EXCELLENT</td>
                <td>-0,10 %</td>
                <td>-0,10 %</td>
                <td>-0,10 %</td>
              </tr>
              <tr>
                <td>EXCLUSIF</td>
                <td>-0,10 %</td>
                <td>0 %</td>
                <td>-0,10 %</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div className="rate-note-groups">
          <section>
            <h4>À noter</h4>
            <p>Taux proportionnels, applicables à partir du 01/05/2026. Taux d'effort &lt;= 35 %.</p>
            <p>Pour les SCI, prendre en considération les revenus des associés garants du crédit.</p>
          </section>
          <section>
            <h4>Clientèles prioritaires</h4>
            <p>Emprunteurs de moins de 36 ans, clients ou prospects, au moins un des deux emprunteurs avec âge &lt;= 35 ans pour un couple.</p>
            <p>Clients Pro CEIDF et clients Pro PLS CEIDF empruntant à titre privé.</p>
          </section>
          <section>
            <h4>Frais et lissage</h4>
            <p>Dans le cas d'un lissage, le coût pour la CEIDF est d'au moins 10 centimes et doit être intégré à la proposition de taux.</p>
            <p>Frais de dossier : 700 € minimum pour les dossiers standards, 1 000 € minimum pour les dossiers complexes.</p>
          </section>
        </div>
      </div>
    </>
  );
}

function CasraRateTable({
  tables,
}: {
  tables: { scale: string; rows: CasraMatrixRow[] }[];
}) {
  const durationColumns = [
    { key: "10 ans", label: "10 ans" },
    { key: "12 ans", label: "12 ans" },
    { key: "15 ans", label: "15 ans" },
    { key: "20 ans", label: "20 ans" },
    { key: "25 ans", label: "25 ans" },
  ];

  return (
    <>
      <div className="stacked-table">
        {tables.map((table) => (
          <div className="table-scroll" key={table.scale}>
            <table className="casra-rate-table">
              <thead>
                <tr>
                  <th colSpan={2}>{table.scale}</th>
                  {durationColumns.map((column) => (
                    <th key={column.key}>{column.label}</th>
                  ))}
                </tr>
                <tr>
                  <th>Revenus 1 emprunteur</th>
                  <th>Revenus 2 emprunteurs</th>
                  {durationColumns.map((column) => (
                    <th key={column.key}>Taux</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {table.rows.map((row) => (
                  <tr key={`${table.scale}-${row.profile}`}>
                    <td>
                      <strong>{row.singleBorrowerIncome}</strong>
                    </td>
                    <td>{row.twoBorrowerIncome}</td>
                    {durationColumns.map((column) => (
                      <td className="rate-cell" key={column.key}>
                        {formatRate(row.rates[column.key])}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ))}
      </div>

      <div className="rate-notes casra-notes">
        <strong>À noter</strong>
        <div className="rate-note-groups">
          <section>
            <h4>Bonus et relais</h4>
            <p>Bonus supplémentaire de -0,05 % sur les grilles en cas de souscription d'un produit d'assurance : épargne, IARD ou prévoyance.</p>
            <p>Prêt relais : différé total 3,85 %, différé partiel 3,75 %.</p>
          </section>
          <section>
            <h4>Offres spécifiques</h4>
            <p>Booster Accélérateur Habitat valable jusqu'au 15/07/2026 : taux 2,49 %, 10 % du montant des crédits octroyés, plafonné à 50 000 €, durée maxi 300 mois, frais de dossier offerts.</p>
            <p>Offre Immo Durable valable jusqu'au 31/12/2026 : RP, RS, RL hors primo accédant, biens DPE A, B, C, VEFA et constructions. 20 000 € maxi à 1,99 % sur 300 mois maxi, limité à 10 % des prêts CA SRA.</p>
          </section>
          <section>
            <h4>Partenariat Armées</h4>
            <p>Personnels militaires, civils et gendarmes en activité : 25 000 € à 1,79 % sur 300 mois maxi, limité à 10 % des prêts CA SRA. Exonération des IRA sur tout le dossier sauf rachat concurrence.</p>
          </section>
          <section>
            <h4>Financement</h4>
            <p>Financement sans apport possible seulement pour les primo-accédants en résidence principale. Construction, BRS et PSLA possibles.</p>
            <p>Frais de dossier : 1,12 % du montant emprunté, plafonné à 2 000 €, minimum 850 €. Garantie CAMCA si éligible ou garantie réelle.</p>
          </section>
          <section>
            <h4>Options souplesse</h4>
            <p>Pauses mensualités possibles jusqu'à 50 % de la mensualité pendant 1 an ou 100 % pendant 6 mois.</p>
            <p>Modulation de mensualité de +/- 30 % d'une année sur l'autre avec ajustement de la durée restante, +2 ans maximum. Mise en place gratuite.</p>
          </section>
        </div>
      </div>
    </>
  );
}

function CabpRateTable({ tables }: { tables: { scale: string; columns: string[]; rows: GenericMatrixRow[] }[] }) {
  return (
    <>
      <div className="stacked-table">
        {tables.map((table) => (
          <GenericRateMatrix className="cabp-rate-table" columns={table.columns} firstColumn={table.scale} key={table.scale} rows={table.rows} />
        ))}
      </div>
      <div className="rate-notes cabp-notes">
        <strong>À noter</strong>
        <div className="rate-note-groups">
          <section>
            <h4>Tranches de revenus taux fixe</h4>
            <p>Barème Or : couple +65 k€ / célibataire +40 k€.</p>
            <p>Barème Argent : couple 50 k€ à 65 k€ / célibataire 30 k€ à 40 k€.</p>
            <p>Barème Bronze : couple &lt; 50 k€ / célibataire &lt; 30 k€.</p>
          </section>
          <section>
            <h4>Booster Accélérateur Habitat</h4>
            <p>Offre tous clients/prospects primo et secundo, tous projets hors PTZ et crédit revente.</p>
            <p>10 % du montant total du besoin de financement, plafonné à 50 000 €, taux 2,49 %, durée 24 à 300 mois alignée sur le prêt principal.</p>
          </section>
          <section>
            <h4>Apport et frais</h4>
            <p>RP et RS ancien : 5 % minimum. RP/RS neuf : couverture de l'ensemble des frais. RL : 1 % d'apport.</p>
            <p>Frais de dossier : 500 €.</p>
          </section>
          <section>
            <h4>Options</h4>
            <p>Offre G2 cumulative possible selon profil et besoin client.</p>
            <p>Options souplesse : modulation +30/-30 %, pause jusqu'à 6 mois.</p>
          </section>
        </div>
      </div>
    </>
  );
}

function FortuneoRateTable({ rows }: { rows: FortuneoMatrixRow[] }) {
  return (
    <>
      <div className="table-scroll">
        <table className="fortuneo-rate-table">
          <thead>
            <tr>
              <th>Durée</th>
              <th>Taux profil 1 (A)</th>
              <th>Taux profil 2 (B)</th>
              <th>Taux profil 3 (C)</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.durationLabel}>
                <td>
                  <strong>{row.durationLabel}</strong>
                </td>
                <td className="rate-cell">{formatRate(row.profileA)}</td>
                <td className="rate-cell">{formatRate(row.profileB)}</td>
                <td className="rate-cell">{formatRate(row.profileC)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="rate-notes fortuneo-notes">
        <strong>À noter</strong>
        <div className="rate-note-groups">
          <section>
            <h4>Périmètre</h4>
            <p>Barème Fortuneo applicable au 07/04/2026, taux par durée de 7 à 25 ans et par profil A, B ou C.</p>
          </section>
          <section>
            <h4>Rappels de taux</h4>
            <p>Résidence locative ou secondaire : +10 bps sur tous les projets.</p>
            <p>DPE A ou B : -10 bps pour tous les projets, y compris VEFA.</p>
          </section>
          <section className="wide-note">
            <h4>Lecture des profils</h4>
            <div className="table-scroll">
              <table className="profile-mini-table">
                <thead>
                  <tr>
                    <th>Revenus annuels des emprunteurs</th>
                    <th>Montant &lt; 150 k€</th>
                    <th>150 k€ &lt;= montant &lt; 350 k€</th>
                    <th>Montant &gt;= 350 k€</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>&lt; 32 k€</td>
                    <td>A</td>
                    <td>B</td>
                    <td>C</td>
                  </tr>
                  <tr>
                    <td>32 k€ &lt;= revenus &lt; 74 k€</td>
                    <td>B</td>
                    <td>B</td>
                    <td>C</td>
                  </tr>
                  <tr>
                    <td>&gt;= 74 k€</td>
                    <td>C</td>
                    <td>C</td>
                    <td>C</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>
        </div>
      </div>
    </>
  );
}

function CaidfRateTable({ rows }: { rows: CaidfMatrixRow[] }) {
  return (
    <>
      <div className="table-scroll">
        <table className="caidf-rate-table">
          <thead>
            <tr>
              <th>Gamme de barèmes Facilimmo</th>
              <th>Apport préconisé</th>
              {rows.map((row) => (
                <th key={row.durationLabel}>{row.durationLabel}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><strong>PREMIUM</strong></td>
              <td>&gt;= 10% du projet</td>
              {rows.map((row) => <td className="rate-cell" key={row.durationLabel}>{formatRate(row.premium)}</td>)}
            </tr>
            <tr>
              <td><strong>PARTICULIER</strong></td>
              <td>&gt;= 15% du projet</td>
              {rows.map((row) => <td className="rate-cell" key={row.durationLabel}>{formatRate(row.particulier)}</td>)}
            </tr>
          </tbody>
        </table>
      </div>

      <div className="table-scroll stacked-table">
        <table className="caidf-criteria-table">
          <thead>
            <tr>
              <th>Barèmes et critères d'éligibilité</th>
              <th>1 emprunteur</th>
              <th>2 emprunteurs</th>
              <th>Autres conditions d'éligibilité en dehors des critères de revenus</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><strong>PREMIUM</strong></td>
              <td>&gt;= 70 k€</td>
              <td>&gt;= 100 k€</td>
              <td>Toutes professions libérales de santé. Ou sans activité libérale : médecins généralistes ou spécialistes, docteurs en pharmacie, directeurs de laboratoire et internes en médecine.</td>
            </tr>
            <tr>
              <td><strong>PARTICULIER</strong></td>
              <td>&lt; 70 k€</td>
              <td>&lt; 100 k€</td>
              <td>nc</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div className="paired-tables">
        <div className="table-scroll">
          <table className="mini-rate-table">
            <thead>
              <tr><th colSpan={3}>Taux fixe, relais</th></tr>
              <tr><th>Durée</th><th>Mensuel</th><th>Annuel</th></tr>
            </thead>
            <tbody>
              <tr><td>1 an</td><td className="rate-cell">4,00 %</td><td className="rate-cell">4,00 %</td></tr>
              <tr><td>2 ans</td><td className="rate-cell">4,00 %</td><td className="rate-cell">4,00 %</td></tr>
            </tbody>
          </table>
        </div>

        <div className="table-scroll">
          <table className="mini-rate-table">
            <thead>
              <tr><th colSpan={3}>Taux révisable, CAPE 2 points indexé Euribor 3M</th></tr>
              <tr><th>Prêt CAPE complémentaire à un relais</th><th>&lt;= 7 ans</th><th>de 7 à &lt;= 25 ans</th></tr>
            </thead>
            <tbody>
              <tr><td>Mensuel</td><td className="rate-cell">4,00 %</td><td className="rate-cell">4,00 %</td></tr>
              <tr><td>Annuel</td><td className="rate-cell">4,00 %</td><td className="rate-cell">4,00 %</td></tr>
            </tbody>
          </table>
        </div>
      </div>

      <div className="rate-notes caidf-notes">
        <strong>À noter</strong>
        <div className="rate-note-groups">
          <section>
            <h4>Périmètre</h4>
            <p>Barèmes prescripteurs, conditions de taux en vigueur du 07/04/2026, financements immobiliers des personnes physiques agissant pour des besoins non professionnels, taux nominal hors assurance.</p>
            <p>Concerne la résidence principale, secondaire et locative. Ces conditions annulent et remplacent les précédents barèmes.</p>
          </section>
          <section>
            <h4>Solutions CA IDF</h4>
            <p>Booster Accélérateur Habitat 2,49 % : tout type de logement et tout DPE, plafonné à 10 % du prêt principal CAIDF, durée identique au prêt principal, limite 50 000 €, hors prêt relais et travaux seuls.</p>
            <p>Prêt Immo Durable CA IDF 0 % : logements neufs RT2012/RE2020 ou anciens DPE A/B/C, compatible RP, RS, RL, plafonné à 10 % du prêt principal, limite 25 000 €, hors prêt relais.</p>
          </section>
          <section>
            <h4>DPE F ou G</h4>
            <p>Acquisition RP ou RS : apport complémentaire de 10 %. Acquisition RL : non prise en compte des revenus locatifs à venir.</p>
          </section>
          <section>
            <h4>Frais et relais</h4>
            <p>Frais de dossier : 0,50 % du montant emprunté avec un minimum de 700 €.</p>
            <p>Plafond des prêts relais : A à E avec compromis 90 %, A à E sans compromis 80 %, DPE F/G ou absence de DPE 70 %, sans recours possible à un prêt complémentaire pour sa valeur résiduelle.</p>
          </section>
          <section>
            <h4>Validité</h4>
            <p>Offres Booster Accélérateur Habitat et Prêt Immo Durable cumulables selon conditions jusqu'au 15/07/2026. Document d'information non contractuel à destination exclusive du prescripteur, à ne pas remettre au client.</p>
          </section>
        </div>
      </div>
    </>
  );
}

const palatineTabs: { key: PalatineScaleKey; label: string }[] = [
  { key: "patrimoniale", label: "Clientèle patrimoniale" },
  { key: "banquePrivee", label: "Banque privée" },
];

function PalatineRateTable({
  activeTab,
  onTabChange,
  rows,
}: {
  activeTab: PalatineScaleKey;
  onTabChange: (tab: PalatineScaleKey) => void;
  rows: PalatineMatrixRow[];
}) {
  const isBanquePrivee = activeTab === "banquePrivee";

  return (
    <>
      <div className="inner-tabs" role="tablist" aria-label="Barèmes Palatine">
        {palatineTabs.map((tab) => (
          <button
            aria-selected={tab.key === activeTab}
            className={tab.key === activeTab ? "active" : ""}
            key={tab.key}
            onClick={() => onTabChange(tab.key)}
            role="tab"
            type="button"
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="table-scroll">
        <table className="palatine-rate-table">
          <thead>
            <tr>
              <th>Durées jusqu'à</th>
              <th>Pers. phy RP / RS</th>
              <th>Pers. phy IL</th>
              <th>PM PAT RP-RS-IL</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.durationLabel}>
                <td>
                  <strong>{row.durationLabel}</strong>
                </td>
                <td className="rate-cell">{formatRate(row.rpRs)}</td>
                <td className="rate-cell">{formatRate(row.il)}</td>
                <td className="rate-cell">{formatRate(row.pmPat)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="rate-notes palatine-notes">
        <strong>À noter</strong>
        <div className="rate-note-groups">
          <section>
            <h4>Périmètre affiché</h4>
            <p>Prêts immobiliers &lt; 2 M€, barèmes Palatine applicables au 01/04/2026, taux hors assurance.</p>
            <p>Seuls les prêts amortissables HARMONIE à taux fixe sont affichés. Les prêts in fine, prêts relais et taux révisables ne sont pas repris dans ce tableau.</p>
          </section>
          <section>
            <h4>Clientèles</h4>
            {isBanquePrivee ? (
              <p>Clientèle banque privée : revenus annuels nets du foyer domiciliés supérieurs à 150 k€.</p>
            ) : (
              <p>Clientèle patrimoniale : revenus annuels nets du foyer domiciliés entre 100 k€ et 150 k€.</p>
            )}
          </section>
          <section>
            <h4>Conditions d'octroi, entrée en relation</h4>
            <p>Domiciliation des revenus professionnels, salaires, BIC, BNC, pensions, retraites, et des charges.</p>
            <p>Souscription aux offres CB, Banque à Distance et Domilis, aide à la domiciliation bancaire.</p>
          </section>
          <section>
            <h4>Conditions d'octroi, financement</h4>
            <p>Caution SACCEF en garantie du financement si le dossier est éligible à l'offre, sinon PPD ou hypothèque.</p>
            <p>Souscription de l'offre ADE CNP ou ADE Services dans le respect de la loi Lemoine sur la déliaison de l'assurance emprunteur.</p>
          </section>
          <section>
            <h4>Conditions particulières</h4>
            <p>En cas d'opération en VEFA, le taux retenu est celui correspondant à la durée globale du prêt, période d'utilisation incluse.</p>
            <p>Surcote de 10 bps si DPE E, F ou G.</p>
          </section>
        </div>
      </div>
    </>
  );
}

function createPalatineMatrix(rows: RateRow[], activeTab: PalatineScaleKey): PalatineMatrixRow[] {
  const scaleNeedle =
    activeTab === "banquePrivee" ? "Clientèle banque privée" : "Clientèle patrimoniale";
  const grouped = new Map<string, PalatineMatrixRow>();
  const filteredRows = rows.filter((row) => row.scale.includes(scaleNeedle));

  for (const row of filteredRows) {
    const current =
      grouped.get(row.durationLabel) ||
      ({
        durationLabel: row.durationLabel,
        durationYears: row.durationYears,
        rpRs: null,
        il: null,
        pmPat: null,
      } satisfies PalatineMatrixRow);

    if (row.profile === "Personne physique RP / RS") {
      current.rpRs = row.rate;
    }

    if (row.profile === "Personne physique IL") {
      current.il = row.rate;
    }

    if (row.profile === "PM PAT RP-RS-IL") {
      current.pmPat = row.rate;
    }

    grouped.set(row.durationLabel, current);
  }

  return Array.from(grouped.values()).sort((a, b) => a.durationYears - b.durationYears);
}

function createCaidfMatrix(rows: RateRow[]): CaidfMatrixRow[] {
  const grouped = new Map<string, CaidfMatrixRow>();

  for (const row of rows) {
    const current =
      grouped.get(row.durationLabel) ||
      ({
        durationLabel: row.durationLabel,
        durationYears: row.durationYears,
        premium: null,
        particulier: null,
      } satisfies CaidfMatrixRow);

    if (row.profile === "PREMIUM") {
      current.premium = row.rate;
    }

    if (row.profile === "PARTICULIER") {
      current.particulier = row.rate;
    }

    grouped.set(row.durationLabel, current);
  }

  return Array.from(grouped.values()).sort((a, b) => a.durationYears - b.durationYears);
}

function createFortuneoMatrix(rows: RateRow[]): FortuneoMatrixRow[] {
  const grouped = new Map<string, FortuneoMatrixRow>();

  for (const row of rows) {
    const current =
      grouped.get(row.durationLabel) ||
      ({
        durationLabel: row.durationLabel,
        durationYears: row.durationYears,
        profileA: null,
        profileB: null,
        profileC: null,
      } satisfies FortuneoMatrixRow);

    if (row.profile === "Profil 1 (A)") {
      current.profileA = row.rate;
    }

    if (row.profile === "Profil 2 (B)") {
      current.profileB = row.rate;
    }

    if (row.profile === "Profil 3 (C)") {
      current.profileC = row.rate;
    }

    grouped.set(row.durationLabel, current);
  }

  return Array.from(grouped.values()).sort((a, b) => a.durationYears - b.durationYears);
}

function createCasraMatrixTables(rows: RateRow[]) {
  const scales = ["RP prospects / RP - RS - RL clients", "RL-RS Prospects"];
  const profileDetails: Record<string, Pick<CasraMatrixRow, "singleBorrowerIncome" | "twoBorrowerIncome">> = {
    "0-40 k€ / 0-60 k€": { singleBorrowerIncome: "0-40 k€", twoBorrowerIncome: "0-60 k€" },
    ">40-50 k€ / >60-80 k€": { singleBorrowerIncome: ">40-50 k€", twoBorrowerIncome: ">60-80 k€" },
    ">50 k€ / >80 k€": { singleBorrowerIncome: ">50 k€", twoBorrowerIncome: ">80 k€" },
    ">150 k€": { singleBorrowerIncome: ">150 k€", twoBorrowerIncome: ">150 k€" },
  };

  return scales.map((scale) => {
    const grouped = new Map<string, CasraMatrixRow>();

    for (const row of rows.filter((item) => item.scale === scale)) {
      const details = profileDetails[row.profile];

      if (!details) {
        continue;
      }

      const current =
        grouped.get(row.profile) ||
        ({
          profile: row.profile,
          ...details,
          rates: {},
        } satisfies CasraMatrixRow);

      current.rates[row.durationLabel] = row.rate;
      grouped.set(row.profile, current);
    }

    return {
      scale,
      rows: Array.from(grouped.values()),
    };
  });
}

function createCeidfMatrix(rows: RateRow[], activeTab: CeidfCustomerKey): CeidfMatrixRow[] {
  const customerType = activeTab === "prospect" ? "Prospect" : "Client";
  const grouped = new Map<string, CeidfMatrixRow>();
  const profileOrder = ["BON", "TRES BON", "EXCELLENT", "EXCLUSIF"];

  for (const row of rows.filter((item) => item.customerType === customerType)) {
    const dpe = row.note || "";
    const key = `${row.profile}-${dpe}`;
    const current =
      grouped.get(key) ||
      ({
        profile: row.profile,
        dpe,
        rates: {},
      } satisfies CeidfMatrixRow);

    current.rates[row.durationLabel] = row.rate;
    grouped.set(key, current);
  }

  return Array.from(grouped.values()).sort((a, b) => {
    const profileDelta = profileOrder.indexOf(a.profile) - profileOrder.indexOf(b.profile);

    if (profileDelta !== 0) {
      return profileDelta;
    }

    return a.dpe.localeCompare(b.dpe);
  });
}

function createGenericMatrix(rows: RateRow[], rowKey: "profile" | "duration"): GenericMatrixRow[] {
  const grouped = new Map<string, GenericMatrixRow>();

  for (const row of rows) {
    const label = rowKey === "profile" ? row.profile : row.durationLabel;
    const column = rowKey === "profile" ? row.durationLabel : row.profile;
    const current =
      grouped.get(label) ||
      ({
        label,
        sortValue: rowKey === "profile" ? rows.findIndex((item) => item.profile === label) : row.durationYears,
        rates: {},
      } satisfies GenericMatrixRow);

    current.rates[column] = row.rate;
    grouped.set(label, current);
  }

  return Array.from(grouped.values()).sort((a, b) => a.sortValue - b.sortValue);
}

function createScaleTables(rows: RateRow[], rowKey: "profile" | "duration") {
  const scales = Array.from(new Set(rows.map((row) => row.scale)));

  return scales.map((scale) => {
    const scaleRows = rows.filter((row) => row.scale === scale);
    const columns = Array.from(new Set(scaleRows.map((row) => (rowKey === "profile" ? row.durationLabel : row.profile))));

    return {
      scale,
      columns,
      rows: createGenericMatrix(scaleRows, rowKey),
    };
  });
}

function createBredMatrix(rows: RateRow[]): BredMatrixRow[] {
  const grouped = new Map<string, BredMatrixRow>();

  for (const row of rows) {
    const current =
      grouped.get(row.durationLabel) ||
      ({
        durationLabel: row.durationLabel,
        durationYears: row.durationYears,
        bareme1: null,
        bareme2: null,
        bareme3: null,
        bareme4: null,
      } satisfies BredMatrixRow);

    if (row.profile === "Barème 1") {
      current.bareme1 = row.rate;
    }

    if (row.profile === "Barème 2") {
      current.bareme2 = row.rate;
    }

    if (row.profile === "Barème 3") {
      current.bareme3 = row.rate;
    }

    if (row.profile === "Barème 4") {
      current.bareme4 = row.rate;
    }

    grouped.set(row.durationLabel, current);
  }

  return Array.from(grouped.values()).sort((a, b) => a.durationYears - b.durationYears);
}

function createBprpMatrix(rows: RateRow[], activeTab: BprpTapKey): BprpMatrixRow[] {
  const profileByTab: Record<BprpTapKey, string> = {
    tapLt20: "TAP < 20%",
    tap20To30: "20% <= TAP < 30%",
    tapGte30: "TAP >= 30%",
  };
  const grouped = new Map<string, BprpMatrixRow>();
  const filteredRows = rows.filter((row) => row.profile === profileByTab[activeTab]);

  for (const row of filteredRows) {
    const current =
      grouped.get(row.durationLabel) ||
      ({
        durationLabel: row.durationLabel,
        durationYears: row.durationYears,
        incomeLt30: null,
        incomeGte30: null,
        incomeGte60: null,
      } satisfies BprpMatrixRow);

    if (row.note === "Revenus < 30 k€") {
      current.incomeLt30 = row.rate;
    }

    if (row.note === "Revenus >= 30 k€") {
      current.incomeGte30 = row.rate;
    }

    if (row.note === "Revenus >= 60 k€") {
      current.incomeGte60 = row.rate;
    }

    grouped.set(row.durationLabel, current);
  }

  return Array.from(grouped.values()).sort((a, b) => a.durationYears - b.durationYears);
}

function createSgMatrix(rows: RateRow[]): SgMatrixRow[] {
  const profileOrder = ["< 32 k€ / < 42 k€", "> 32 k€ / > 42 k€", "> 80 k€ / > 100 k€"];
  const profileDetails: Record<string, Pick<SgMatrixRow, "singleBorrowerIncome" | "twoBorrowerIncome">> = {
    "< 32 k€ / < 42 k€": { singleBorrowerIncome: "< 32 k€**", twoBorrowerIncome: "< 42 k€**" },
    "> 32 k€ / > 42 k€": { singleBorrowerIncome: "> 32 k€**", twoBorrowerIncome: "> 42 k€**" },
    "> 80 k€ / > 100 k€": { singleBorrowerIncome: "> 80 k€", twoBorrowerIncome: "> 100 k€" },
  };
  const grouped = new Map<string, SgMatrixRow>();

  for (const row of rows) {
    const durationKey = getSgDurationKey(row.durationLabel);
    const details = profileDetails[row.profile];

    if (!durationKey || !details) {
      continue;
    }

    const current =
      grouped.get(row.profile) ||
      ({
        profile: row.profile,
        ...details,
        rates: {
          relais: null,
          threeToSeven: null,
          sevenToTen: null,
          tenToTwelve: null,
          twelveToFifteen: null,
          fifteenToSeventeen: null,
          seventeenToTwenty: null,
          twentyToTwentyFive: null,
        },
      } satisfies SgMatrixRow);

    current.rates[durationKey] = row.rate;
    grouped.set(row.profile, current);
  }

  return Array.from(grouped.values()).sort((a, b) => profileOrder.indexOf(a.profile) - profileOrder.indexOf(b.profile));
}

function getSgDurationKey(durationLabel: string): SgDurationKey | null {
  switch (durationLabel) {
    case "Crédit relais indépendant":
      return "relais";
    case "Durée >= 3 ans et <= 7 ans":
      return "threeToSeven";
    case "Durée > 7 ans et <= 10 ans":
      return "sevenToTen";
    case "Durée > 10 ans et <= 12 ans":
      return "tenToTwelve";
    case "Durée > 12 ans et <= 15 ans":
      return "twelveToFifteen";
    case "Durée > 15 ans et <= 17 ans":
      return "fifteenToSeventeen";
    case "Durée > 17 ans et <= 20 ans":
      return "seventeenToTwenty";
    case "Durée > 20 ans et <= 25 ans":
      return "twentyToTwentyFive";
    default:
      return null;
  }
}

function PostalRateTable({ rows }: { rows: PostalMatrixRow[] }) {
  return (
    <>
      <div className="table-scroll">
        <table className="postal-rate-table">
          <thead>
            <tr>
              <th rowSpan={2}>Durées</th>
              <th colSpan={2}>Clients</th>
              <th colSpan={2}>Prospects</th>
            </tr>
            <tr>
              <th>Taux minimum</th>
              <th>Taux moyen</th>
              <th>Taux minimum</th>
              <th>Taux moyen</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.durationLabel}>
                <td>
                  <strong>{row.durationLabel}</strong>
                </td>
                <td className="rate-cell">{formatRate(row.clientMin)}</td>
                <td className="rate-cell">{formatRate(row.clientAverage)}</td>
                <td className="rate-cell">{formatRate(row.prospectMin)}</td>
                <td className="rate-cell">{formatRate(row.prospectAverage)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="rate-notes">
        <strong>À noter</strong>
        <ul>
          <li>Barème applicable au 04/05/2026, taux hors assurance.</li>
          <li>Prêt relais total 12 mois : 4,16 %. Prêt relais partiel 24 mois : 4,46 %.</li>
          <li>Frais de dossier : 1000 euros forfaitaires, plafonnés à 1 % pour les financements inférieurs ou égaux à 100 k€.</li>
          <li>Prêt Avenir Jeune : 1000 euros forfaitaires, plafonnés à 0,8 % pour les dossiers inférieurs à 125 k€.</li>
          <li>Dossier avec Prêt d’Accession Sociale : 500 euros forfaitaires.</li>
        </ul>
      </div>
    </>
  );
}

const ccfDurationColumns: { key: CcfDurationKey; label: string }[] = [
  { key: "relais", label: "Relais" },
  { key: "twoToSeven", label: "2 à 7 ans" },
  { key: "sevenToTen", label: "> 7 à 10 ans" },
  { key: "tenToFifteen", label: "> 10 à 15 ans" },
  { key: "fifteenToTwenty", label: "> 15 à 20 ans" },
  { key: "twentyToTwentyFive", label: "> 20 à 25 ans" },
];

function CcfRateTable({ rows }: { rows: CcfMatrixRow[] }) {
  return (
    <>
      <div className="table-scroll">
        <table className="ccf-rate-table">
          <thead>
            <tr>
              <th>Tranche</th>
              {ccfDurationColumns.map((column) => (
                <th key={column.key}>{column.label}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.profile}>
                <td>
                  <strong>{row.profile}</strong>
                </td>
                {row.profile === "T3" ? (
                  <td className="not-eligible-cell" colSpan={ccfDurationColumns.length}>
                    Non éligible
                  </td>
                ) : (
                  ccfDurationColumns.map((column) => (
                    <td className="rate-cell" key={column.key}>
                      {formatRate(row.rates[column.key])}
                    </td>
                  ))
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="rate-notes ccf-notes">
        <strong>À noter</strong>
        <div className="rate-note-groups">
          <section>
            <h4>Conditions de revenus</h4>
            <p>T0 : hors IDF couple &gt;= 110 k€, célibataire &gt;= 80 k€ ; IDF couple &gt;= 140 k€, célibataire &gt;= 90 k€.</p>
            <p>T1 : hors IDF couple &gt;= 80 k€, célibataire &gt;= 60 k€ ; IDF couple &gt;= 90 k€, célibataire &gt;= 70 k€.</p>
            <p>T2 : emprunteurs âge &lt;= 40 ans, hors IDF couple &gt;= 60 k€, célibataire &gt;= 40 k€ ; IDF couple &gt;= 70 k€, célibataire &gt;= 50 k€.</p>
            <p>T2 bis : emprunteurs âge &gt; 40 ans, mêmes seuils que T2. T3 : en deçà des seuils T2. Montant minimum hors relais : 80 k€.</p>
          </section>
          <section>
            <h4>HCSF et majorations</h4>
            <p>HCSF &gt; 35 % possible si les seuils RP sont atteints (IDF : couple 140 k€, mono 90 k€ ; hors IDF : couple 110 k€, mono 80 k€) ou si le prospect primo-accédant respecte la grille. Dans les autres cas : &lt;= 35 %.</p>
            <p>Majorations cumulatives : DPE A-B -10 bps, C-D-E +0 bps, F-G +20 bps, pas de note DPE +0 bps. Résidence locative : +10 bps.</p>
          </section>
          <section>
            <h4>Commissionnement et frais</h4>
            <p>Tranche 0 : 0,8 % plafonné à 4 500 €. Tranche 1 : 0,7 % plafonné à 3 000 €. Tranches 2 et 3 : 0,7 % plafonné à 2 000 €.</p>
            <p>Les prêts relais ne sont pas commissionnés. Dossiers clients : pas de commissionnement ; avec un co-emprunteur prospect : commission de 50 %. Frais de dossier : 1 000 € forfaitaires.</p>
          </section>
          <section>
            <h4>Montages</h4>
            <p>Éligibles : acquisition avec ou sans relais, VEFA, acquisition + travaux, rachat de prêts externes, relais rachat, Crédit Logement, hypothèque, nantissement fonds euro, personnes physiques.</p>
            <p>Éligibles à l'envoi automatique : acquisition seule sans travaux, ancien ou neuf achevé, personnes physiques, sans relais au dossier.</p>
            <p>Non éligibles : TNS hors droit/chiffres/santé et TNS multi-structures, personnes morales, non-résidents non clients CCF, prêt à 0 %, nantissement autre que 100 % fonds euro, démembrements, travaux seuls, in fine, PEL/CEL, indivision hors couples, VIR, monuments historiques, acquisition + relais + travaux, rachat de soulte + travaux, crédits relais seuls ou complexes, constructions.</p>
          </section>
        </div>
      </div>
    </>
  );
}

function createPostalMatrix(rows: RateRow[]): PostalMatrixRow[] {
  const amortizingRows = rows.filter((row) => row.scale === "Grille de taux prescripteur");
  const grouped = new Map<string, PostalMatrixRow>();

  for (const row of amortizingRows) {
    const current =
      grouped.get(row.durationLabel) ||
      ({
        durationLabel: row.durationLabel,
        durationYears: row.durationYears,
        clientMin: null,
        clientAverage: null,
        prospectMin: null,
        prospectAverage: null,
      } satisfies PostalMatrixRow);

    if (row.customerType === "Client" && row.profile === "Taux minimum") {
      current.clientMin = row.rate;
    }

    if (row.customerType === "Client" && row.profile === "Taux moyen") {
      current.clientAverage = row.rate;
    }

    if (row.customerType === "Prospect" && row.profile === "Taux minimum") {
      current.prospectMin = row.rate;
    }

    if (row.customerType === "Prospect" && row.profile === "Taux moyen") {
      current.prospectAverage = row.rate;
    }

    grouped.set(row.durationLabel, current);
  }

  return Array.from(grouped.values()).sort((a, b) => a.durationYears - b.durationYears);
}

function createCcfMatrix(rows: RateRow[]): CcfMatrixRow[] {
  const profileOrder = ["T0", "T1", "T2", "T2 bis", "T3"];
  const grouped = new Map<string, CcfMatrixRow>();

  for (const row of rows) {
    const durationKey = getCcfDurationKey(row.durationLabel);

    if (!durationKey) {
      continue;
    }

    const current =
      grouped.get(row.profile) ||
      ({
        profile: row.profile,
        note: row.note,
        rates: {
          relais: null,
          twoToSeven: null,
          sevenToTen: null,
          tenToFifteen: null,
          fifteenToTwenty: null,
          twentyToTwentyFive: null,
        },
      } satisfies CcfMatrixRow);

    current.rates[durationKey] = row.rate;
    grouped.set(row.profile, current);
  }

  return Array.from(grouped.values()).sort((a, b) => profileOrder.indexOf(a.profile) - profileOrder.indexOf(b.profile));
}

function getCcfDurationKey(durationLabel: string): CcfDurationKey | null {
  switch (durationLabel) {
    case "Relais":
      return "relais";
    case "2 à 7 ans":
      return "twoToSeven";
    case "> 7 à 10 ans":
      return "sevenToTen";
    case "> 10 à 15 ans":
      return "tenToFifteen";
    case "> 15 à 20 ans":
      return "fifteenToTwenty";
    case "> 20 à 25 ans":
      return "twentyToTwentyFive";
    default:
      return null;
  }
}

function BankLogo({ bank }: { bank: string }) {
  const logo = getBankLogo(bank);
  const isFullBleedCircleLogo = bank === "LCL";

  if (!logo) {
    return <span className="bank-logo-fallback">{getBankInitials(bank)}</span>;
  }

  return (
    <span className={`bank-logo-frame ${isFullBleedCircleLogo ? "full-bleed" : ""}`}>
      <Image className="bank-logo" src={logo} alt={`Logo ${bank}`} width={80} height={80} loading="lazy" />
    </span>
  );
}
