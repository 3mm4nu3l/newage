export type RateStatus = "verified" | "review" | "pending";

export type RateRow = {
  id: string;
  bank: string;
  region: string;
  scale: string;
  customerType: string;
  profile: string;
  durationLabel: string;
  durationYears: number;
  rate: number | null;
  brokerBestRate: number | null;
  sourceDate: string;
  sourceFile: string;
  status: RateStatus;
  note?: string;
  importedMarkdown?: string;
};

function createLaBanquePostaleRows(): RateRow[] {
  const source = {
    bank: "La Banque Postale",
    region: "France",
    scale: "Grille de taux prescripteur",
    sourceDate: "2026-05-04",
    sourceFile: "Barème La Banque Postale - 4 mai 2026.pdf",
    status: "verified" as const,
  };

  const durations = [
    { label: "0 < D ≤ 5 ans", years: 5, clientMin: 2.95, clientAverage: 3.07, prospectMin: 3.0, prospectAverage: 3.12 },
    { label: "5 < D ≤ 10 ans", years: 10, clientMin: 3.21, clientAverage: 3.27, prospectMin: 3.26, prospectAverage: 3.37 },
    { label: "10 < D ≤ 12 ans", years: 12, clientMin: 3.29, clientAverage: 3.32, prospectMin: 3.34, prospectAverage: 3.42 },
    { label: "12 < D ≤ 15 ans", years: 15, clientMin: 3.35, clientAverage: 3.42, prospectMin: 3.4, prospectAverage: 3.52 },
    { label: "15 < D ≤ 18 ans", years: 18, clientMin: 3.39, clientAverage: 3.47, prospectMin: 3.44, prospectAverage: 3.57 },
    { label: "18 < D ≤ 20 ans", years: 20, clientMin: 3.4, clientAverage: 3.48, prospectMin: 3.45, prospectAverage: 3.58 },
    { label: "20 < D ≤ 22 ans", years: 22, clientMin: 3.4, clientAverage: 3.48, prospectMin: 3.45, prospectAverage: 3.67 },
    { label: "22 < D ≤ 25 ans", years: 25, clientMin: 3.4, clientAverage: 3.51, prospectMin: 3.45, prospectAverage: 3.72 },
  ];

  const amortizingRows = durations.flatMap((duration) => [
    {
      ...source,
      id: `lbp-client-min-${duration.years}`,
      customerType: "Client",
      profile: "Taux minimum",
      durationLabel: duration.label,
      durationYears: duration.years,
      rate: duration.clientMin,
      brokerBestRate: null,
    },
    {
      ...source,
      id: `lbp-client-moyen-${duration.years}`,
      customerType: "Client",
      profile: "Taux moyen",
      durationLabel: duration.label,
      durationYears: duration.years,
      rate: duration.clientAverage,
      brokerBestRate: null,
    },
    {
      ...source,
      id: `lbp-prospect-min-${duration.years}`,
      customerType: "Prospect",
      profile: "Taux minimum",
      durationLabel: duration.label,
      durationYears: duration.years,
      rate: duration.prospectMin,
      brokerBestRate: null,
    },
    {
      ...source,
      id: `lbp-prospect-moyen-${duration.years}`,
      customerType: "Prospect",
      profile: "Taux moyen",
      durationLabel: duration.label,
      durationYears: duration.years,
      rate: duration.prospectAverage,
      brokerBestRate: null,
    },
  ]);

  return [
    ...amortizingRows,
    {
      ...source,
      id: "lbp-relais-total-12",
      scale: "Prêt relais",
      customerType: "Tous",
      profile: "Prêt relais total 12 mois",
      durationLabel: "12 mois",
      durationYears: 1,
      rate: 4.16,
      brokerBestRate: null,
    },
    {
      ...source,
      id: "lbp-relais-partiel-24",
      scale: "Prêt relais",
      customerType: "Tous",
      profile: "Prêt relais partiel 24 mois",
      durationLabel: "24 mois",
      durationYears: 2,
      rate: 4.46,
      brokerBestRate: null,
    },
  ];
}

