export function normalizeFrenchPhone(input: string) {
  const compact = input.replace(/[^\d+]/g, "");

  if (compact.startsWith("+33") && compact.length === 12) {
    return compact;
  }

  if (compact.startsWith("0033") && compact.length === 13) {
    return `+33${compact.slice(4)}`;
  }

  if (compact.startsWith("0") && compact.length === 10) {
    return `+33${compact.slice(1)}`;
  }

  return null;
}

export function maskPhone(phone: string) {
  return phone.replace(/(\+33)(\d)(\d{2})(\d{2})(\d{2})(\d{2})/, "$1 $2 ** ** ** $6");
}
