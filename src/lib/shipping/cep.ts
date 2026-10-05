/** CEP: só dígitos, 8 posições. Máscara visual 00000-000. */
export function cepDigits(raw: unknown): string {
  return (typeof raw === "string" ? raw : "").replace(/\D/g, "").slice(0, 8);
}

export function maskCep(raw: string): string {
  const d = cepDigits(raw);
  return d.length > 5 ? `${d.slice(0, 5)}-${d.slice(5)}` : d;
}

/** Formato válido (8 dígitos, sem sequências impossíveis como 00000000). */
export function isValidCep(raw: unknown): boolean {
  const d = cepDigits(raw);
  return d.length === 8 && !/^(\d)\1{7}$/.test(d);
}