function createCcfRows(): RateRow[] {
  const source = {
    bank: "CCF",
    region: "IDF / hors IDF",
    scale: "Prospects emprunteurs personnes physiques",
    customerType: "Prospect",
    sourceDate: "2026-04-20",
    sourceFile: "Barème CCF - 20 avril 2026.pdf",
    status: "verified" as const,
  };

  const durations = [
    { key: "relais", label: "Relais", years: 2 },
    { key: "2-7", label: "2 à 7 ans", years: 7 },
    { key: "7-10", label: "> 7 à 10 ans", years: 10 },
    { key: "10-15", label: "> 10 à 15 ans", years: 15 },
    { key: "15-20", label: "> 15 à 20 ans", years: 20 },
    { key: "20-25", label: "> 20 à 25 ans", years: 25 },
  ];

  const tiers = [
    {
      key: "t0",
      profile: "T0",
      note: "Hors IDF : couple >= 110 k€, célibataire >= 80 k€. IDF : couple >= 140 k€, célibataire >= 90 k€.",
      rates: [3.2, 3.2, 3.2, 3.2, 3.25, 3.35],
    },
    {
      key: "t1",
      profile: "T1",
      note: "Hors IDF : couple >= 80 k€, célibataire >= 60 k€. IDF : couple >= 90 k€, célibataire >= 70 k€.",
      rates: [3.3, 3.3, 3.3, 3.3, 3.35, 3.45],
    },
    {
      key: "t2",
      profile: "T2",
      note: "Emprunteurs âge <= 40 ans. Hors IDF : couple >= 60 k€, célibataire >= 40 k€. IDF : couple >= 70 k€, célibataire >= 50 k€.",
      rates: [3.45, 3.45, 3.45, 3.45, 3.5, 3.6],
    },
    {
      key: "t2-bis",
      profile: "T2 bis",
      note: "Emprunteurs âge > 40 ans. Hors IDF : couple >= 60 k€, célibataire >= 40 k€. IDF : couple >= 70 k€, célibataire >= 50 k€.",
      rates: [3.75, 3.75, 3.75, 3.75, 3.8, 3.9],
    },
    {
      key: "t3",
      profile: "T3",
      note: "En deçà des seuils T2.",
      rates: [null, null, null, null, null, null],
    },
  ];

  return tiers.flatMap((tier) =>
    durations.map((duration, index) => ({
      ...source,
      id: `ccf-${tier.key}-${duration.key}`,
      profile: tier.profile,
      durationLabel: duration.label,
      durationYears: duration.years,
      rate: tier.rates[index],
      brokerBestRate: null,
      note: tier.note,
    })),
  );
}

function createSocieteGeneraleRows(): RateRow[] {
  const source = {
    bank: "Société Générale IDF",
    region: "IDF",
    scale: "Barème prescripteur IDF, taux nominaux",
    customerType: "Prospect",
    sourceDate: "2026-05-01",
    sourceFile: "Barème Société Générale - IDF Mai 2026.pdf",
    status: "verified" as const,
  };

  const durations = [
    { key: "relais", label: "Crédit relais indépendant", years: 2 },
    { key: "3-7", label: "Durée >= 3 ans et <= 7 ans", years: 7 },
    { key: "7-10", label: "Durée > 7 ans et <= 10 ans", years: 10 },
    { key: "10-12", label: "Durée > 10 ans et <= 12 ans", years: 12 },
    { key: "12-15", label: "Durée > 12 ans et <= 15 ans", years: 15 },
    { key: "15-17", label: "Durée > 15 ans et <= 17 ans", years: 17 },
    { key: "17-20", label: "Durée > 17 ans et <= 20 ans", years: 20 },
    { key: "20-25", label: "Durée > 20 ans et <= 25 ans", years: 25 },
  ];

  const profiles = [
    {
      key: "low",
      profile: "< 32 k€ / < 42 k€",
      note: "Revenus totaux : < 32 k€ pour 1 emprunteur, < 42 k€ pour 2 emprunteurs.",
      rates: [3.95, 3.5, 3.6, 3.75, 3.95, 3.95, 4.0, 4.05],
    },
    {
      key: "standard",
      profile: "> 32 k€ / > 42 k€",
      note: "Revenus totaux : > 32 k€ pour 1 emprunteur, > 42 k€ pour 2 emprunteurs.",
      rates: [3.7, 3.25, 3.35, 3.5, 3.7, 3.7, 3.75, 3.8],
    },
    {
      key: "premium",
      profile: "> 80 k€ / > 100 k€",
      note: "Revenus totaux : > 80 k€ pour 1 emprunteur, > 100 k€ pour 2 emprunteurs.",
      rates: [3.55, 3.1, 3.2, 3.35, 3.55, 3.55, 3.6, 3.65],
    },
  ];

  return profiles.flatMap((profile) =>
    durations.map((duration, index) => ({
      ...source,
      id: `sg-idf-${profile.key}-${duration.key}`,
      profile: profile.profile,
      durationLabel: duration.label,
      durationYears: duration.years,
      rate: profile.rates[index],
      brokerBestRate: null,
      note: profile.note,
    })),
  );
}

function createBanquePopulaireRivesDeParisRows(): RateRow[] {
  const source = {
    bank: "Banque Populaire Rives de Paris",
    region: "IDF",
    scale: "Prêt Riv'Immo Modulation",
    customerType: "Prospect",
    sourceDate: "2026-05-04",
    sourceFile: "Barème Banque Populaire Rives de Paris - 4 mai 2026.pdf",
    status: "verified" as const,
  };

  const tables = [
    {
      key: "tap-lt-20",
      profile: "TAP < 20%",
      rates: {
        5: [3.3, 3.2, 3.0],
        10: [3.55, 3.45, 3.25],
        15: [3.75, 3.65, 3.45],
        20: [4.0, 3.9, 3.7],
        25: [4.1, 4.0, 3.8],
      },
    },
    {
      key: "tap-20-30",
      profile: "20% <= TAP < 30%",
      rates: {
        5: [3.2, 3.1, 2.9],
        10: [3.45, 3.35, 3.15],
        15: [3.65, 3.55, 3.35],
        20: [3.9, 3.8, 3.6],
        25: [4.0, 3.9, 3.7],
      },
    },
    {
      key: "tap-gte-30",
      profile: "TAP >= 30%",
      rates: {
        5: [3.1, 3.0, 2.8],
        10: [3.35, 3.25, 3.05],
        15: [3.55, 3.45, 3.25],
        20: [3.8, 3.7, 3.5],
        25: [3.9, 3.8, 3.6],
      },
    },
  ];

  const incomeProfiles = ["Revenus < 30 k€", "Revenus >= 30 k€", "Revenus >= 60 k€"];
  const durations = [5, 10, 15, 20, 25];

  return tables.flatMap((table) =>
    durations.flatMap((duration) =>
      table.rates[duration as keyof typeof table.rates].map((rate, incomeIndex) => ({
        ...source,
        id: `bprp-${table.key}-${duration}-${incomeIndex}`,
        profile: table.profile,
        durationLabel: `${duration} ans`,
        durationYears: duration,
        rate,
        brokerBestRate: null,
        note: incomeProfiles[incomeIndex],
      })),
    ),
  );
}

