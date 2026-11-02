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

/** Nombre completo de cada dirección (la que se guarda es la sigla). */
export const NOMBRE_DIRECCION: Record<string, string> = {
  N: "Norte", NE: "Noreste", E: "Este", SE: "Sudeste", S: "Sur", SO: "Sudoeste", O: "Oeste", NO: "Noroeste",
};
export const nombreDireccion = (dir: string) => NOMBRE_DIRECCION[dir] ?? dir;

/** Intensidad del viento, en palabras (lo que se guarda es el valor). */
export const FUERZAS_VIENTO = [
  { valor: "BAJOS", texto: "Bajos" },
  { valor: "MEDIOS", texto: "Medios" },
  { valor: "FUERTES", texto: "Fuertes" },
  { valor: "MEDIOS_FUERTES", texto: "Medios/fuertes" },
  { valor: "FUERTES_MEDIOS", texto: "Fuertes/medios" },
] as const;
/** Si el viento se mantuvo o fue cambiando. */
export const ESTABILIDADES_VIENTO = [
  { valor: "CONSTANTE", texto: "Constante" },
  { valor: "OSCILANTE", texto: "Oscilante" },
] as const;

export const fuerzaVientoValida = (v: string) => FUERZAS_VIENTO.some((f) => f.valor === v);
export const estabilidadVientoValida = (v: string) => ESTABILIDADES_VIENTO.some((e) => e.valor === v);
export const textoFuerza = (v: string) => FUERZAS_VIENTO.find((f) => f.valor === v)?.texto ?? v;
export const textoEstabilidad = (v: string) => ESTABILIDADES_VIENTO.find((e) => e.valor === v)?.texto ?? v;

/** "Sudeste · medios · oscilante", con lo que haya cargado, o null si no hay nada. */
export function textoViento(dir?: string | null, fuerza?: string | null, estabilidad?: string | null): string | null {
  const partes = [
    dir ? nombreDireccion(dir) : null,
    fuerza ? textoFuerza(fuerza).toLowerCase() : null,
    estabilidad ? textoEstabilidad(estabilidad).toLowerCase() : null,
  ].filter(Boolean);
  return partes.length ? partes.join(" · ") : null;
}

/** El valor que más se repite (el primero en aparecer si hay empate); ignora los vacíos. */
export function masFrecuente(valores: (string | null | undefined)[]): string | null {
  const cuenta = new Map<string, number>();
  for (const v of valores) if (v) cuenta.set(v, (cuenta.get(v) ?? 0) + 1);
  let mejor: string | null = null;
  let max = 0;
  for (const [v, n] of cuenta) if (n > max) [mejor, max] = [v, n];
  return mejor;
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

/** "N 0,8 kn", "N", "0,8 kn" o null si no hay nada (la corriente va con un decimal). */
export function textoCorriente(dir?: string | null, nudos?: number | null): string | null {
  const partes = [dir || null, nudos != null ? `${String(nudos).replace(".", ",")} kn` : null].filter(Boolean);
  return partes.length ? partes.join(" ") : null;
}
