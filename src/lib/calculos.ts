// Cálculos puros de las estadísticas (sin base de datos, para poder probarlos).

const HORA = /^([01]\d|2[0-3]):([0-5]\d)$/;

export function horaValida(texto: string): boolean {
  return HORA.test(texto);
}

/** Minutos entre dos horas "HH:mm" del mismo día; null si falta alguna o el regreso no es posterior. */
export function minutosEntre(bajada?: string | null, regreso?: string | null): number | null {
  if (!bajada || !regreso || !HORA.test(bajada) || !HORA.test(regreso)) return null;
  const [hb, mb] = bajada.split(":").map(Number);
  const [hr, mr] = regreso.split(":").map(Number);
  const minutos = hr * 60 + mr - (hb * 60 + mb);
  return minutos > 0 ? minutos : null;
}

/** 150 -> "2 h 30 min"; 45 -> "45 min"; 120 -> "2 h". */
export function formatoDuracion(minutos: number): string {
  const h = Math.floor(minutos / 60);
  const m = Math.round(minutos % 60);
  if (h === 0) return `${m} min`;
  return m === 0 ? `${h} h` : `${h} h ${m} min`;
}

/** Porcentaje entero (0-100) o null si no hay base. */
export function porcentaje(parte: number, total: number): number | null {
  return total > 0 ? Math.round((parte / total) * 100) : null;
}

export function promedio(numeros: number[]): number | null {
  return numeros.length ? numeros.reduce((a, b) => a + b, 0) / numeros.length : null;
}

/** Un decimal sin ceros de más: 7 -> "7", 7.25 -> "7,3" (formato argentino). */
export function formatoNota(valor: number | null): string {
  if (valor === null) return "—";
  const r = Math.round(valor * 10) / 10;
  return String(r).replace(".", ",");
}

/**
 * Cuántos entrenamientos SEGUIDOS lleva ausente un alumno, empezando por el
 * más reciente. `presencias` va ordenado del más reciente al más antiguo.
 */
export function rachaAusencias(presencias: boolean[]): number {
  let racha = 0;
  for (const presente of presencias) {
    if (presente) break;
    racha++;
  }
  return racha;
}

/** Calcula el ancho relativo (0-100) de cada barra contra el máximo. */
export function barras<T extends { valor: number }>(items: T[]): (T & { ancho: number })[] {
  const max = Math.max(0, ...items.map((i) => i.valor));
  return items.map((i) => ({ ...i, ancho: max > 0 ? Math.round((i.valor / max) * 100) : 0 }));
}

/** Días entre dos "YYYY-MM-DD" (b - a). */
export function diasEntre(a: string, b: string): number {
  return Math.round((Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`)) / 86_400_000);
}

/** Direcciones de viento (de dónde sopla), en el orden de la rosa. */
export const DIRECCIONES_VIENTO = ["N", "NE", "E", "SE", "S", "SO", "O", "NO"] as const;

export function direccionVientoValida(texto: string): boolean {
  return (DIRECCIONES_VIENTO as readonly string[]).includes(texto);
}

/** "SE 12 kn", "SE", "12 kn" o null si no hay nada. */
export function textoViento(dir?: string | null, nudos?: number | null): string | null {
  const partes = [dir || null, nudos != null ? `${nudos} kn` : null].filter(Boolean);
  return partes.length ? partes.join(" ") : null;
}

/** Diferencia entre el último valor y el anterior (null si hay menos de dos). */
export function tendencia(valores: number[]): number | null {
  if (valores.length < 2) return null;
  return valores[valores.length - 1] - valores[valores.length - 2];
}

/** "+0,8", "−0,5" o "=" (con un decimal, formato argentino). */
export function formatoTendencia(delta: number | null): string | null {
  if (delta === null) return null;
  const r = Math.round(delta * 10) / 10;
  if (r === 0) return "=";
  return `${r > 0 ? "+" : "−"}${String(Math.abs(r)).replace(".", ",")}`;
}
