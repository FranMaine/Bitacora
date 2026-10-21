// Todo el club está en Argentina (UTC-3, sin horario de verano): "hoy" y el mes
// actual se calculan con esa zona, no con la del servidor (que en Vercel es UTC).
const ZONA = "America/Argentina/Buenos_Aires";

/** Hoy como "YYYY-MM-DD" en hora argentina. */
export function hoyAR(ahora: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: ZONA }).format(ahora);
}

/** "YYYY-MM-DD" válido -> Date a medianoche UTC (como las columnas `@db.Date`); null si es inválido. */
export function aFechaDB(texto: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(texto)) return null;
  const d = new Date(`${texto}T00:00:00.000Z`);
  return Number.isNaN(d.getTime()) || d.toISOString().slice(0, 10) !== texto ? null : d;
}

/** Date de una columna `@db.Date` -> "YYYY-MM-DD". */
export function deFechaDB(fecha: Date): string {
  return fecha.toISOString().slice(0, 10);
}

/** "2026-10-24" -> "sábado, 24 de octubre". */
export function fechaLarga(texto: string): string {
  const d = aFechaDB(texto);
  if (!d) return texto;
  return new Intl.DateTimeFormat("es-AR", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" }).format(d);
}

/** "2026-10-24" -> "24/10". */
export function fechaCorta(texto: string): string {
  const [, m, d] = texto.split("-");
  return `${d}/${m}`;
}

/** Suma (o resta) días a un "YYYY-MM-DD". */
export function sumarDias(texto: string, dias: number): string {
  const d = aFechaDB(texto);
  if (!d) return texto;
  d.setUTCDate(d.getUTCDate() + dias);
  return d.toISOString().slice(0, 10);
}

/** Período "YYYY-MM" de un "YYYY-MM-DD". */
export function periodoDe(texto: string): string {
  return texto.slice(0, 7);
}

export function periodoActual(ahora: Date = new Date()): string {
  return periodoDe(hoyAR(ahora));
}

export function periodoValido(texto: string): boolean {
  return /^\d{4}-(0[1-9]|1[0-2])$/.test(texto);
}

/** "2026-01" -> "2025-12". */
export function periodoAnterior(periodo: string): string {
  const [a, m] = periodo.split("-").map(Number);
  return m === 1 ? `${a - 1}-12` : `${a}-${String(m - 1).padStart(2, "0")}`;
}

/** "2026-10" -> "octubre 2026". */
export function nombrePeriodo(periodo: string): string {
  const d = new Date(`${periodo}-01T00:00:00.000Z`);
  const mes = new Intl.DateTimeFormat("es-AR", { month: "long", timeZone: "UTC" }).format(d);
  return `${mes} ${periodo.slice(0, 4)}`;
}

/** "2026-10" -> "oct 26" (para ejes de gráficos). */
export function periodoCorto(periodo: string): string {
  const d = new Date(`${periodo}-01T00:00:00.000Z`);
  const mes = new Intl.DateTimeFormat("es-AR", { month: "short", timeZone: "UTC" }).format(d).replace(".", "");
  return `${mes} ${periodo.slice(2, 4)}`;
}

/** "2026-12" -> "2027-01". */
export function periodoSiguiente(periodo: string): string {
  const [a, m] = periodo.split("-").map(Number);
  return m === 12 ? `${a + 1}-01` : `${a}-${String(m + 1).padStart(2, "0")}`;
}
