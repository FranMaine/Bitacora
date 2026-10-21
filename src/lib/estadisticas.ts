import { minutosEntre, porcentaje } from "./calculos";

export type EntrenamientoResumen = {
  fecha: string; // "YYYY-MM-DD"
  categoriaId: string;
  horaBajada: string | null;
  horaRegreso: string | null;
  presentes: number;
  total: number; // alumnos listados en la asistencia
  temasHechos: string[]; // ids de tema
};

export type ResumenCategoria = { cantidad: number; minutos: number; presentes: number; total: number };

export type Resumen = {
  cantidad: number;
  minutos: number;
  asistenciaPct: number | null;
  porCategoria: Map<string, ResumenCategoria>;
  /** veces que se entrenó cada tema y la última fecha en que se hizo */
  temas: Map<string, { veces: number; ultima: string }>;
};

/** Junta los entrenamientos realizados en totales de horas, asistencia y temas. */
export function resumir(entrenamientos: EntrenamientoResumen[]): Resumen {
  const porCategoria = new Map<string, ResumenCategoria>();
  const temas = new Map<string, { veces: number; ultima: string }>();
  let minutos = 0;
  let presentes = 0;
  let total = 0;

  for (const e of entrenamientos) {
    const m = minutosEntre(e.horaBajada, e.horaRegreso) ?? 0;
    minutos += m;
    presentes += e.presentes;
    total += e.total;

    const c = porCategoria.get(e.categoriaId) ?? { cantidad: 0, minutos: 0, presentes: 0, total: 0 };
    c.cantidad += 1;
    c.minutos += m;
    c.presentes += e.presentes;
    c.total += e.total;
    porCategoria.set(e.categoriaId, c);

    for (const t of new Set(e.temasHechos)) {
      const previo = temas.get(t);
      temas.set(t, { veces: (previo?.veces ?? 0) + 1, ultima: previo && previo.ultima > e.fecha ? previo.ultima : e.fecha });
    }
  }

  return { cantidad: entrenamientos.length, minutos, asistenciaPct: porcentaje(presentes, total), porCategoria, temas };
}