function createBanquePopulaireValDeFranceRows(): RateRow[] {
  const source = {
    bank: "Banque Populaire Val de France",
    region: "IDF et province",
    scale: "Barème unique courtiers",
    customerType: "Tous",
    profile: "Grille unique IDF et Province",
    sourceDate: "2026-05-04",
    sourceFile: "Barème BPVF - Mai 2026.pdf",
    status: "verified" as const,
  };

  const durations = [
    { label: "Jusqu'à 84 mois", years: 7, rate: 3.5 },
    { label: "85 à 120 mois", years: 10, rate: 3.55 },
    { label: "121 à 180 mois", years: 15, rate: 3.6 },
    { label: "181 à 240 mois", years: 20, rate: 3.7 },
    { label: "241 à 300 mois", years: 25, rate: 3.9 },
  ];

  return durations.map((duration) => ({
    ...source,
    id: `bpvf-${duration.years}`,
    durationLabel: duration.label,
    durationYears: duration.years,
    rate: duration.rate,
    brokerBestRate: null,
  }));
}

function createCasraRows(): RateRow[] {
  const source = {
    bank: "Crédit Agricole Sud Rhône Alpes",
    region: "Sud Rhône Alpes",
    customerType: "Prospect",
    sourceDate: "2026-05-01",
    sourceFile: "Barème RP Crédit Agricole Sud Rhône Alpes (CASRA) - Mai 2026.pdf",
    status: "verified" as const,
  };

  const durations = [
    { label: "10 ans", years: 10 },
    { label: "12 ans", years: 12 },
    { label: "15 ans", years: 15 },
    { label: "20 ans", years: 20 },
    { label: "25 ans", years: 25 },
  ];

  const tables = [
    {
      key: "rp-clients",
      scale: "RP prospects / RP - RS - RL clients",
      rows: [
        { key: "low", profile: "0-40 k€ / 0-60 k€", note: "1 emprunteur : 0-40 k€. 2 emprunteurs : 0-60 k€.", rates: [3.4, 3.5, 3.55, 3.65, 3.8] },
        { key: "mid", profile: ">40-50 k€ / >60-80 k€", note: "1 emprunteur : >40-50 k€. 2 emprunteurs : >60-80 k€.", rates: [3.3, 3.4, 3.45, 3.55, 3.7] },
        { key: "high", profile: ">50 k€ / >80 k€", note: "1 emprunteur : >50 k€. 2 emprunteurs : >80 k€.", rates: [3.2, 3.3, 3.35, 3.45, 3.6] },
        { key: "premium", profile: ">150 k€", note: "Revenus > 150 k€.", rates: [3.1, 3.2, 3.25, 3.35, 3.5] },
      ],
    },
    {
      key: "rl-rs-prospects",
      scale: "RL-RS Prospects",
      rows: [
        { key: "low", profile: "0-40 k€ / 0-60 k€", note: "1 emprunteur : 0-40 k€. 2 emprunteurs : 0-60 k€.", rates: [3.6, 3.7, 3.75, 3.85, 4.0] },
        { key: "mid", profile: ">40-50 k€ / >60-80 k€", note: "1 emprunteur : >40-50 k€. 2 emprunteurs : >60-80 k€.", rates: [3.5, 3.6, 3.65, 3.75, 3.9] },
        { key: "high", profile: ">50 k€ / >80 k€", note: "1 emprunteur : >50 k€. 2 emprunteurs : >80 k€.", rates: [3.4, 3.5, 3.55, 3.65, 3.8] },
        { key: "premium", profile: ">150 k€", note: "Revenus > 150 k€.", rates: [3.3, 3.4, 3.45, 3.55, 3.7] },
      ],
    },
  ];

  return tables.flatMap((table) =>
    table.rows.flatMap((profileRow) =>
      durations.map((duration, index) => ({
        ...source,
        id: `casra-${table.key}-${profileRow.key}-${duration.years}`,
        scale: table.scale,
        profile: profileRow.profile,
        durationLabel: duration.label,
        durationYears: duration.years,
        rate: profileRow.rates[index],
        brokerBestRate: null,
        note: profileRow.note,
      })),
    ),
  );
}

