const bankLogos: Record<string, string> = {
  BCP: "/banks/bcp_circle.png",
  "Banque Populaire Rives de Paris": "/banks/banque_populaire_circle_white_logo.png",
  "Banque Populaire Val de France": "/banks/banque_populaire_circle_white_logo.png",
  "Banque Populaire Bourgogne Franche-Comté": "/banks/banque_populaire_circle_white_logo.png",
  "BNP Paribas": "/banks/bnp_paribas_square.png",
  "BRED Métropole": "/banks/bred_square.png",
  "Caisse d'Épargne IDF": "/banks/caisse_d_epargne_square.png",
  CCF: "/banks/hsbc_square.png",
  "Crédit Agricole Brie Picardie": "/banks/credit_agricole_square.png",
  "Crédit Agricole IDF": "/banks/credit_agricole_square.png",
  "Crédit Agricole Sud Rhône Alpes": "/banks/credit_agricole_square.png",
  Fortuneo: "/banks/fortuneo_square.png",
  "Hello bank!": "/banks/hello_bank_circle_v2.png",
  "La Banque Postale": "/banks/la_banque_postale_square.png",
  LCL: "/banks/lcl_circle_prismic_v2.png",
  Palatine: "/banks/palatine_square.png",
  "Société Générale": "/banks/societe_generale_square.png",
  "Société Générale IDF": "/banks/societe_generale_square.png",
  "Société Générale Province": "/banks/societe_generale_square.png",
};

export function getBankLogo(bank: string) {
  return bankLogos[bank] || null;
}

export function getBankInitials(bank: string) {
  return bank
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}
