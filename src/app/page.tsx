import Image from "next/image";
import { RatesTable } from "@/components/RatesTable";
import { rateRows } from "@/lib/rates";

export default function Home() {
  return (
    <main>
      <header className="site-header">
        <a className="brand-lockup" href="#taux" aria-label="ezto taux des banques">
          <Image src="/ezto-logo.jpeg" alt="Logo ezto" width={92} height={60} priority />
        </a>
      </header>

      <section className="section-shell rates-only" id="taux">
        <div className="section-heading compact">
          <p className="eyebrow">Barèmes</p>
          <h1>Taux des banques</h1>
        </div>
        <RatesTable rows={rateRows} />
      </section>
    </main>
  );
}