function createFortuneoRows(): RateRow[] {
  const source = {
    bank: "Fortuneo",
    region: "France",
    scale: "Barème profils A/B/C",
    customerType: "Tous",
    sourceDate: "2026-04-07",
    sourceFile: "Barème FORTUNEO - Avril 2026.pdf",
    status: "verified" as const,
  };

  const durations = [
    { years: 7, a: 3.34, b: 3.29, c: 3.24 },
    { years: 8, a: 3.41, b: 3.36, c: 3.31 },
    { years: 9, a: 3.46, b: 3.41, c: 3.36 },
    { years: 10, a: 3.47, b: 3.42, c: 3.37 },
    { years: 11, a: 3.52, b: 3.47, c: 3.42 },
    { years: 12, a: 3.56, b: 3.51, c: 3.46 },
    { years: 13, a: 3.59, b: 3.54, c: 3.49 },
    { years: 14, a: 3.64, b: 3.59, c: 3.54 },
    { years: 15, a: 3.67, b: 3.62, c: 3.57 },
    { years: 16, a: 3.71, b: 3.66, c: 3.61 },
    { years: 17, a: 3.75, b: 3.7, c: 3.65 },
    { years: 18, a: 3.79, b: 3.74, c: 3.69 },
    { years: 19, a: 3.82, b: 3.77, c: 3.72 },
    { years: 20, a: 3.85, b: 3.8, c: 3.75 },
    { years: 21, a: 3.89, b: 3.84, c: 3.79 },
    { years: 22, a: 3.91, b: 3.86, c: 3.81 },
    { years: 23, a: 3.92, b: 3.87, c: 3.82 },
    { years: 24, a: 3.95, b: 3.9, c: 3.85 },
    { years: 25, a: 3.97, b: 3.92, c: 3.87 },
  ];

  return durations.flatMap((duration) => [
    {
      ...source,
      id: `fortuneo-a-${duration.years}`,
      profile: "Profil 1 (A)",
      durationLabel: `${duration.years} ans`,
      durationYears: duration.years,
      rate: duration.a,
      brokerBestRate: null,
    },
    {
      ...source,
      id: `fortuneo-b-${duration.years}`,
      profile: "Profil 2 (B)",
      durationLabel: `${duration.years} ans`,
      durationYears: duration.years,
      rate: duration.b,
      brokerBestRate: null,
    },
    {
      ...source,
      id: `fortuneo-c-${duration.years}`,
      profile: "Profil 3 (C)",
      durationLabel: `${duration.years} ans`,
      durationYears: duration.years,
      rate: duration.c,
      brokerBestRate: null,
    },
  ]);
}

function createPalatineRows(): RateRow[] {
  const durations = [
    { label: "5 ans", years: 5, rpRs: 2.95, il: 3.05, pmPat: 3.2 },
    { label: "7 ans", years: 7, rpRs: 2.95, il: 3.05, pmPat: 3.2 },
    { label: "10 ans", years: 10, rpRs: 3.0, il: 3.1, pmPat: 3.25 },
    { label: "12 ans", years: 12, rpRs: 3.0, il: 3.1, pmPat: 3.25 },
    { label: "15 ans", years: 15, rpRs: 3.05, il: 3.15, pmPat: 3.3 },
    { label: "17 ans", years: 17, rpRs: 3.1, il: 3.2, pmPat: 3.35 },
    { label: "18 ans", years: 18, rpRs: 3.15, il: 3.25, pmPat: 3.4 },
    { label: "20 ans", years: 20, rpRs: 3.2, il: 3.3, pmPat: 3.45 },
    { label: "22 ans", years: 22, rpRs: 3.25, il: 3.35, pmPat: 3.5 },
    { label: "25 ans", years: 25, rpRs: 3.3, il: 3.4, pmPat: 3.55 },
  ];

  const scales = [
    {
      key: "patrimoniale",
      scale: "Clientèle patrimoniale, prêts amortissables HARMONIE taux fixe",
      sourceFile: "Barème PALATINE - Clientèle Patrimoniale - rev entre 100 et 150 k€ - Avril 2026.pdf",
    },
    {
      key: "banque-privee",
      scale: "Clientèle banque privée, prêts amortissables HARMONIE taux fixe",
      sourceFile: "Barème PALATINE - Clientèle Banque Privée - rev. sup 150k€ - Avril 2026.pdf",
    },
  ];

  return scales.flatMap((scale) =>
    durations.flatMap((duration) => [
      {
        bank: "Palatine",
        region: "France",
        scale: scale.scale,
        customerType: "Client",
        sourceDate: "2026-04-01",
        sourceFile: scale.sourceFile,
        status: "verified" as const,
        id: `palatine-${scale.key}-rp-rs-${duration.years}`,
        profile: "Personne physique RP / RS",
        durationLabel: duration.label,
        durationYears: duration.years,
        rate: duration.rpRs,
        brokerBestRate: null,
      },
      {
        bank: "Palatine",
        region: "France",
        scale: scale.scale,
        customerType: "Client",
        sourceDate: "2026-04-01",
        sourceFile: scale.sourceFile,
        status: "verified" as const,
        id: `palatine-${scale.key}-il-${duration.years}`,
        profile: "Personne physique IL",
        durationLabel: duration.label,
        durationYears: duration.years,
        rate: duration.il,
        brokerBestRate: null,
      },
      {
        bank: "Palatine",
        region: "France",
        scale: scale.scale,
        customerType: "Client",
        sourceDate: "2026-04-01",
        sourceFile: scale.sourceFile,
        status: "verified" as const,
        id: `palatine-${scale.key}-pm-pat-${duration.years}`,
        profile: "PM PAT RP-RS-IL",
        durationLabel: duration.label,
        durationYears: duration.years,
        rate: duration.pmPat,
        brokerBestRate: null,
      },
    ]),
  );
}

