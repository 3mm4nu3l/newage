import { RatesTable } from "@/components/RatesTable";
import { getImportedRateRows } from "@/lib/db-rate-rows";
import { rateRows } from "@/lib/rates";

export default async function Home() {
  const importedRows = await getImportedRateRows();
  const rows = mergeRows(rateRows, importedRows);

  return (
    <main>
      <section className="section-shell rates-only" id="taux">
        <RatesTable rows={rows} />
      </section>
    </main>
  );
}

function mergeRows(baseRows: typeof rateRows, importedRows: Awaited<ReturnType<typeof getImportedRateRows>>) {
  const importedBanks = new Set(importedRows.map((row) => row.bank));
  return [...baseRows.filter((row) => !(importedBanks.has(row.bank) && row.status === "pending")), ...importedRows];
}
