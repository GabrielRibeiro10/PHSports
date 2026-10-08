// Exportação e leitura de planilhas CSV pensadas para o Excel em português (separador ";", UTF-8 com BOM, vírgula decimal).

export type CsvValue = string | number | boolean | null | undefined;
export type CsvColumn<T> = { header: string; value: (row: T) => CsvValue };

/** Células que começam com = + - @ viram fórmula no Excel; o apóstrofo impede (proteção contra injeção de fórmula). */
const FORMULA_START = /^[=+\-@\t\r]/;

export function csvCell(v: CsvValue): string {
  let s: string;
  if (v === null || v === undefined) s = "";
  else if (typeof v === "number") s = Number.isFinite(v) ? String(v).replace(".", ",") : "";
  else if (typeof v === "boolean") s = v ? "sim" : "não";
  else {
    s = v;
    if (FORMULA_START.test(s)) s = `'${s}`;
  }
  return /[";\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function toCsv<T>(rows: T[], columns: CsvColumn<T>[]): string {
  const head = columns.map((c) => csvCell(c.header)).join(";");
  const body = rows.map((r) => columns.map((c) => csvCell(c.value(r))).join(";"));
  return `﻿${[head, ...body].join("\r\n")}\r\n`;
}

export function downloadFile(filename: string, content: string, mime = "text/csv;charset=utf-8") {
  const url = URL.createObjectURL(new Blob([content], { type: mime }));
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export const downloadCsv = (filename: string, content: string) => downloadFile(filename, content);

/** Nome de arquivo com a data de hoje: pedidos-2026-10-08.csv */
export const datedName = (base: string, ext = "csv") => `${base}-${new Date().toISOString().slice(0, 10)}.${ext}`;

/** Lê CSV com aspas, ";" ou "," como separador (detecta pela primeira linha) e remove o BOM. */
export function parseCsv(text: string): string[][] {
  const src = text.replace(/^﻿/, "");
  const firstLine = src.split(/\r?\n/, 1)[0] ?? "";
  const sep = (firstLine.match(/;/g)?.length ?? 0) >= (firstLine.match(/,/g)?.length ?? 0) ? ";" : ",";
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;
  for (let i = 0; i < src.length; i++) {
    const ch = src[i];
    if (quoted) {
      if (ch === '"') {
        if (src[i + 1] === '"') { cell += '"'; i++; } else quoted = false;
      } else cell += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === sep) { row.push(cell); cell = ""; }
    else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && src[i + 1] === "\n") i++;
      row.push(cell); cell = "";
      if (row.some((c) => c.trim() !== "")) rows.push(row);
      row = [];
    } else cell += ch;
  }
  row.push(cell);
  if (row.some((c) => c.trim() !== "")) rows.push(row);
  return rows;
}

/** "1.234,56" ou "1234.56" → 1234.56 (null se não for número). */
export function parseNumberBR(s: string): number | null {
  const t = s.trim().replace(/^R\$\s*/i, "");
  if (!t) return null;
  const normalized = /,\d{1,2}$/.test(t) ? t.replace(/\./g, "").replace(",", ".") : t.replace(/,/g, "");
  const n = Number(normalized);
  return Number.isFinite(n) ? n : null;
}