function createCreditAgricoleIdfRows(): RateRow[] {
  const source = {
    bank: "Crédit Agricole IDF",
    region: "IDF",
    scale: "Gamme de barèmes Facilimmo à échéance modulable",
    customerType: "Tous",
    sourceDate: "2026-04-07",
    sourceFile: "Barème CA IDF au 7 avril 2026.pdf",
    status: "verified" as const,
  };

  const durations = [
    { label: "<= 7 ans", years: 7, premium: 3.34, particulier: 3.44 },
    { label: "> 7 et <= 10 ans", years: 10, premium: 3.34, particulier: 3.44 },
    { label: "> 10 et <= 12 ans", years: 12, premium: 3.34, particulier: 3.44 },
    { label: "> 12 et <= 15 ans", years: 15, premium: 3.36, particulier: 3.46 },
    { label: "> 15 et <= 20 ans", years: 20, premium: 3.41, particulier: 3.58 },
    { label: "> 20 et <= 25 ans", years: 25, premium: 3.51, particulier: 3.7 },
  ];

  return durations.flatMap((duration) => [
    {
      ...source,
      id: `caidf-premium-${duration.years}`,
      profile: "PREMIUM",
      durationLabel: duration.label,
      durationYears: duration.years,
      rate: duration.premium,
      brokerBestRate: null,
      note: "Apport préconisé >= 10% du projet",
    },
    {
      ...source,
      id: `caidf-particulier-${duration.years}`,
      profile: "PARTICULIER",
      durationLabel: duration.label,
      durationYears: duration.years,
      rate: duration.particulier,
      brokerBestRate: null,
      note: "Apport préconisé >= 15% du projet",
    },
  ]);
}

function createCaisseEpargneIdfRows(): RateRow[] {
  const durations = [
    { label: "<= 7 ans", years: 7 },
    { label: "<= 10 ans", years: 10 },
    { label: "<= 12 ans", years: 12 },
    { label: "<= 15 ans", years: 15 },
    { label: "<= 18 ans", years: 18 },
    { label: "<= 20 ans", years: 20 },
    { label: "<= 25 ans", years: 25 },
    { label: "<= 30 ans", years: 30 },
  ];

  const tables = [
    {
      key: "prospect",
      customerType: "Prospect",
      scale: "Prescription prospects",
      sourceFile: "Barème prospect CE IDF - Mai 2026.pdf",
      rows: [
        { key: "bon-sans", profile: "BON", note: "DPE E, F, G, sans DPE", rates: [3.65, 3.65, 3.65, 3.65, 3.75, 3.9, 4.05, null] },
        { key: "bon-neuf", profile: "BON", note: "DPE A, B, C, D, neuf", rates: [3.55, 3.55, 3.55, 3.55, 3.65, 3.8, 3.95, null] },
        { key: "tres-bon-sans", profile: "TRES BON", note: "DPE E, F, G, sans DPE", rates: [3.6, 3.6, 3.6, 3.6, 3.7, 3.75, 3.9, 4.0] },
        { key: "tres-bon-neuf", profile: "TRES BON", note: "DPE A, B, C, D, neuf", rates: [3.5, 3.5, 3.5, 3.5, 3.6, 3.65, 3.8, 3.9] },
        { key: "excellent-sans", profile: "EXCELLENT", note: "DPE E, F, G, sans DPE", rates: [3.5, 3.5, 3.5, 3.5, 3.6, 3.6, 3.75, 3.85] },
        { key: "excellent-neuf", profile: "EXCELLENT", note: "DPE A, B, C, D, neuf", rates: [3.4, 3.4, 3.4, 3.4, 3.5, 3.5, 3.65, 3.75] },
        { key: "exclusif-sans", profile: "EXCLUSIF", note: "DPE E, F, G, sans DPE", rates: [3.4, 3.4, 3.4, 3.4, 3.5, 3.5, 3.65, 3.75] },
        { key: "exclusif-neuf", profile: "EXCLUSIF", note: "DPE A, B, C, D, neuf", rates: [3.3, 3.3, 3.3, 3.3, 3.4, 3.4, 3.55, 3.65] },
      ],
    },
    {
      key: "client",
      customerType: "Client",
      scale: "Prescription clients",
      sourceFile: "Barème Client CE IDF - Mai 2026.pdf",
      rows: [
        { key: "bon-sans", profile: "BON", note: "DPE E, F, G, sans DPE", rates: [3.55, 3.55, 3.55, 3.55, 3.65, 3.8, 3.95, 4.05] },
        { key: "bon-neuf", profile: "BON", note: "DPE A, B, C, D, neuf", rates: [3.45, 3.45, 3.45, 3.45, 3.55, 3.7, 3.85, 3.95] },
        { key: "tres-bon-sans", profile: "TRES BON", note: "DPE E, F, G, sans DPE", rates: [3.5, 3.5, 3.5, 3.5, 3.6, 3.65, 3.8, 3.9] },
        { key: "tres-bon-neuf", profile: "TRES BON", note: "DPE A, B, C, D, neuf", rates: [3.4, 3.4, 3.4, 3.4, 3.5, 3.55, 3.7, 3.8] },
        { key: "excellent-sans", profile: "EXCELLENT", note: "DPE E, F, G, sans DPE", rates: [3.4, 3.4, 3.4, 3.4, 3.5, 3.5, 3.65, 3.75] },
        { key: "excellent-neuf", profile: "EXCELLENT", note: "DPE A, B, C, D, neuf", rates: [3.3, 3.3, 3.3, 3.3, 3.4, 3.4, 3.55, 3.65] },
        { key: "exclusif-sans", profile: "EXCLUSIF", note: "DPE E, F, G, sans DPE", rates: [3.3, 3.3, 3.3, 3.3, 3.4, 3.4, 3.55, 3.65] },
        { key: "exclusif-neuf", profile: "EXCLUSIF", note: "DPE A, B, C, D, neuf", rates: [3.2, 3.2, 3.2, 3.2, 3.3, 3.3, 3.45, 3.55] },
      ],
    },
  ];

  return tables.flatMap((table) =>
    table.rows.flatMap((profileRow) =>
      durations.map((duration, index) => ({
        bank: "Caisse d'Épargne IDF",
        region: "IDF",
        scale: table.scale,
        customerType: table.customerType,
        sourceDate: "2026-05-01",
        sourceFile: table.sourceFile,
        status: "verified" as const,
        id: `ceidf-${table.key}-${profileRow.key}-${duration.years}`,
        profile: profileRow.profile,
        durationLabel: duration.label,
        durationYears: duration.years,
        rate: profileRow.rates[index],
        brokerBestRate: null,
        note: profileRow.note,
      })),
    ),
  );
}

