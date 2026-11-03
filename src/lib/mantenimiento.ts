import { diasEntre } from "./calculos";

export type ItemMantenimiento = {
  estado: string; // "PENDIENTE" | "ARREGLADO"
  urgente: boolean;
  fecha: string; // "YYYY-MM-DD": día en que se vio el problema
  resueltoEn: string | null; // día en que se arregló
};

export type ResumenMantenimiento = {
  pendientes: number;
  urgentes: number; // pendientes marcados como urgentes
  arreglados: number;
  /** días que tardaron en arreglarse, en promedio (solo los arreglados) */
  diasMedios: number | null;
  /** el pendiente más viejo, en días */
  pendienteMasViejo: number | null;
};

/** Cuántos días pasaron desde que se vio el problema hasta hoy. */
export const diasPendiente = (fecha: string, hoy: string) => Math.max(0, diasEntre(fecha, hoy));

/** Cuántos días tardó en arreglarse. */
export const diasQueTardo = (fecha: string, resueltoEn: string) => Math.max(0, diasEntre(fecha, resueltoEn));

/** "hoy", "hace 1 día", "hace 12 días". */
export function haceDias(dias: number): string {
  if (dias <= 0) return "hoy";
  return dias === 1 ? "hace 1 día" : `hace ${dias} días`;
}

/** "el mismo día", "en 1 día", "en 5 días". */
export function tardoTexto(dias: number): string {
  if (dias <= 0) return "el mismo día";
  return dias === 1 ? "en 1 día" : `en ${dias} días`;
}

export function resumenMantenimiento(items: ItemMantenimiento[], hoy: string): ResumenMantenimiento {
  const pendientes = items.filter((i) => i.estado !== "ARREGLADO");
  const arreglados = items.filter((i) => i.estado === "ARREGLADO");
  const tiempos = arreglados.filter((i) => i.resueltoEn).map((i) => diasQueTardo(i.fecha, i.resueltoEn!));
  return {
    pendientes: pendientes.length,
    urgentes: pendientes.filter((i) => i.urgente).length,
    arreglados: arreglados.length,
    diasMedios: tiempos.length ? tiempos.reduce((a, b) => a + b, 0) / tiempos.length : null,
    pendienteMasViejo: pendientes.length ? Math.max(...pendientes.map((i) => diasPendiente(i.fecha, hoy))) : null,
  };
}

/** "$ 12.500": pesos argentinos, sin decimales. */
export const formatoPesos = (n: number) => `$ ${new Intl.NumberFormat("es-AR", { maximumFractionDigits: 0 }).format(n)}`;

/** Total gastado en arreglos (los que no tienen costo cargado no suman). */
export const gastoTotal = (items: { costo: number | null }[]) => items.reduce((suma, i) => suma + (i.costo ?? 0), 0);