function createBredMetropoleRows(): RateRow[] {
  const source = {
    bank: "BRED Métropole",
    region: "Métropole",
    scale: "Prescription Métropole",
    customerType: "Prospect",
    sourceDate: "2026-05-07",
    sourceFile: "Barème BRED Métropole - Mai 2026.pdf",
    status: "verified" as const,
  };

  const durations = [
    { label: "5 ans", years: 5, rates: [3.45, 3.35, 3.25, 3.15] },
    { label: "6 ans", years: 6, rates: [3.52, 3.42, 3.32, 3.22] },
    { label: "7 ans", years: 7, rates: [3.54, 3.44, 3.34, 3.24] },
    { label: "<= 8 ans", years: 8, rates: [3.55, 3.45, 3.35, 3.25] },
    { label: "<= 10 ans", years: 10, rates: [3.67, 3.57, 3.47, 3.37] },
    { label: "<= 12 ans", years: 12, rates: [3.71, 3.61, 3.51, 3.41] },
    { label: "<= 15 ans", years: 15, rates: [3.73, 3.63, 3.53, 3.43] },
    { label: "<= 18 ans", years: 18, rates: [3.75, 3.65, 3.45, 3.45] },
    { label: "<= 20 ans", years: 20, rates: [3.77, 3.67, 3.57, 3.47] },
    { label: "<= 25 ans", years: 25, rates: [3.85, 3.7, 3.65, 3.55] },
  ];
  const profiles = [
    { key: "bareme-1", profile: "Barème 1", note: "1 emprunteur < 30 k€ ou 2 emprunteurs < 50 k€. Casden éligible : utiliser barème 1." },
    { key: "bareme-2", profile: "Barème 2", note: "1 emprunteur > 30 k€ et < 50 k€, ou 2 emprunteurs > 50 k€ et < 80 k€." },
    { key: "bareme-3", profile: "Barème 3", note: "1 emprunteur > 50 k€ et < 90 k€, ou 2 emprunteurs > 80 k€ et < 120 k€." },
    { key: "bareme-4", profile: "Barème 4", note: "1 emprunteur > 90 k€ ou 2 emprunteurs > 120 k€." },
  ];

  return durations.flatMap((duration) =>
    profiles.map((profile, index) => ({
      ...source,
      id: `bred-${profile.key}-${duration.years}`,
      profile: profile.profile,
      durationLabel: duration.label,
      durationYears: duration.years,
      rate: duration.rates[index],
      brokerBestRate: null,
      note: profile.note,
    })),
  );
}

function createBnpParibasRows(bank: "BNP Paribas" | "Hello bank!"): RateRow[] {
  const source = {
    bank,
    region: "France",
    scale: "Barème Prescription Immobilière",
    customerType: "Prospect",
    sourceDate: "2026-04-20",
    sourceFile: "Barème BNPP et HELLO BANK au 20 Avril 2026.pdf",
    status: "verified" as const,
  };
  const durations = [
    { key: "relais", label: "Relais", years: 2 },
    { key: "lt5", label: "Moins de 5 ans", years: 5 },
    { key: "6-9", label: "6 à 9 ans", years: 9 },
    { key: "10-15", label: "10 à 15 ans", years: 15 },
    { key: "16-19", label: "16 à 19 ans", years: 19 },
    { key: "20-25", label: "20 à 25 ans", years: 25 },
  ];
  const profiles = [
    { key: "low", profile: "Moins de 30 k€ / moins de 60 k€", note: "1 emprunteur : moins de 30 k€. 2 emprunteurs : moins de 60 k€.", rates: [3.7, 3.7, 3.7, 3.8, 3.9, 4.0] },
    { key: "mid", profile: "30 k€ à moins de 65 k€ / 60 k€ à moins de 75 k€", note: "1 emprunteur : 30 k€ à moins de 65 k€. 2 emprunteurs : 60 k€ à moins de 75 k€.", rates: [3.55, 3.55, 3.55, 3.65, 3.75, 3.85] },
    { key: "high", profile: "65 k€ à moins de 90 k€ / 75 k€ à moins de 120 k€", note: "1 emprunteur : 65 k€ à moins de 90 k€. 2 emprunteurs : 75 k€ à moins de 120 k€.", rates: [3.35, 3.35, 3.35, 3.45, 3.55, 3.65] },
    { key: "premium", profile: "Plus de 90 k€ / plus de 120 k€", note: "1 emprunteur : plus de 90 k€. 2 emprunteurs : plus de 120 k€.", rates: [3.1, 3.1, 3.1, 3.2, 3.3, 3.4] },
  ];

  return profiles.flatMap((profile) =>
    durations.map((duration, index) => ({
      ...source,
      id: `${bank === "BNP Paribas" ? "bnpp" : "hello"}-${profile.key}-${duration.key}`,
      profile: profile.profile,
      durationLabel: duration.label,
      durationYears: duration.years,
      rate: profile.rates[index],
      brokerBestRate: null,
      note: profile.note,
    })),
  );
}

function createBpbfcRows(): RateRow[] {
  const source = {
    bank: "Banque Populaire Bourgogne Franche-Comté",
    region: "Bourgogne Franche-Comté",
    customerType: "Tous",
    sourceDate: "2025-12-01",
    sourceFile: "BAREME BPBFC -Décembre 2025.pdf",
    status: "verified" as const,
  };
  const euroDurations = [
    { label: "≤ 7 ans", years: 7, rates: [3.21, 3.11, 2.91] },
    { label: "> 7 ans et ≤ 10 ans", years: 10, rates: [3.31, 3.21, 3.01] },
    { label: "> 10 ans et ≤ 12 ans", years: 12, rates: [3.41, 3.31, 3.11] },
    { label: "> 12 ans et ≤ 15 ans", years: 15, rates: [3.51, 3.41, 3.11] },
    { label: "> 15 ans et ≤ 20 ans", years: 20, rates: [3.61, 3.51, 3.21] },
    { label: "> 20 ans et ≤ 25 ans", years: 25, rates: [3.71, 3.61, 3.31] },
  ];
  const euroProfiles = [
    { key: "standard", profile: "Standard", note: "CASDEN ou revenus inférieurs à 45 k€ célibataire et 60 k€ couple." },
    { key: "premium", profile: "Premium", note: "Revenus supérieurs à 45 k€ célibataire et 60 k€ couple." },
    { key: "excellium", profile: "Excellium", note: "Revenus supérieurs à 60 k€ célibataire et 80 k€ couple." },
  ];
  const chfDurations = [
    { label: "≤ 7 ans", years: 7, rates: [2.2, 1.8] },
    { label: "> 7 ans et ≤ 10 ans", years: 10, rates: [2.2, 1.8] },
    { label: "> 10 ans et ≤ 15 ans", years: 15, rates: [2.4, 1.87] },
    { label: "> 15 ans et ≤ 20 ans", years: 20, rates: [2.45, 2.05] },
    { label: "> 20 ans et ≤ 25 ans", years: 25, rates: [2.5, 2.15] },
  ];
  const chfProfiles = [
    { key: "standard", profile: "Standard CHF", note: "Prêt en CHF. Revenus inférieurs à 30 k€ célibataire ou 45 k€ couple." },
    { key: "premium", profile: "Premium CHF", note: "Prêt en CHF. Revenus supérieurs à 30 k€ célibataire ou 45 k€ couple." },
  ];

  return [
    ...euroDurations.flatMap((duration) =>
      euroProfiles.map((profile, index) => ({
        ...source,
        id: `bpbfc-eur-${profile.key}-${duration.years}`,
        scale: "Prêts en euros",
        profile: profile.profile,
        durationLabel: duration.label,
        durationYears: duration.years,
        rate: duration.rates[index],
        brokerBestRate: null,
        note: profile.note,
      })),
    ),
    ...chfDurations.flatMap((duration) =>
      chfProfiles.map((profile, index) => ({
        ...source,
        id: `bpbfc-chf-${profile.key}-${duration.years}`,
        scale: "Prêts en CHF",
        profile: profile.profile,
        durationLabel: duration.label,
        durationYears: duration.years,
        rate: duration.rates[index],
        brokerBestRate: null,
        note: `${profile.note} Frais de dossier : 0,5 %, minimum 600 €. Jeunes actifs 18-28 ans : 200 €.`,
      })),
    ),
    {
      ...source,
      id: "bpbfc-relais",
      scale: "Prêt relais",
      profile: "Prêt relais / prêt relais rachat",
      durationLabel: "Barème 7 ans + 0,25 %",
      durationYears: 7,
      rate: 3.46,
      brokerBestRate: null,
      note: "Spécificité : barème sur durée 7 ans + 0,25 %. Calculé sur Standard euros 7 ans.",
    },
  ];
}

function createCreditAgricoleBriePicardieRows(): RateRow[] {
  const source = {
    bank: "Crédit Agricole Brie Picardie",
    region: "Brie Picardie",
    customerType: "Tous",
    sourceDate: "2026-04-28",
    sourceFile: "Barème CA Brie Picardie au 28 avril 2026.pdf",
    status: "verified" as const,
  };
  const durations = [
    { label: "10 ans", years: 10, rates: [3.35, 3.55, 3.65] },
    { label: "12 ans", years: 12, rates: [3.45, 3.75, 3.85] },
    { label: "15 ans", years: 15, rates: [3.45, 3.75, 3.85] },
    { label: "18 ans", years: 18, rates: [3.6, 3.9, 4.0] },
    { label: "20 ans", years: 20, rates: [3.6, 3.9, 4.0] },
    { label: "24 ans", years: 24, rates: [3.75, 4.0, 4.1] },
    { label: "25 ans", years: 25, rates: [3.75, 4.0, 4.1] },
  ];
  const profiles = [
    { key: "or", profile: "Barème Or", note: "Couple +65 k€ / célibataire +40 k€." },
    { key: "argent", profile: "Barème Argent", note: "Couple 50 k€ à 65 k€ / célibataire 30 k€ à 40 k€." },
    { key: "bronze", profile: "Barème Bronze", note: "Couple < 50 k€ / célibataire < 30 k€." },
  ];
  const variableRows = [
    { label: "15 ans", years: 15, rate: 3.1 },
    { label: "20 ans", years: 20, rate: 3.15 },
    { label: "25 ans", years: 25, rate: 3.25 },
  ];

  return [
    ...durations.flatMap((duration) =>
      profiles.map((profile, index) => ({
        ...source,
        id: `cabp-fixe-${profile.key}-${duration.years}`,
        scale: "Taux fixe",
        profile: profile.profile,
        durationLabel: duration.label,
        durationYears: duration.years,
        rate: duration.rates[index],
        brokerBestRate: null,
        note: profile.note,
      })),
    ),
    ...variableRows.map((duration) => ({
      ...source,
      id: `cabp-g2-${duration.years}`,
      scale: "Taux révisable G2",
      profile: "Barème unique",
      durationLabel: duration.label,
      durationYears: duration.years,
      rate: duration.rate,
      brokerBestRate: null,
      note: "Offre G2 différenciante, cumulative possible selon guide courtier.",
    })),
  ];
}

function createBcpRows(): RateRow[] {
  const source = {
    bank: "BCP",
    region: "France",
    scale: "Barème clients / prospects",
    customerType: "Tous",
    sourceDate: "2026-05-15",
    sourceFile: "Barème BCP - 15 mai 2026.pdf",
    status: "verified" as const,
  };
  const durations = [
    { label: "≤ 15 ans", years: 15, rate: 3.75 },
    { label: "> 15 et ≤ 20 ans", years: 20, rate: 3.89 },
    { label: "> 20 et ≤ 25 ans", years: 25, rate: 3.99 },
  ];

  return durations.map((duration) => ({
    ...source,
    id: `bcp-${duration.years}`,
    profile: "Clients / prospects",
    durationLabel: duration.label,
    durationYears: duration.years,
    rate: duration.rate,
    brokerBestRate: null,
    note: "Proposition commerciale valable 15 jours. Dossiers Portugal : consulter la banque. Frais dossier simple min. 950 €, relais min. 1000 €, complexe/Portugal min. 1250 €.",
  }));
}

export const rateRows: RateRow[] = [
  ...createSocieteGeneraleRows(),
  ...createBnpParibasRows("BNP Paribas"),
  ...createBnpParibasRows("Hello bank!"),
  ...createBpbfcRows(),
  ...createCreditAgricoleBriePicardieRows(),
  ...createBcpRows(),
  ...createCaisseEpargneIdfRows(),
  ...createBanquePopulaireValDeFranceRows(),
  ...createBanquePopulaireRivesDeParisRows(),
  ...createBredMetropoleRows(),
  ...createLaBanquePostaleRows(),
  ...createCasraRows(),
  ...createCcfRows(),
  ...createCreditAgricoleIdfRows(),
  ...createPalatineRows(),
  ...createFortuneoRows(),
  {
    id: "lcl-pending",
    bank: "LCL",
    region: "France",
    scale: "Courtiers",
    customerType: "Prospect",
    profile: "À importer",
    durationLabel: "À préciser",
    durationYears: 0,
    rate: null,
    brokerBestRate: null,
    sourceDate: "2026-02-01",
    sourceFile: "Barème LCL - Février 2026.docx",
    status: "pending",
    note: "Document à traiter avec un extracteur DOCX dédié.",
  },
];

export const partners = Array.from(new Set(rateRows.map((row) => row.bank))).sort();

export const durations = Array.from(
  new Set(rateRows.filter((row) => row.durationYears > 0).map((row) => row.durationYears)),
).sort((a, b) => a - b);

export const statusLabels: Record<RateStatus, string> = {
  verified: "Vérifié",
  review: "À contrôler",
  pending: "À importer",
};

export function formatRate(rate: number | null) {
  if (rate === null) {
    return "—";
  }

  return `${rate.toFixed(2).replace(".", ",")} %`;
}

export function getBestRates() {
  const mainDurations = new Set([10, 15, 20, 25]);
  const rows = rateRows.filter(
    (row) => row.rate !== null && row.status !== "pending" && mainDurations.has(row.durationYears),
  );
  const bestByDuration = new Map<number, RateRow>();

  for (const row of rows) {
    const current = bestByDuration.get(row.durationYears);

    if (!current || (row.rate ?? Number.POSITIVE_INFINITY) < (current.rate ?? Number.POSITIVE_INFINITY)) {
      bestByDuration.set(row.durationYears, row);
    }
  }

  return Array.from(bestByDuration.values()).sort((a, b) => a.durationYears - b.durationYears);
}
